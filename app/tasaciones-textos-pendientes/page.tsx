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

type Publicada = {
  inmuebleId: number;
  codigo: string;
  tipo: string;
  referencia: string;
  posicion: number | null;
  publicado: boolean;
  fechaPublicacion: string | null;
};

export default function Page() {
  const [pendientes, setPendientes] = useState<Item[]>([]);
  const [listos, setListos] = useState<Publicada[]>([]);
  const [textos, setTextos] = useState<Record<number, string>>({});
  const [enlaces, setEnlaces] = useState<Record<number, string>>({});
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState<number | null>(null);
  const [publicando, setPublicando] = useState<number | null>(null);
  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");

  const cargar = async () => {
    try {
      setCargando(true);
      const response = await fetch("/api/publicaciones", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error(data.error || "No se pudieron cargar las publicaciones.");
      setPendientes(data.pendientes ?? []);
      setListos(data.listos ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudieron cargar las publicaciones.");
    } finally {
      setCargando(false);
    }
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
      const response = await fetch("/api/publicaciones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inmuebleId: item.inmuebleId, texto, driveLink }),
      });
      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error(data.error || "No fue posible guardar el texto.");
      setMensaje(`“${item.nombre}” quedó listo para publicar.`);
      await cargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No fue posible guardar el texto.");
    } finally { setGuardando(null); }
  };

  const marcarPublicado = async (item: Publicada) => {
    if (!window.confirm(`¿Confirmas que “${item.referencia}” ya fue publicado?`)) return;
    setError(""); setMensaje("");
    try {
      setPublicando(item.inmuebleId);
      const response = await fetch("/api/publicaciones", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inmuebleId: item.inmuebleId }),
      });
      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error(data.error || "No fue posible registrar la publicación.");
      setMensaje(`“${item.referencia}” quedó registrado como publicado.`);
      await cargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No fue posible registrar la publicación.");
    } finally { setPublicando(null); }
  };

  return (
    <main className="min-h-screen bg-[#f5f7fa] p-5 lg:p-8">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[.16em] text-pink-500">Fase 1 · Seguimiento</p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">Tasaciones y textos pendientes</h1>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-500">Bandeja conectada a la base de datos para completar el flujo de tasación → texto → listo para publicar → publicado.</p>
          </div>
          <Link href="/registrar-tasaciones" className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700">Registrar tasaciones</Link>
        </div>

        <section className="mt-6 rounded-2xl border border-slate-200 bg-slate-900 p-5 text-white shadow-[0_14px_40px_rgba(15,23,42,0.10)]"><div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Bandeja de seguimiento</p><p className="mt-1 text-sm font-semibold">Aquí se encadena tasación aprobada → texto → publicación.</p></div><span className="rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1.5 text-xs font-bold text-emerald-200">{listos.length} listos para publicar</span></div></section>

        <section className="mt-5 grid gap-3 md:grid-cols-3">
          <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-4">
            <div className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-100 text-sm font-bold text-amber-700">1</span><div><p className="text-xs font-bold uppercase tracking-wide text-amber-700">Tasación</p><p className="text-sm font-semibold text-slate-900">{pendientes.filter(x => x.situacion === "pendiente_tasacion").length} pendientes</p></div></div>
          </div>
          <div className="rounded-2xl border border-pink-200 bg-pink-50/80 p-4">
            <div className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-full bg-pink-100 text-sm font-bold text-pink-700">2</span><div><p className="text-xs font-bold uppercase tracking-wide text-pink-700">Texto</p><p className="text-sm font-semibold text-slate-900">{pendientes.filter(x => x.situacion === "aprobado").length} por preparar</p></div></div>
          </div>
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/80 p-4">
            <div className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-100 text-sm font-bold text-emerald-700">3</span><div><p className="text-xs font-bold uppercase tracking-wide text-emerald-700">Publicación</p><p className="text-sm font-semibold text-slate-900">{listos.length} listos para confirmar</p></div></div>
          </div>
        </section>

        {mensaje && <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">{mensaje}</div>}
        {error && <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-800">{error}</div>}

        {cargando ? <div className="mt-7 rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">Cargando...</div> : (
          <>
            <section className="mt-7 rounded-2xl border border-slate-200 bg-white shadow-[0_8px_30px_rgba(15,23,42,0.045)]">
              <div className="border-b border-slate-200 px-5 py-4">
                <div className="flex items-center gap-3"><span className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-100 text-xs font-bold text-amber-700">1</span><h2 className="font-bold text-slate-900">Tasaciones pendientes</h2></div>
                <p className="mt-1 text-xs text-slate-500">Inmuebles con visita realizada que todavía no tienen tasación registrada.</p>
              </div>
              <div className="divide-y divide-slate-100">
                {pendientes.filter(x => x.situacion === "pendiente_tasacion").length ? pendientes.filter(x => x.situacion === "pendiente_tasacion").map(item => (
                  <div key={item.inmuebleId} className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
                    <div><p className="font-semibold text-slate-900">{item.nombre}</p><p className="mt-1 text-xs text-slate-500">{item.codigo} · posición {item.posicion} · {item.ubicacion} · {item.tipo}</p><p className="mt-1 text-xs text-slate-500">Propietario: {item.propietario}</p></div>
                    <Link href="/registrar-tasaciones" className="rounded-xl bg-slate-900 px-4 py-2.5 text-center text-sm font-semibold text-white">Registrar →</Link>
                  </div>
                )) : <div className="p-8 text-center text-sm text-slate-500">No hay tasaciones pendientes.</div>}
              </div>
            </section>

            <section className="mt-5 rounded-2xl border border-slate-200 bg-white shadow-[0_8px_30px_rgba(15,23,42,0.045)]">
              <div className="border-b border-slate-200 px-5 py-4">
                <div className="flex items-center gap-3"><span className="flex h-8 w-8 items-center justify-center rounded-full bg-pink-100 text-xs font-bold text-pink-700">2</span><h2 className="font-bold text-slate-900">Textos de publicación pendientes</h2></div>
                <p className="mt-1 text-xs text-slate-500">Solo aparecen inmuebles con tasación aprobada y sin publicación registrada.</p>
              </div>
              <div className="divide-y divide-slate-100">
                {pendientes.filter(x => x.situacion === "aprobado").length ? pendientes.filter(x => x.situacion === "aprobado").map(item => (
                  <article key={item.inmuebleId} className="p-5 lg:p-6">
                    <div className="flex flex-col gap-4">
                      <div><h3 className="font-semibold text-slate-900">{item.nombre}</h3><p className="mt-1 text-xs text-slate-500">{item.codigo} · posición {item.posicion} · {item.ubicacion}</p><p className="mt-1 text-xs text-slate-500">Propietario: {item.propietario} · {item.tipo}</p></div>
                      <textarea rows={5} value={textos[item.inmuebleId] ?? ""} onChange={e => setTextos(a => ({ ...a, [item.inmuebleId]: e.target.value }))} placeholder="Pega aquí el texto preparado para la publicación." className="w-full resize-y rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700" />
                      <input type="url" value={enlaces[item.inmuebleId] ?? ""} onChange={e => setEnlaces(a => ({ ...a, [item.inmuebleId]: e.target.value }))} placeholder="https://drive.google.com/..." className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700" />
                      <div className="flex justify-end"><button disabled={guardando === item.inmuebleId} onClick={() => guardar(item)} className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{guardando === item.inmuebleId ? "Guardando..." : "Guardar y dejar listo para publicar"}</button></div>
                    </div>
                  </article>
                )) : <div className="p-8 text-center text-sm text-slate-500">No hay textos de publicación pendientes.</div>}
              </div>
            </section>

            <section className="mt-5 rounded-2xl border border-slate-200 bg-white shadow-[0_8px_30px_rgba(15,23,42,0.045)]">
              <div className="border-b border-slate-200 px-5 py-4">
                <div className="flex items-center gap-3"><span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-700">3</span><h2 className="font-bold text-slate-900">Listos para publicar</h2></div>
                <p className="mt-1 text-xs text-slate-500">Aquí aparecen los inmuebles cuyo texto ya fue registrado. Cuando la publicación se haya realizado, confírmala aquí.</p>
              </div>
              <div className="divide-y divide-slate-100">
                {listos.length ? listos.map(item => <div key={item.inmuebleId} className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-semibold text-slate-900">{item.referencia}</p><p className="mt-1 text-xs text-slate-500">{item.codigo} · posición {item.posicion ? String(item.posicion).padStart(2, "0") : "—"} · {item.tipo}</p></div><button disabled={publicando === item.inmuebleId} onClick={() => marcarPublicado(item)} className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{publicando === item.inmuebleId ? "Registrando..." : "Marcar como publicado"}</button></div>) : <div className="p-8 text-center text-sm text-slate-500">No hay publicaciones listas para confirmar.</div>}
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  );
}
