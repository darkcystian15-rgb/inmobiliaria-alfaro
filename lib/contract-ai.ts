import 'server-only';
import { generateText } from 'ai';

// Model verified against the live Gateway catalog on 2026-11-07. Vercel OIDC
// authenticates deployed requests; an optional Gateway key supports local use.
export const contractModel = () => process.env.CONTRACT_AI_MODEL || 'openai/gpt-5.4-mini';
export async function generateContractText(system: string, prompt: string, maxOutputTokens = 6000) {
  const result = await generateText({ model: contractModel(), system, prompt, maxOutputTokens, maxRetries: 0, abortSignal: AbortSignal.timeout(150000) });
  if (result.finishReason !== 'stop' || !result.text.trim()) throw Error('La IA no terminó el documento. Tus datos se conservan; vuelve a intentarlo.');
  if (result.text.length > 18000) throw Error('El borrador supera el límite. Resume los acuerdos e inténtalo nuevamente.');
  return result.text.trim();
}
