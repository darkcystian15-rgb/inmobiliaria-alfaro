"use client";

import { useEffect, useRef, type ReactNode } from "react";

export default function ConfirmDialog({ title, children, confirmLabel, busy = false, onCancel, onConfirm }: {
  title: string; children: ReactNode; confirmLabel: string; busy?: boolean; onCancel: () => void; onConfirm: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    return () => element?.close();
  }, []);
  return <dialog ref={dialog} aria-label={title} onCancel={event => { event.preventDefault(); if (!busy) onCancel(); }} className="fixed inset-0 m-auto max-h-[90dvh] w-[calc(100%_-_2rem)] max-w-md overflow-y-auto rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl backdrop:bg-slate-950/40">
    <h2 className="text-lg font-bold text-slate-900">{title}</h2>
    <div className="mt-4 space-y-3 text-sm leading-6 text-slate-600">{children}</div>
    <div className="mt-6 flex justify-end gap-3">
      <button type="button" autoFocus disabled={busy} onClick={onCancel} className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold disabled:opacity-50">Cancelar</button>
      <button type="button" disabled={busy} onClick={onConfirm} className="rounded-xl bg-[#c80000] px-4 py-3 text-sm font-semibold text-white disabled:opacity-50">{busy ? 'Procesando…' : confirmLabel}</button>
    </div>
  </dialog>;
}
