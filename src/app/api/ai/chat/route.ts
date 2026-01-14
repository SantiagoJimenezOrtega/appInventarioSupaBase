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
            const pId = String(m.product_id || '').trim();
            const bId = String(m.branch_id || '').trim();
            if (!pId || !bId) return;

            const key = `${pId}-${bId}`;
            const qty = Number(m.quantity) || 0;
            const current = stockMap.get(key) || 0;

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
            const pId = String(p.id).trim();
            const branchStocks = branches?.map(b => ({
                branch: b.name,
                stock: stockMap.get(`${pId}-${String(b.id).trim()}`) || 0
            })).filter(bs => bs.stock !== 0);

            return {
                name: p.name,
                description: p.description,
                prices: { purchase: p.purchase_price, selling: p.price },
                availability: branchStocks && branchStocks.length > 0 ? branchStocks : "Sin existencias"
            };
        });

        // Explicitly extract negatives for the prompt
        const negativeStockAlerts = summarizedStock?.filter(p =>
            Array.isArray(p.availability) && p.availability.some(a => a.stock < 0)
        ).map(p => ({
            producto: p.name,
            faltantes: (p.availability as any[]).filter(a => a.stock < 0)
        }));

        const systemPrompt = `
            Eres el "Asistente Inteligente de Agroinv Gravity". 
            Tu misión es responder dudas del usuario sobre su inventario, sedes, proveedores y movimientos usando datos REALES.
            
            ⚠️ ALERTAS DE STOCK NEGATIVO (Préstamos o faltantes urgentes):
            ${negativeStockAlerts && negativeStockAlerts.length > 0
                ? JSON.stringify(negativeStockAlerts, null, 2)
                : "No hay productos con stock negativo actualmente."}

            RESUMEN GENERAL:
            - Sedes Registradas: ${branches?.length}
            - Proveedores: ${providers?.length}
            - Total Productos: ${products?.length}

            DETALLE DE INVENTARIO:
            ${JSON.stringify(summarizedStock, null, 2)}

            ÚLTIMOS 30 MOVIMIENTOS:
            ${JSON.stringify(recentMovements?.map(m => ({
                    fecha: m.date,
                    producto: m.product_name,
                    sede: m.branch_name,
                    tipo: m.type,
                    cantidad: m.quantity,
                    comentario: m.comment
                })), null, 2)}

            REGLAS CRÍTICAS:
            1. Si el usuario pregunta por qué algo está en negativo, explícale que el stock es de ${negativeStockAlerts?.find(n => n.producto.includes("Abonex"))?.faltantes[0]?.stock || "N/A"} y que debe ajustarse.
            2. NUNCA digas que no hay productos negativos si el bloque de "ALERTAS DE STOCK NEGATIVO" tiene datos.
            3. Responde siempre en español. No uses markdown complejo.
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
