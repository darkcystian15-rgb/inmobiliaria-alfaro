"use client";

import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { LoadingCards } from '@/app/components/InterfaceFeedback';

// Keep saved links, including the former section anchors and property/zone context.
export default function Page() {
  return <Suspense fallback={<LoadingCards label="Abriendo seguimiento…" />}><LegacyInbox /></Suspense>;
}
function LegacyInbox() {
  const router = useRouter(), params = useSearchParams();
  useEffect(() => {
    const hash = window.location.hash;
    const path = hash === '#difusion' || hash === '#publicados' ? '/registrar-publicaciones'
      : hash === '#material' || params.has('inmueble') ? '/registrar-textos' : '/tasaciones-pendientes';
    router.replace(`${path}${params.toString() ? `?${params}` : ''}`);
  }, [router, params]);
  return <LoadingCards label="Abriendo el nuevo seguimiento…" />;
}
