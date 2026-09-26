"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type Tipo = "Casa" | "Departamento" | "Terreno" | "Local" | "Oficina" | "Otros";
type Posicion = { numero: number; disponible: boolean };

export default function RegistrarInmueblePage() {
  const [posicion, setPosicion] = useState("");
  const [posiciones, setPosiciones] = useState<Posicion[]>([]);
  const [cargandoPosiciones, setCargandoPosiciones] = useState(true);
  const [tipo, setTipo] = useState<Tipo | "">("");
  const [nombre, setNombre] = useState("");
  const [ubicacion, setUbicacion] = useState("");
  const [dni, setDni] = useState("");
  const [nombres, setNombres] = useState("");
  const [apellidos, setApellidos] = useState("");
  const [telefono, setTelefono] = useState("");
  const [buscando, setBuscando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [propietarioEncontrado, setPropietarioEncontrado] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    cargarPosiciones();
  }, []);

  async function cargarPosiciones() {
    setCargandoPosiciones(true);
    try {
      const response = await fetch("/api/posiciones", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "No fue posible consultar las posiciones.");
      setPosiciones(data.posiciones ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No fue posible consultar las posiciones.");
    } finally {
      setCargandoPosiciones(false);
    }
  }

  async function buscarPropietario() {
    setError("");
    setMensaje("");
    setPropietarioEncontrado(false);

    if (!/^\d{8}$/.test(dni)) return;

    setBuscando(true);
    try {
      const response = await fetch(`/api/propietarios?dni=${dni}`);
      const data = await response.json();

      if (!response.ok) throw new Error(data.error || "No fue posible consultar el propietario.");

      if (data.propietario) {
        setNombres(data.propietario.nombres);
        setApellidos(data.propietario.apellidos);
        setTelefono(data.propietario.telefono ?? "");
        setPropietarioEncontrado(true);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "No fue posible consultar el propietario.");
    } finally {
      setBuscando(false);
    }
  }

  async function registrar() {
    setError("");
    setMensaje("");

    if (!posicion || !tipo || !nombre.trim() || !/^\d{8}$/.test(dni) || !nombres.trim() || !apellidos.trim()) {
      setError("Completa todos los campos obligatorios.");
      return;
    }

    setGuardando(true);
    try {
      const response = await fetch("/api/inmuebles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          posicion: Number(posicion),
          tipo,
          referencia: nombre,
          ubicacion,
          dni,
          nombres,
          apellidos,
          telefono,
        }),
      });

      const data = await response.json();

      if (!response.ok) throw new Error(data.error || "No fue posible registrar el inmueble.");

      setMensaje(`Inmueble ${data.codigo} registrado correctamente en la posición ${String(data.posicion).padStart(2, "0")} y enviado a Visita pendiente.`);
      setPosicion("");
      setTipo("");
      setNombre("");
      setUbicacion("");
      setDni("");
      setNombres("");
      setApellidos("");
      setTelefono("");
      setPropietarioEncontrado(false);
      await cargarPosiciones();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No fue posible registrar el inmueble.");
      await cargarPosiciones();
    } finally {
      setGuardando(false);
    }
  }

  const disponibles = useMemo(() => posiciones.filter((p) => p.disponible), [posiciones]);
  const dniValido = /^\d{8}$/.test(dni);
  const puedeRegistrar = Boolean(posicion && tipo && nombre.trim() && dniValido && nombres.trim() && apellidos.trim() && !guardando);

  return (
    <main className="min-h-screen bg-[#f5f7fa] p-6 lg:p-8">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[.14em] text-emerald-600">Fase 1 · Nuevo registro</p>
            <h1 className="mt-1 text-2xl font-bold text-slate-950">Registrar inmueble</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-500">Registra la posición, los datos mínimos del inmueble y el propietario. La información detallada puede completarse después.</p>
          </div>
          <Link href="/cartera" className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-300">← Volver a cartera</Link>
        </div>

        <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-900 p-4 text-white shadow-[0_14px_40px_rgba(15,23,42,0.10)]">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Inicio del flujo</p>
              <p className="mt-1 text-sm font-semibold">Registrar → Visita pendiente → Tasación → Aprobación → Publicación</p>
            </div>
            <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1.5 text-[10px] font-bold text-emerald-300">Estás en: Registro</span>
          </div>
        </div>

        <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_8px_30px_rgba(15,23,42,0.045)]">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Antes de guardar</p>
              <p className="mt-1 text-sm font-semibold text-slate-800">Completa lo esencial. El resto puede hacerse después.</p>
            </div>
            <span className={`rounded-full px-3 py-1.5 text-[10px] font-bold ${puedeRegistrar ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
              {puedeRegistrar ? "Listo para registrar" : "Registro en preparación"}
            </span>
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-3">
            {[
              ["01", "Posición", Boolean(posicion)],
              ["02", "Propietario", Boolean(dniValido && nombres.trim() && apellidos.trim())],
              ["03", "Inmueble", Boolean(tipo && nombre.trim())],
            ].map(([num, label, done]) => (
              <div key={String(num)} className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 ${done ? "border-emerald-200 bg-emerald-50/70" : "border-slate-200 bg-slate-50/60"}`}>
                <span className={`flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-bold ${done ? "bg-emerald-600 text-white" : "bg-white text-slate-400"}`}>{done ? "✓" : num}</span>
                <div><p className={`text-xs font-semibold ${done ? "text-emerald-800" : "text-slate-600"}`}>{label}</p><p className="text-[10px] text-slate-400">{done ? "Completo" : "Pendiente"}</p></div>
              </div>
            ))}
          </div>
        </section>

        <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_320px]">
          <section className="rounded-2xl border border-slate-200 bg-white shadow-[0_8px_30px_rgba(15,23,42,0.045)]">
            <div className="border-b border-slate-100 bg-slate-50/70 px-6 py-5">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-xl font-bold text-emerald-600">+</span>
                <div><h2 className="font-bold text-slate-900">Datos de registro</h2><p className="mt-0.5 text-xs text-slate-500">Estos datos permiten iniciar el flujo comercial.</p></div>
              </div>
            </div>

            <div className="space-y-6 p-6">
              <div>
                <div className="mb-2 flex items-center justify-between gap-3">
                  <label className="block text-sm font-semibold text-slate-700">Posición en cartera <span className="text-rose-500">*</span></label>
                  <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-700">{disponibles.length} disponibles</span>
                </div>
                <select value={posicion} onChange={(e) => setPosicion(e.target.value)} disabled={cargandoPosiciones || disponibles.length === 0} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-700 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 disabled:cursor-not-allowed disabled:bg-slate-100">
                  <option value="">{cargandoPosiciones ? "Consultando posiciones..." : disponibles.length ? "Seleccionar posición disponible" : "No hay posiciones disponibles"}</option>
                  {disponibles.map((p) => <option key={p.numero} value={p.numero}>{String(p.numero).padStart(2, "0")} · Disponible</option>)}
                </select>
                <p className="mt-1.5 text-xs text-slate-400">Las posiciones ocupadas no aparecen como opciones. La disponibilidad se vuelve a validar al guardar.</p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-5">
                <div className="flex items-center justify-between gap-3">
                  <div><h2 className="text-sm font-bold text-slate-900">Propietario</h2><p className="mt-1 text-xs text-slate-500">El DNI identifica al propietario y permite reutilizarlo en futuros inmuebles.</p></div>
                  <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-bold text-slate-500">Obligatorio</span>
                </div>

                <div className="mt-4 grid gap-4 sm:grid-cols-[180px_1fr]">
                  <div>
                    <label className="mb-2 block text-xs font-semibold text-slate-600">DNI <span className="text-rose-500">*</span></label>
                    <div className="flex gap-2">
                      <input value={dni} onChange={(e) => { setDni(e.target.value.replace(/\D/g, "").slice(0, 8)); setPropietarioEncontrado(false); }} onBlur={buscarPropietario} placeholder="8 dígitos" inputMode="numeric" className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100" />
                      <button type="button" onClick={buscarPropietario} disabled={!dniValido || buscando} className="rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50">{buscando ? "..." : "Buscar"}</button>
                    </div>
                  </div>
                  <div>
                    <label className="mb-2 block text-xs font-semibold text-slate-600">Nombres <span className="text-rose-500">*</span></label>
                    <input value={nombres} onChange={(e) => setNombres(e.target.value)} placeholder="Nombres del propietario" className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100" />
                  </div>
                </div>

                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-xs font-semibold text-slate-600">Apellidos <span className="text-rose-500">*</span></label>
                    <input value={apellidos} onChange={(e) => setApellidos(e.target.value)} placeholder="Apellidos del propietario" className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100" />
                  </div>
                  <div>
                    <label className="mb-2 block text-xs font-semibold text-slate-600">Teléfono / contacto <span className="text-slate-400">(opcional)</span></label>
                    <input value={telefono} onChange={(e) => setTelefono(e.target.value)} placeholder="Celular o teléfono de contacto" className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100" />
                  </div>
                </div>

                {propietarioEncontrado && <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3"><p className="text-xs font-bold text-emerald-700">Propietario encontrado</p><p className="mt-1 text-xs text-emerald-700">Se reutilizará el propietario registrado y se actualizarán sus datos de contacto.</p></div>}
                {!propietarioEncontrado && dniValido && <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3"><p className="text-xs font-bold text-blue-700">Consulta de propietario</p><p className="mt-1 text-xs text-blue-700">Pulsa Buscar para comprobar si el DNI ya existe. Si no existe, se creará al registrar el inmueble.</p></div>}
              </div>

              <div>
                <div className="mb-3"><h2 className="text-sm font-bold text-slate-900">Inmueble</h2><p className="mt-1 text-xs text-slate-500">Solo información inicial; los datos completos pertenecen a Fase 2.</p></div>
                <div className="grid gap-5 sm:grid-cols-2">
                  <div><label className="mb-2 block text-sm font-semibold text-slate-700">Tipo de inmueble <span className="text-rose-500">*</span></label><select value={tipo} onChange={(e) => setTipo(e.target.value as Tipo)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-700 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"><option value="">Seleccionar tipo</option><option>Casa</option><option>Departamento</option><option>Terreno</option><option>Local</option><option>Oficina</option><option>Otros</option></select></div>
                  <div><label className="mb-2 block text-sm font-semibold text-slate-700">Nombre o referencia <span className="text-rose-500">*</span></label><input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej. Casa Los Pinos" className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none placeholder:text-slate-400 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"/></div>
                </div>
                <div className="mt-5"><label className="mb-2 block text-sm font-semibold text-slate-700">Ubicación <span className="text-slate-400">(opcional)</span></label><input value={ubicacion} onChange={(e) => setUbicacion(e.target.value)} placeholder="Ej. Chimbote · Urbanización Buenos Aires" className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none placeholder:text-slate-400 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"/></div>
              </div>

              {error && <div className="rounded-xl border border-rose-200 bg-rose-50 p-4"><p className="text-sm font-semibold text-rose-700">No se pudo completar el registro</p><p className="mt-1 text-xs leading-5 text-rose-600">{error}</p></div>}
              {mensaje && <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4"><p className="text-sm font-semibold text-emerald-700">Registro realizado</p><p className="mt-1 text-xs leading-5 text-emerald-700">{mensaje}</p></div>}

              <div className="rounded-xl bg-amber-50 p-4"><p className="text-sm font-semibold text-amber-800">Después del registro</p><p className="mt-1 text-xs leading-5 text-amber-700">El inmueble quedará automáticamente en <strong>Visita pendiente</strong>, la posición quedará ocupada y se generará el primer evento de historial.</p></div>

              <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
                <Link href="/cartera" className="rounded-xl border border-slate-200 px-5 py-2.5 text-center text-sm font-semibold text-slate-600 hover:bg-slate-50 hover:border-slate-300">Cancelar</Link>
                <button onClick={registrar} disabled={!puedeRegistrar} className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-200">{guardando ? "Registrando..." : "Registrar inmueble"}</button>
              </div>
            </div>
          </section>

          <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_8px_30px_rgba(15,23,42,0.045)]">
            <p className="text-xs font-bold uppercase tracking-[.14em] text-slate-400">Flujo de ingreso</p>
            <div className="mt-4 space-y-4">
              <div className="flex gap-3"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-sm font-bold text-emerald-600">1</span><div><p className="text-sm font-semibold text-slate-800">Registrar inmueble</p><p className="mt-0.5 text-xs text-slate-500">Posición + tipo + referencia + propietario.</p></div></div>
              <div className="ml-4 h-5 border-l border-dashed border-slate-200"/>
              <div className="flex gap-3"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-50 text-sm font-bold text-amber-600">2</span><div><p className="text-sm font-semibold text-slate-800">Visita pendiente</p><p className="mt-0.5 text-xs text-slate-500">Aparece automáticamente en la bandeja.</p></div></div>
              <div className="ml-4 h-5 border-l border-dashed border-slate-200"/>
              <div className="flex gap-3"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-violet-50 text-sm font-bold text-violet-600">3</span><div><p className="text-sm font-semibold text-slate-800">Tasación</p><p className="mt-0.5 text-xs text-slate-500">Se habilita al completar la visita.</p></div></div>
            </div>
            <div className="mt-5 rounded-xl bg-[#f5f7fa] p-4"><p className="text-xs font-semibold text-slate-700">Capacidad</p><p className="mt-1 text-lg font-bold text-slate-950">90 <span className="text-sm font-medium text-slate-400">posiciones administradas</span></p><p className="mt-2 text-[11px] text-slate-400">Disponibles: <strong>{cargandoPosiciones ? "..." : disponibles.length}</strong> · La disponibilidad se consulta directamente en la base de datos.</p></div>
          </aside>
        </div>
      </div>
    </main>
  );
}
