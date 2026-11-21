import { readFile } from 'node:fs/promises';
import { authorizeApi } from '@/lib/auth';

export async function GET() {
  const auth = await authorizeApi(undefined, 'informacion');
  if (auth.response) return auth.response;

  const model = await readFile('assets/planos/modelo-plano-ubicacion-referencial.pdf');
  return new Response(new Uint8Array(model), {
    headers: {
      'Cache-Control': 'private, no-store',
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename="modelo-plano-ubicacion-referencial.pdf"',
    },
  });
}
