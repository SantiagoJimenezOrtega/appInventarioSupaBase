import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { supabase } from '@/lib/supabase/client';

const apiKey = (process.env.GOOGLE_AI_API_KEY || "").replace(/['"]/g, "").trim();
const genAI = new GoogleGenerativeAI(apiKey);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

export async function POST(request: Request) {
    try {
        const { message, history } = await request.json();

        // 1. Fetch current inventory context to give the AI factual data
        const { data: products } = await supabase.from('products').select('*');
        const { data: movements } = await supabase.from('stock_movements').select('*').limit(50);

        // Simple aggregate for stock levels (this is a simplification, 
        // in a real app we'd use the actual calculated levels)
        const inventoryContext = products?.map(p => ({
            name: p.name,
            purchasePrice: p.purchase_price,
            sellingPrice: p.price
        }));

        const systemPrompt = `
            Eres el "Asistente Inteligente de Agroinv Gravity". 
            Tu misión es responder dudas del usuario sobre su inventario usando datos reales.
            
            Contexto de Inventario Actual:
            ${JSON.stringify({ inventoryContext, recentMovements: movements }, null, 2)}

            Reglas de respuesta:
            1. Sé amable, profesional y breve.
            2. Si no sabes un dato específico basado en el contexto, dilo humildemente.
            3. Responde siempre en español.
            4. No uses markdown complejo, solo texto plano o negritas sencillas.
        `;

        const chat = model.startChat({
            history: [
                { role: "user", parts: [{ text: systemPrompt }] },
                { role: "model", parts: [{ text: "Entendido. Soy el asistente de Agroinv Gravity y estoy listo para ayudar con los datos proporcionados." }] },
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
