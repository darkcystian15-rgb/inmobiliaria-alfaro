"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import ConfirmDialog from './ConfirmDialog';

export default function WorkflowNavigationGuard({ dirty, busy, message = "Guarda el texto o la publicación antes de salir para conservar los cambios de este formulario." }: { dirty: boolean; busy: boolean; message?: string }) {
  const router = useRouter(), [destination, setDestination] = useState<string | null>(null);
  useEffect(() => {
    if (!dirty && !busy) return;
    const before = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
    const click = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const anchor = (event.target as Element).closest?.('a[href]') as HTMLAnchorElement | null;
      if (!anchor || anchor.target === '_blank' || anchor.hasAttribute('download')) return;
      const next = new URL(anchor.href);
      if (next.pathname === location.pathname && next.search === location.search) return;
      event.preventDefault(); event.stopPropagation();
      if (!busy) setDestination(next.href);
    };
    window.addEventListener('beforeunload', before); document.addEventListener('click', click, true);
    return () => { window.removeEventListener('beforeunload', before); document.removeEventListener('click', click, true); };
  }, [dirty, busy]);
  return destination ? <ConfirmDialog title="Cambios sin guardar" confirmLabel="Salir sin guardar" onCancel={() => setDestination(null)} onConfirm={() => { const url = new URL(destination); setDestination(null); router.push(url.pathname + url.search + url.hash); }}>{message}</ConfirmDialog> : null;
}
