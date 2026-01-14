import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { supabase } from '@/lib/supabase/client';

const apiKey = (process.env.GOOGLE_AI_API_KEY || "").replace(/['"]/g, "").trim();
const genAI = new GoogleGenerativeAI(apiKey);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

export async function POST(request: Request) {
    try {
        const { message, history } = await request.json();

        // 1. Fetch data from Supabase
        const { data: products } = await supabase.from('products').select('id, name, purchase_price, price, description');
        const { data: branches } = await supabase.from('branches').select('id, name, location');
        const { data: providers } = await supabase.from('providers').select('id, name, contact_person');
        const { data: allMovements } = await supabase.from('stock_movements').select('*').order('date', { ascending: true });
        const { data: recentMovements } = await supabase.from('stock_movements').select('*').order('date', { ascending: false }).limit(30);

        // 2. Calculate stock per product and branch
        const stockMap = new Map();

        allMovements?.forEach(m => {
            const key = `${m.product_id}-${m.branch_id}`;
            const qty = Number(m.quantity) || 0;
            const current = stockMap.get(key) || 0;

            // Check direction Based on type and sign as in the inventory page logic
            const isAddition = m.type === 'inflow' || ((m.type === 'transfer' || m.type === 'conversion' || m.type === 'adjustment') && qty > 0);
            const isSubtraction = m.type === 'outflow' || ((m.type === 'transfer' || m.type === 'conversion' || m.type === 'adjustment') && qty < 0);

            if (isAddition) {
                stockMap.set(key, current + Math.abs(qty));
            } else if (isSubtraction) {
                stockMap.set(key, current - Math.abs(qty));
            }
        });

        // 3. Format context for AI
        const summarizedStock = products?.map(p => {
            const branchStocks = branches?.map(b => ({
                branch: b.name,
                stock: stockMap.get(`${p.id}-${b.id}`) || 0
            })).filter(bs => bs.stock !== 0);

            return {
                name: p.name,
                description: p.description,
                prices: { purchase: p.purchase_price, selling: p.price },
                availability: branchStocks && branchStocks.length > 0 ? branchStocks : "Sin existencias en ninguna sede"
            };
        });

        const systemPrompt = `
            Eres el "Asistente Inteligente de Agroinv Gravity". 
            Tu misión es responder dudas del usuario sobre su inventario, sedes, proveedores y movimientos usando datos reales.
            
            RESUMEN DEL SISTEMA:
            - Sedes Registradas: ${branches?.length} (${branches?.map(b => b.name).join(', ')})
            - Proveedores: ${providers?.length} (${providers?.map(p => p.name).join(', ')})
            - Total Productos: ${products?.length}

            DATOS DE INVENTARIO (Existencias por sucursal):
            ${JSON.stringify(summarizedStock, null, 2)}

            ÚLTIMOS 30 MOVIMIENTOS (Historial reciente):
            ${JSON.stringify(recentMovements?.map(m => ({
            fecha: m.date,
            producto: m.product_name,
            sede: m.branch_name,
            tipo: m.type,
            cantidad: m.quantity,
            comentario: m.comment
        })), null, 2)}

            REGLAS IMPORTANTES:
            1. Sé amable, profesional y conciso.
            2. Si un stock es NEGATIVO (ej. -10), indícalo claramente como un faltante o préstamo pendiente de ajuste.
            3. Si el usuario pregunta por un producto que no está en la lista de inventario, di que no existe en el sistema.
            4. Tienes acceso a los últimos movimientos para responder "¿qué fue lo último que entró?" o similares.
            5. Responde siempre en español. No uses markdown complejo.
        `;

        const chat = model.startChat({
            history: [
                { role: "user", parts: [{ text: systemPrompt }] },
                { role: "model", parts: [{ text: "Entendido. Soy el asistente de Agroinv Gravity. Tengo las existencias actuales por sucursal y estoy listo para responder tus dudas." }] },
                ...history.map((h: any) => ({
                    role: h.role === "user" ? "user" : "model",
                    parts: [{ text: h.content }]
                }))
            ]
        });

        const result = await chat.sendMessage(message);
        const reply = result.response.text();

        return NextResponse.json({ reply });
    } catch (error: any) {
        console.error('AI Chat Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
