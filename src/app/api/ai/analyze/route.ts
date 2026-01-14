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
        const { data: products } = await supabase.from('products').select('*');
        const { data: branches } = await supabase.from('branches').select('*');
        const { data: movements } = await supabase.from('stock_movements')
            .select('*')
            .order('date', { ascending: false })
            .limit(100);

        // 2. Prepare context for AI
        const context = {
            summary: "Resumen de Inventario Agropecuario",
            productsCount: products?.length || 0,
            branchesCount: branches?.length || 0,
            recentMovements: movements?.map(m => ({
                action: m.type,
                product: m.product_name,
                branch: m.branch_name,
                qty: m.quantity,
                date: m.date
            })),
            inventoryOverview: products?.map(p => ({
                name: p.name,
                cost: p.purchase_price,
                price: p.price
            }))
        };

        const prompt = `
            Eres el "Copiloto Estratégico" de Agroinv Gravity, un sistema de gestión agropecuaria.
            Tu misión es analizar los datos de inventario y dar 3 consejos accionables y breves (Insights).
            
            Pilares de tu análisis:
            1. Vigilancia (Alertas de stock o anomalías).
            2. Estrategia (Optimización de capital o rotación).
            3. Eficiencia (Sugerencias de mejora).

            Datos actuales:
            ${JSON.stringify(context, null, 2)}

            Responde en formato JSON estrictamente como un array de objetos con esta estructura:
            [
                { "title": "...", "description": "...", "type": "warning|info|success" },
                ...
            ]
            Sé breve, profesional y directo. No incluyas markdown, solo el JSON.
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
