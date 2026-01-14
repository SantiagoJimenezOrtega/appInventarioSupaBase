import { z } from 'genkit';
import { ai } from '../genkit';

const SuggestionSchema = z.object({
    fromBranchId: z.string(),
    toBranchId: z.string(),
    product: z.string(),
    quantity: z.number(),
    reason: z.string()
});

const InputSchema = z.object({
    branches: z.array(z.object({
        branchId: z.string(),
        branchName: z.string(),
        stockLevels: z.string(),
        recentSales: z.string()
    })),
    products: z.array(z.object({
        productId: z.string(),
        productName: z.string()
    }))
});

type InputType = z.infer<typeof InputSchema>;

export const stockBalancingSuggestionsFlow = ai.defineFlow(
    {
        name: 'stockBalancingSuggestions',
        inputSchema: InputSchema,
        outputSchema: z.array(SuggestionSchema)
    },
    async (input: InputType) => {
        const prompt = `
Eres un experto en gestión de inventarios para agronegocios.

Analiza los niveles de stock y ventas de las sucursales:

${input.branches.map(b => `
- ${b.branchName}
  Stock: ${b.stockLevels}
  Ventas recientes: ${b.recentSales}
`).join('\n')}

Productos: ${input.products.map(p => p.productName).join(', ')}

Sugiere traslados de stock entre sucursales para optimizar disponibilidad.

Responde ÚNICAMENTE con JSON válido:
[
  {
    "fromBranchId": "id",
    "toBranchId": "id",
    "product": "nombre",
    "quantity": numero,
    "reason": "Explicación en español"
  }
]

Si no hay sugerencias: []
`;

        const response = await ai.generate({
            model: 'googleai/gemini-1.5-flash',
            prompt,
            config: { temperature: 0.7 }
        });

        const text = response.text.trim()
            .replace(/```json\n?/g, '')
            .replace(/```\n?/g, '');

        try {
            return z.array(SuggestionSchema).parse(JSON.parse(text));
        } catch {
            return [];
        }
    }
);
