"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

type Entry = { workspace: string; index: number };
const marker = 'propertyWorkspace';

// Keep native Back/Forward inside the same hierarchy, including direct folder links.
export default function usePropertyWorkspaceHistory({ dirty, busy, onRestore }: {
  dirty: boolean; busy: boolean; onRestore: (url: URL) => void;
}) {
  const current = useRef<Entry | null>(null);
  const latest = useRef({ dirty, busy, onRestore });
  const restoring = useRef(false);
  const permitted = useRef(false);
  const pending = useRef<(() => void) | null>(null);
  const [confirmLeave, setConfirmLeave] = useState(false);
  useLayoutEffect(() => { latest.current = { dirty, busy, onRestore }; }, [dirty, busy, onRestore]);

  useEffect(() => {
    const url = new URL(location.href);
    const existing = history.state?.[marker] as Entry | undefined;
    if (existing) current.current = existing;
    else {
      const workspace = crypto.randomUUID();
      const parents: URL[] = [];
      if (url.searchParams.get('codigo') || (url.searchParams.get('zona') && url.searchParams.get('zona') !== '*')) {
        const root = new URL(url); ['codigo', 'carpeta', 'pestana'].forEach(key => root.searchParams.delete(key)); root.searchParams.set('zona', '*'); parents.push(root);
      }
      if (url.searchParams.get('codigo')) {
        const zone = new URL(url); ['codigo', 'carpeta', 'pestana'].forEach(key => zone.searchParams.delete(key));
        if (zone.searchParams.get('zona') && zone.searchParams.get('zona') !== '*') parents.push(zone);
        if (url.searchParams.get('carpeta') || url.searchParams.get('pestana')) {
          const property = new URL(url); ['carpeta', 'pestana'].forEach(key => property.searchParams.delete(key)); parents.push(property);
        }
      }
      const entries = [...parents, url];
      entries.forEach((entry, index) => {
        const state = { ...history.state, [marker]: { workspace, index } };
        if (index === 0) history.replaceState(state, '', entry); else history.pushState(state, '', entry);
      });
      current.current = { workspace, index: entries.length - 1 };
    }
    const pop = (event: PopStateEvent) => {
      if (restoring.current) { restoring.current = false; event.stopImmediatePropagation(); return; }
      const target = event.state?.[marker] as Entry | undefined;
      const from = current.current;
      const delta = target && from && target.workspace === from.workspace ? target.index - from.index : null;
      if (!permitted.current && (latest.current.dirty || latest.current.busy) && delta !== null && delta !== 0) {
        event.stopImmediatePropagation(); restoring.current = true; history.go(-delta);
        if (!latest.current.busy) {
          pending.current = () => { permitted.current = true; history.go(delta); };
          setConfirmLeave(true);
        }
        return;
      }
      permitted.current = false;
      if (target) current.current = target;
      if (location.pathname === '/datos-inmuebles') latest.current.onRestore(new URL(location.href));
    };
    const before = (event: BeforeUnloadEvent) => {
      if (latest.current.dirty || latest.current.busy) { event.preventDefault(); event.returnValue = ''; }
    };
    const click = (event: MouseEvent) => {
      if ((!latest.current.dirty && !latest.current.busy) || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const anchor = (event.target as Element).closest?.('a[href]') as HTMLAnchorElement | null;
      if (!anchor || anchor.target === '_blank' || anchor.hasAttribute('download')) return;
      const destination = new URL(anchor.href);
      if (destination.href === location.href) return;
      event.preventDefault(); event.stopPropagation();
      if (!latest.current.busy) { pending.current = () => { latest.current = { ...latest.current, dirty: false }; location.assign(destination.href); }; setConfirmLeave(true); }
    };
    window.addEventListener('popstate', pop, true);
    window.addEventListener('beforeunload', before);
    document.addEventListener('click', click, true);
    return () => { window.removeEventListener('popstate', pop, true); window.removeEventListener('beforeunload', before); document.removeEventListener('click', click, true); };
  }, []);

  const push = useCallback((url: URL) => {
    if (url.href === location.href || latest.current.busy || latest.current.dirty) return;
    const entry = current.current;
    if (!entry) return;
    current.current = { ...entry, index: entry.index + 1 };
    history.pushState({ ...history.state, [marker]: current.current }, '', url);
  }, []);
  const cancel = () => { pending.current = null; setConfirmLeave(false); };
  const discard = () => { const action = pending.current; pending.current = null; setConfirmLeave(false); action?.(); };
  return { push, confirmLeave, cancel, discard };
}
