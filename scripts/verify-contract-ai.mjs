// Synthetic connectivity check: no property data, database writes or credentials in output.
import { generateText } from 'ai';
// Opt-in only. Ordinary builds never make a paid provider request.
if (process.env.CONTRACT_AI_VERIFY !== '1') process.exit(0);
const model = process.env.CONTRACT_AI_MODEL || 'openai/gpt-5.4-mini';
try {
  const result = await generateText({ model, prompt: 'Responde únicamente con el texto CONEXION_IA_OK.', maxOutputTokens: 1000, maxRetries: 0, abortSignal: AbortSignal.timeout(90000) });
  if (!result.text.includes('CONEXION_IA_OK') || result.finishReason !== 'stop') throw Error('Respuesta de verificación incompleta');
  console.log(JSON.stringify({ check: 'contract-ai', ok: true, model, output: 'CONEXION_IA_OK', inputTokens: result.usage.inputTokens, outputTokens: result.usage.outputTokens }));
} catch (error) {
  // Do not dump provider error objects: these can include request/response data.
  const detail = String(error?.message || '').replace(/Bearer\s+\S+|(?:sk-|vck_)[A-Za-z0-9_-]+|eyJ[A-Za-z0-9_.-]+/g, '[redactado]').slice(0, 800);
  console.error(JSON.stringify({ check: 'contract-ai', ok: false, errorType: error?.name || 'Error', statusCode: Number.isInteger(error?.statusCode) ? error.statusCode : null, detail, message: 'No se pudo verificar la conexión. Revisa autenticación OIDC, habilitación y créditos de AI Gateway.' }));
  process.exitCode = 1;
}
