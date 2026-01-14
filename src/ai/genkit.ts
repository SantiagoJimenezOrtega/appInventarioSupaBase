import { genkit } from '@genkit-ai/ai';
import { googleAI } from '@genkit-ai/googleai';

const apiKey = process.env.GOOGLE_AI_API_KEY || 'no-key-provided';

export const ai = genkit({
    plugins: [googleAI({ apiKey })],
    model: 'googleai/gemini-1.5-flash'
});
