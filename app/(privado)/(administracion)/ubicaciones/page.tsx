"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import PageHeading from "@/app/components/PageHeading";
import { useZoneWorkspace } from "@/app/components/ZoneWorkspace";

export default function Zones() {
  const { zones, loading, error: loadError, reload } = useZoneWorkspace();
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [created, setCreated] = useState("");
  async function create(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true); setError(""); setCreated("");
    try {
      const nombre = name.trim().replace(/\s+/g, " ");
      const response = await fetch("/api/zonas", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ nombre }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "No se pudo crear la zona.");
      setName(""); setCreated(nombre);
      await reload();
    } catch (failure) { setError(failure instanceof Error ? failure.message : "No se pudo crear la zona."); }
    finally { setBusy(false); }
  }
  return <main className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6 lg:p-8">
    <PageHeading href="/ubicaciones" />
    <p className="text-sm leading-6 text-slate-600">Cada zona es una carpeta de Cartera donde registras y gestionas sus inmuebles. Para agregarla basta su nombre, sin registrar departamento, provincia ni distrito.</p>
    <form onSubmit={create} className="aa-card space-y-4 p-5">
      <h2 className="text-base font-bold">Agregar zona</h2>
      <label className="block text-sm font-semibold">Nombre de la zona<input required maxLength={100} value={name} disabled={busy} onChange={event => setName(event.target.value)} placeholder="Ej. Santa o Huanchaco" className="aa-input mt-2 block w-full sm:max-w-md" /></label>
      <p className="text-xs text-slate-500">Cada zona nueva tendrá 10 posiciones disponibles en Cartera.</p>
      <button type="submit" disabled={busy || !name.trim()} className="aa-button aa-button-primary">{busy ? "Creando…" : "Agregar zona"}</button>
    </form>
    {error && <p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p>}
    {created && <p role="status" className="rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800">Zona «{created}» creada con 10 posiciones. <Link href={`/cartera?zona=${encodeURIComponent(created)}`} className="font-semibold underline">Abrir carpeta en Cartera</Link></p>}
    {loadError && <p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{loadError}<button type="button" disabled={loading || busy} onClick={() => void reload()} className="ml-3 underline">Reintentar</button></p>}
    <section className="aa-card p-5" aria-label="Zonas de cartera registradas">
      <h2 className="text-base font-bold">Zonas registradas</h2>
      {loading ? <p role="status" className="mt-4 text-sm text-slate-500">Cargando zonas…</p> : <ul className="mt-3 divide-y divide-slate-200">{zones.map(zone => <li key={zone.id} className="flex flex-wrap items-center justify-between gap-3 py-4"><div className="min-w-0"><h3 className="break-words text-sm font-bold">{zone.nombre}</h3><p className="mt-2 text-xs text-slate-500">{zone.capacidad} posiciones · {zone.ocupados} ocupadas · {zone.disponibles} disponibles</p></div><Link href={`/cartera?zona=${encodeURIComponent(zone.nombre)}`} className="aa-button aa-button-secondary">Abrir cartera</Link></li>)}</ul>}
      {!loading && !loadError && zones.length === 0 && <p className="mt-4 text-sm text-slate-500">Agrega la primera zona para comenzar.</p>}
    </section>
  </main>;
}
