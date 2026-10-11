"use client";

import { useEffect, useRef, type ReactNode } from "react";

export default function MobileFormActions({ children, hint }: { children: ReactNode; hint?: string }) {
  return <div className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-4px_20px_rgba(15,23,42,0.08)] sm:hidden">{hint && <p className="mx-auto mb-2 max-w-lg text-xs leading-5 text-slate-600">{hint}</p>}<div className="mx-auto flex max-w-lg items-center gap-3 [&>a]:min-h-11 [&>button]:min-h-11 [&>button]:flex-1">{children}</div></div>;
}

export function MobileFormFeedback({ value, children }: { value: string | null; children: ReactNode }) {
  const notice = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (value && window.matchMedia("(max-width: 639px)").matches) {
      notice.current?.scrollIntoView({ block: "center", behavior: "instant" });
    }
  }, [value]);
  return <div ref={notice} className="scroll-mt-24">{children}</div>;
}
