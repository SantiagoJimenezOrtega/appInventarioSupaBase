import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

const apiKey = process.env.GOOGLE_AI_API_KEY || 'no-key-provided';

export const ai = genkit({
    plugins: [googleAI({ apiKey })],
});
