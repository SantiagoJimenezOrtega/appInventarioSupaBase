import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { supabase } from '@/lib/supabase/client';

const apiKey = (process.env.GOOGLE_AI_API_KEY || "").replace(/['"]/g, "").trim();
const genAI = new GoogleGenerativeAI(apiKey);
// Using gemini-2.5-flash as gemini-1.5 is no longer available in 2026
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

export async function POST(request: Request) {
    try {
        if (!process.env.GOOGLE_AI_API_KEY) {
            return NextResponse.json({ error: "Google AI API Key not configured" }, { status: 500 });
        }

        // 1. Fetch relevant data from Supabase
        const { data: products } = await supabase.from('products').select('id, name, purchase_price, price');
        const { data: branches } = await supabase.from('branches').select('id, name');
        const { data: providers } = await supabase.from('providers').select('id, name');
        const { data: allMovements } = await supabase.from('stock_movements').select('*').order('date', { ascending: true });

        // 2. Calculate stock per product and branch
        const stockMap = new Map();

        allMovements?.forEach(m => {
            const key = `${m.product_id}-${m.branch_id}`;
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

        // 3. Format summarized context for AI
        const summarizedStock = products?.map(p => {
            const availability = branches?.map(b => ({
                branch: b.name,
                stock: stockMap.get(`${p.id}-${b.id}`) || 0
            })).filter(a => a.stock !== 0);

            return {
                name: p.name,
                prices: { cost: p.purchase_price, selling: p.price },
                availability: availability && availability.length > 0 ? availability : "Cero existencias"
            };
        });

        const prompt = `
            Eres el "Copiloto Estratégico" de Agroinv Gravity.
            Analiza el siguiente inventario real y genera 3 consejos estratégicos breves.
            
            RESUMEN GENERAL:
            - Sedes: ${branches?.length}
            - Proveedores: ${providers?.length} (${providers?.map(pr => pr.name).join(', ')})
            - Total Variedad Productos: ${products?.length}

            DATOS REALES (Stock por Sucursal):
            ${JSON.stringify(summarizedStock, null, 2)}

            PILARES DE ANÁLISIS:
            1. Vigilancia: Alertas de stock bajo o NEGATIVO (faltantes/préstamos).
            2. Estrategia: Optimización según precios y proveedores.
            3. Eficiencia: Sugerir traslados si una sede tiene mucho y otra poco de lo mismo.

            Responde ÚNICAMENTE en JSON con esta estructura:
            [
                { "title": "...", "description": "...", "type": "warning|info|success" }
            ]
        `;

        const result = await model.generateContent(prompt);
        const response = result.response;
        let text = response.text();

        // Robust JSON extraction
        const jsonMatch = text.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
            text = jsonMatch[0];
        } else {
            text = text.replace(/```json/g, "").replace(/```/g, "").trim();
        }

        const insights = JSON.parse(text);

        return NextResponse.json(insights);
    } catch (error: any) {
        console.error('AI API Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
