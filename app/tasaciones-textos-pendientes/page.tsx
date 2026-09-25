"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Item = {
  inmuebleId: number;
  codigo: string;
  posicion: string;
  nombre: string;
  ubicacion: string;
  tipo: string;
  propietario: string;
  valorReferencia?: string | null;
  precioObjetivo?: string | null;
  situacion: string;
};

export default function Page() {
  const [pendientes, setPendientes] = useState<Item[]>([]);
  const [textos, setTextos] = useState<Record<number, string>>({});
  const [enlaces, setEnlaces] = useState<Record<number, string>>({});
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState<number | null>(null);
  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");

  const cargar = async () => {
    try {
      setCargando(true);
      const response = await fetch("/api/publicaciones", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error(data.error || "No se pudieron cargar los textos.");
      setPendientes(data.pendientes ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudieron cargar los textos.");
    } finally { setCargando(false); }
  };

  useEffect(() => { cargar(); }, []);

  const guardar = async (item: Item) => {
    const texto = textos[item.inmuebleId]?.trim();
    const driveLink = enlaces[item.inmuebleId]?.trim();
    setError(""); setMensaje("");
    if (!texto) return setError(`Escribe el texto de publicación de “${item.nombre}”.`);
    if (!driveLink || !/^https?:\/\//i.test(driveLink)) return setError(`Agrega un enlace HTTP/HTTPS válido de Google Drive para “${item.nombre}”.`);

    try {
      setGuardando(item.inmuebleId);
      const response = await fetch("/api/publicaciones", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ inmuebleId: item.inmuebleId, texto, driveLink }) });
      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error(data.error || "No fue posible guardar el texto.");
      setMensaje(`El texto de “${item.nombre}” quedó listo para publicar.`);
      await cargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No fue posible guardar el texto.");
    } finally { setGuardando(null); }
  };

  return (
    <main className="min-h-screen bg-slate-50 p-5 lg:p-8">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div><p className="text-xs font-bold uppercase tracking-[.16em] text-pink-500">Fase 1 · Seguimiento</p><h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">Tasaciones y textos pendientes</h1><p className="mt-1 max-w-3xl text-sm leading-6 text-slate-500">Bandeja conectada a la base de datos: muestra tasaciones pendientes y textos de inmuebles aprobados.</p></div>
          <Link href="/registrar-tasaciones" className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700">Registrar tasaciones</Link>
        </div>
        {mensaje && <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">{mensaje}</div>}
        {error && <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-800">{error}</div>}

        {cargando ? <div className="mt-7 rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">Cargando...</div> : (
          <>
            <section className="mt-7 rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 px-5 py-4"><h2 className="font-bold text-slate-900">Tasaciones pendientes</h2><p className="mt-1 text-xs text-slate-500">Inmuebles con visita realizada que todavía no tienen tasación registrada.</p></div>
              <div className="divide-y divide-slate-100">{pendientes.length ? pendientes.map(item => <div key={item.inmuebleId} className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-semibold text-slate-900">{item.nombre}</p><p className="mt-1 text-xs text-slate-500">{item.codigo} · posición {item.posicion} · {item.ubicacion} · {item.tipo}</p><p className="mt-1 text-xs text-slate-500">Propietario: {item.propietario}</p></div><Link href="/registrar-tasaciones" className="rounded-xl bg-slate-900 px-4 py-2.5 text-center text-sm font-semibold text-white">Registrar →</Link></div>) : <div className="p-8 text-center text-sm text-slate-500">No hay tasaciones pendientes.</div>}</div>
            </section>

            <section className="mt-5 rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 px-5 py-4"><h2 className="font-bold text-slate-900">Textos de publicación pendientes</h2><p className="mt-1 text-xs text-slate-500">Solo aparecen inmuebles con tasación aprobada y sin publicación registrada.</p></div>
              <div className="divide-y divide-slate-100">
                {/** The API already filters out records with a publication. */}
                {pendientes.length === 0 && <></>}
                <PublicationList />
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  );
}

function PublicationList() {
  const [items, setItems] = useState<Item[]>([]);
  const [textos, setTextos] = useState<Record<number, string>>({});
  const [enlaces, setEnlaces] = useState<Record<number, string>>({});
  const [guardando, setGuardando] = useState<number | null>(null);
  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/publicaciones", { cache: "no-store" }).then(r => r.json()).then(d => setItems(d.pendientes ?? [])).catch(() => setItems([]));
  }, []);

  const guardar = async (item: Item) => {
    setError(""); setMensaje("");
    const texto = textos[item.inmuebleId]?.trim();
    const driveLink = enlaces[item.inmuebleId]?.trim();
    if (!texto) return setError(`Escribe el texto de “${item.nombre}”.`);
    if (!driveLink || !/^https?:\/\//i.test(driveLink)) return setError(`Agrega el enlace de Google Drive de “${item.nombre}”.`);
    try {
      setGuardando(item.inmuebleId);
      const r = await fetch("/api/publicaciones", { method: "POST", headers: {"Content-Type":"application/json"}, body: JSON.stringify({ inmuebleId:item.inmuebleId,texto,driveLink })});
      const d = await r.json();
      if (!r.ok || !d.ok) throw new Error(d.error || "No fue posible guardar.");
      setMensaje(`“${item.nombre}” quedó listo para publicar.`);
      setItems(a => a.filter(x => x.inmuebleId !== item.inmuebleId));
    } catch(e) { setError(e instanceof Error ? e.message : "No fue posible guardar."); }
    finally { setGuardando(null); }
  };

  if (!items.length) return <div className="p-8 text-center text-sm text-slate-500">No hay textos de publicación pendientes.</div>;

  return <>{items.map(item => <article key={item.inmuebleId} className="p-5 lg:p-6"><div className="flex flex-col gap-4"><div><h3 className="font-semibold text-slate-900">{item.nombre}</h3><p className="mt-1 text-xs text-slate-500">{item.codigo} · posición {item.posicion} · {item.ubicacion}</p><p className="mt-1 text-xs text-slate-500">Propietario: {item.propietario} · {item.tipo}</p></div><textarea rows={5} value={textos[item.inmuebleId] ?? ""} onChange={e => setTextos(a => ({...a,[item.inmuebleId]:e.target.value}))} placeholder="Pega aquí el texto preparado para la publicación." className="w-full resize-y rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700" /><input type="url" value={enlaces[item.inmuebleId] ?? ""} onChange={e => setEnlaces(a => ({...a,[item.inmuebleId]:e.target.value}))} placeholder="https://drive.google.com/..." className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700" /><div className="flex justify-end"><button disabled={guardando === item.inmuebleId} onClick={() => guardar(item)} className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{guardando === item.inmuebleId ? "Guardando..." : "Guardar y dejar listo para publicar"}</button></div>{mensaje && <p className="text-sm font-semibold text-emerald-700">{mensaje}</p>}{error && <p className="text-sm font-semibold text-rose-700">{error}</p>}</div></article>)}</>;
}
