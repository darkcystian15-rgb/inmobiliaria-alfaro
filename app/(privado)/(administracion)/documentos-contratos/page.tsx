import { Suspense } from 'react';
import ContractWorkspace from '@/app/components/ContractWorkspace';

export default function Page() {
  return <Suspense fallback={<p className="p-8" role="status">Cargando documentos y contratos…</p>}><ContractWorkspace /></Suspense>;
}
