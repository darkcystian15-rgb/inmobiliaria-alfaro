"use client";

import { zoneHref } from "@/lib/zone-url";
import { useZoneWorkspace } from "./ZoneWorkspace";
import NextLink from "next/link";
import { createContext, useContext, useEffect, useState, type ComponentProps, type ReactNode } from "react";
import { returnLabel, safeReturnHref, withReturnHref } from "@/lib/navigation-return";

const OriginContext = createContext<string | null>(null);
const PropertyZoneContext = createContext<string | null>(null);
export function NavigationReturnProvider({ href, zone, children }: { href: string; zone?: string | null; children: ReactNode }) {
  return <OriginContext.Provider value={href}><PropertyZoneContext.Provider value={zone ?? null}>{children}</PropertyZoneContext.Provider></OriginContext.Provider>;
}
export function useReturnHref(fallback = "/cartera") {
  const [href, setHref] = useState(fallback);
  useEffect(() => {
    const timer = window.setTimeout(() => setHref(safeReturnHref(new URLSearchParams(window.location.search).get("volver")) || fallback), 0);
    return () => window.clearTimeout(timer);
  }, [fallback]);
  return href;
}
export function ContextLink({ href, ...props }: ComponentProps<typeof NextLink>) {
  const origin = useContext(OriginContext);
  const propertyZone = useContext(PropertyZoneContext);
  const {zone} = useZoneWorkspace();
  const inherited = useReturnHref("");
  return <NextLink {...props} href={typeof href === "string" ? withReturnHref(zoneHref(href,propertyZone || zone?.nombre), origin || inherited) : href} />;
}
export function ReturnLink({ className = "aa-button aa-button-secondary", fallback = "/cartera" }: { className?: string; fallback?: string }) {
  const href = useReturnHref(fallback);
  return <NextLink href={href} className={`max-w-full whitespace-normal break-words ${className}`}>← {returnLabel(href)}</NextLink>;
}
