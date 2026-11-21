import { readFile } from 'node:fs/promises';
import { authorizeApi } from '@/lib/auth';

export async function GET() {
  const auth = await authorizeApi(undefined, 'informacion');
  if (auth.response) return auth.response;
  const template = await readFile('assets/cartas/carta-propuesta.docx');
  return new Response(new Uint8Array(template), {
    headers: {
      'Cache-Control': 'private, no-store',
      'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    },
  });
}
