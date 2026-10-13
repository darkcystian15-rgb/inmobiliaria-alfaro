"use client";

import Link from "next/link";
import { propertyDisplayId } from "@/lib/property-display-id";

import PageHeading from "@/app/components/PageHeading";


import { Feedback, LoadingCards } from "@/app/components/InterfaceFeedback";

import { requestJson } from "@/lib/client-request";

import { rentalResult } from "@/lib/rental-result.mjs";
import { operationLabel } from "@/lib/operation.mjs";
import { saleResult } from "@/lib/sale-result.mjs";
import ActiveFilters from "@/app/components/ActiveFilters";
import ConfirmDialog from "@/app/components/ConfirmDialog";
import { useCallback, useEffect, useMemo, useState } from "react";

type Item = {
  inmuebleId: number;
  codigo: string;
  posicion: string;
  nombre: string;
  ubicacion: string;
  tipo: string;
  operacion: string;
  propietario: string;
  dni: string;
  etapa: string;
};

const motivos = [
  { value: "alquilado", label: "Alquilado" },
  { value: "vendido", label: "Vendido" },
  {
    value: "cancelacion_propietario",
    label: "Cancelación del propietario",
  },
  {
    value: "cancelacion_externa",
    label: "Cancelación externa",
  },
  { value: "otro", label: "Otro" },
];

export default function Page() {
  const [alquileres, setAlquileres] = useState<Record<number, Record<string, string>>>({});
  const [ventas, setVentas] = useState<Record<number, { fechaVenta: string; precioFinal: string; comision: string }>>({});
  const [confirmation, setConfirmation] = useState<Item | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [selecciones, setSelecciones] = useState<Record<number, string>>({});
  const [detalles, setDetalles] = useState<Record<number, string>>({});
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState<number | null>(null);
  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");
  const [errorCarga, setErrorCarga] = useState(false);

  const cargar = useCallback((signal?: AbortSignal) => {
    if (!signal?.aborted) { setCargando(true); setError(""); setErrorCarga(false); }
    return requestJson<{ items: Item[] }>("/api/liberaciones", { signal }).then(data => {
      if (signal?.aborted) return;
      setItems(data.items ?? []);
    }).catch(error => {
      if (!signal?.aborted) { setErrorCarga(true); setError(error instanceof Error ? error.message : "No se pudieron cargar los inmuebles."); }
    }).finally(() => {
      if (!signal?.aborted) setCargando(false);
    });
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => { if (!controller.signal.aborted) void cargar(controller.signal); }, 0);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [cargar]);

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();

    if (!q) return items;

    return items.filter((x) =>
      [
        x.codigo,
        x.nombre,
        x.ubicacion,
        x.propietario,
        x.dni,
        x.posicion,
      ]
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [items, busqueda]);

  const liberar = async (item: Item, confirmed = false) => {
    if (guardando !== null) return;
    setError("");
    setMensaje("");

    const motivo = selecciones[item.inmuebleId] ?? "";
    const detalleOtro = detalles[item.inmuebleId]?.trim() ?? "";

    if (!motivo) {
      setError(`Selecciona el motivo para “${item.nombre}”.`);
      return;
    }

    if (motivo === "otro" && !detalleOtro) {
      setError(
        `Indica el detalle del motivo para “${item.nombre}”.`
      );
      return;
    }

    if (motivo === "vendido") {
      try { saleResult(ventas[item.inmuebleId] ?? {}); }
      catch (error) { setError(error instanceof Error ? error.message : "Completa el resultado económico."); return; }
    }
    if (motivo === "alquilado") {
      try { rentalResult(alquileres[item.inmuebleId] ?? {}); }
      catch (error) { setError(error instanceof Error ? error.message : "Completa los datos del alquiler."); return; }
    }
    if (!confirmed) { setConfirmation(item); return; }

    try {
      setGuardando(item.inmuebleId);

      const response = await fetch("/api/liberaciones", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          inmuebleId: item.inmuebleId,
          motivo,
          detalleOtro,
          ...(motivo === "vendido" ? ventas[item.inmuebleId] : motivo === "alquilado" ? alquileres[item.inmuebleId] : {}),
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(
          data.error || "No fue posible liberar el inmueble."
        );
      }

      setMensaje(
        `“${item.nombre}” fue liberado correctamente. La posición ${item.posicion} queda disponible.`
      );

      setConfirmation(null);
      setCargando(true);
      await cargar();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No fue posible liberar el inmueble."
      );
    } finally {
      setGuardando(null);
    }
  };

  return (
    <main className="min-h-screen bg-background p-4 sm:p-6 lg:p-8">
      {confirmation && <ConfirmDialog title="Confirmar liberación" confirmLabel="Liberar inmueble" busy={guardando !== null} onCancel={() => setConfirmation(null)} onConfirm={() => { void liberar(confirmation, true); }}>
        <p className="break-words font-semibold">{confirmation.nombre} · Posición {confirmation.posicion}</p>
        <p>El inmueble saldrá de la cartera activa y su posición quedará disponible. Su ficha, archivos e historial se conservarán.</p>
        {selecciones[confirmation.inmuebleId] === "vendido" && <p>Venta: S/ {ventas[confirmation.inmuebleId]?.precioFinal} · Comisión: S/ {ventas[confirmation.inmuebleId]?.comision} · Fecha: {ventas[confirmation.inmuebleId]?.fechaVenta}</p>}
        {selecciones[confirmation.inmuebleId] === "alquilado" && <p>Renta mensual: S/ {alquileres[confirmation.inmuebleId]?.rentaMensual} · Fecha de cierre: {alquileres[confirmation.inmuebleId]?.fechaAlquiler}</p>}
        {error && <p role="alert" className="text-red-700">{error}</p>}
      </ConfirmDialog>}
      <div className="mx-auto max-w-[1380px]">
        {/* ENCABEZADO */}
        <header className="mb-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <PageHeading href="/liberar-inmuebles" />

            <div className="w-fit rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
                Cartera activa
              </p>

              <p className="mt-1 text-lg font-bold text-slate-950">
                {items.length}
                <span className="ml-1 text-xs font-medium text-slate-500">
                  inmuebles
                </span>
              </p>
            </div>
          </div>
        </header>

        {/* PROCESO */}
        <section className="mb-6 overflow-hidden rounded-2xl border border-emerald-200 bg-emerald-50/30 shadow-sm">
          <div className="border-b border-slate-100 px-5 py-4 sm:px-6">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
                  Antes de liberar
                </p>

                <p className="mt-1 text-sm font-semibold text-slate-800">
                  Selecciona el inmueble, registra el motivo y confirma la
                  salida. Vendido o alquilado registra un cierre; los otros motivos se eligen según lo ocurrido.
                </p>
              </div>

              <span className="w-fit rounded-full bg-[#fff1f1] px-3 py-1.5 text-xs font-bold text-[#a90000]">
                La posición será reutilizable
              </span>
            </div>
          </div>

          <div className="grid sm:grid-cols-3">
            {[
              {
                numero: "01",
                titulo: "Seleccionar",
                detalle: "Inmueble activo",
              },
              {
                numero: "02",
                titulo: "Registrar motivo",
                detalle: "Causa de salida",
              },
              {
                numero: "03",
                titulo: "Confirmar",
                detalle: "Posición disponible",
              },
            ].map((paso, index) => (
              <div
                key={paso.numero}
                className={`flex items-center gap-3 px-5 py-4 ${
                  index > 0
                    ? "border-t border-slate-100 sm:border-l sm:border-t-0"
                    : ""
                }`}
              >
                <span
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                    index === 0
                      ? "bg-[#c80000] text-white"
                      : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {paso.numero}
                </span>

                <div>
                  <p className="text-xs font-bold text-slate-700">
                    {paso.titulo}
                  </p>

                  <p className="mt-0.5 text-xs text-slate-500">
                    {paso.detalle}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* AVISOS */}
        {mensaje && <Feedback tone="success" className="my-5">{mensaje}</Feedback>}

        {error && <Feedback tone="error" className="my-5">{error}{errorCarga && <button type="button" disabled={cargando} onClick={() => void cargar()} className="aa-button aa-button-secondary mt-3">{cargando ? "Cargando…" : "Reintentar"}</button>}</Feedback>}

        {/* BUSCADOR */}
        <section className="mb-6 rounded-2xl border border-emerald-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-bold text-slate-800">
                Inmuebles disponibles para registrar salida
              </p>

              <p className="mt-1 text-xs text-slate-500">
                Busca el inmueble y abre «Registrar salida» para completar el cierre.
              </p>
            </div>

            <span className="w-fit rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-500">
              {filtrados.length} resultado
              {filtrados.length === 1 ? "" : "s"}
            </span>
          </div>

          <div className="mt-4">
            <label className="text-xs font-semibold text-slate-600">
              Buscar inmueble

              <input
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Código, nombre, propietario, DNI, ubicación o posición..."
                className="mt-2 w-full rounded-xl border border-slate-200 bg-[#fafafa] px-4 py-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-500 focus:border-[#c80000] focus:bg-white focus:ring-2 focus:ring-[#f5dede]"
              />
            </label>
          </div>
        </section>

        <ActiveFilters labels={[busqueda.trim() && `Búsqueda: ${busqueda}`]} onClear={() => setBusqueda("")} />

        {/* LISTADO */}
        <section>
          {cargando ? (
            <LoadingCards label="Cargando inmuebles…" />
          ) : filtrados.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white px-6 py-12 text-center shadow-sm">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-xl text-slate-500">
                {error ? "!" : items.length === 0 ? "✓" : "⌕"}
              </div>

              <h2 className="mt-4 font-bold text-slate-900">
                {items.length === 0
                  ? error ? "No se pudieron consultar los inmuebles" : "No hay inmuebles activos"
                  : "No hay coincidencias"}
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                {items.length === 0
                  ? error ? "Pulsa Reintentar para consultar los inmuebles." : "Cuando existan inmuebles activos aparecerán aquí para registrar su salida."
                  : "Prueba con otro término de búsqueda."}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filtrados.map((item) => {
                const motivo = selecciones[item.inmuebleId] ?? "";

                return (
                  <details key={item.inmuebleId} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm open:border-emerald-300">
                    <summary className="cursor-pointer p-5 transition hover:bg-emerald-50/40"><div className="grid items-center gap-2 sm:grid-cols-[100px_minmax(0,1fr)_minmax(0,1fr)_110px_150px]"><span className="break-words font-mono text-xs font-bold text-slate-700">{propertyDisplayId(item)}<span className="mt-1 block font-sans font-normal">Pos. {item.posicion}</span></span><div className="min-w-0"><p className="break-words text-sm font-bold text-slate-900">{item.nombre}</p><p className="mt-1 text-xs text-slate-500">{item.tipo} · {item.propietario || "Propietario pendiente"}</p></div><p className="break-words text-xs text-slate-600">{item.ubicacion || "Ubicación pendiente"}</p><span className="text-xs font-semibold">{operationLabel(item.operacion)}</span><span className="w-fit rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800">Registrar salida ↓</span></div></summary>
                    <div className="border-t border-slate-100 px-5 pt-4"><Link href={`/datos-inmuebles?codigo=${item.inmuebleId}`} className="text-sm font-semibold text-[#c80000]">Abrir ficha completa →</Link></div>
                    {/* MOTIVO */}
                    <div className="p-5 sm:p-6">
                      <div className="grid gap-5 lg:grid-cols-[minmax(240px,0.8fr)_minmax(0,1.2fr)]">
                        <div>
                          <label className="text-xs font-bold text-slate-600">
                            Motivo de liberación{" "}
                            <span className="text-[#c80000]">*</span>

                            <select
                              value={motivo}
                              onChange={(e) =>
                                setSelecciones((c) => ({
                                  ...c,
                                  [item.inmuebleId]: e.target.value,
                                }))
                              }
                              className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm text-slate-700 outline-none transition focus:border-[#c80000] focus:ring-2 focus:ring-[#f5dede]"
                            >
                              <option value="">
                                Seleccionar motivo
                              </option>

                              {motivos.filter(m => m.value !== (item.operacion === "alquiler" ? "vendido" : "alquilado")).map((m) => (
                                <option key={m.value} value={m.value}>
                                  {m.label}
                                </option>
                              ))}
                            </select>
                          </label>
                        </div>

                        {motivo === "otro" ? (
                          <div>
                            <label className="text-xs font-bold text-slate-600">
                              Detalle del motivo{" "}
                              <span className="text-[#c80000]">*</span>

                              <input
                                value={
                                  detalles[item.inmuebleId] ?? ""
                                }
                                onChange={(e) =>
                                  setDetalles((c) => ({
                                    ...c,
                                    [item.inmuebleId]: e.target.value,
                                  }))
                                }
                                placeholder="Describe brevemente el motivo..."
                                className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-500 focus:border-[#c80000] focus:ring-2 focus:ring-[#f5dede]"
                              />
                            </label>
                          </div>
                        ) : (
                          <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-[#faf9f7] p-4">
                            <span className="mt-0.5 text-sm text-slate-500">
                              ⓘ
                            </span>

                            <div>
                              <p className="text-xs font-bold text-slate-700">
                                Registro de salida
                              </p>

                              <p className="mt-1 text-xs leading-5 text-slate-500">
                                La liberación conservará la fecha, el motivo
                                y la trazabilidad del usuario. El inmueble no
                                será eliminado del histórico.
                              </p>
                            </div>
                          </div>
                        )}
                      </div>

                      {motivo === "vendido" && <section className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4"><h4 className="text-sm font-bold">Resultado económico de la venta</h4><p className="mt-1 text-xs text-slate-600">Registra el importe final y la comisión acordada. La comisión representa ingreso de la inmobiliaria, antes de gastos.</p><div className="mt-3 grid gap-3 sm:grid-cols-3">{([['fechaVenta', 'Fecha de venta', 'date'], ['precioFinal', 'Precio final (S/)', 'number'], ['comision', 'Comisión de la inmobiliaria (S/)', 'number']] as const).map(([key, label, type]) => <label key={key} className="text-xs font-semibold">{label} *<input type={type} min={type === 'number' ? (key === 'comision' ? 0 : 0.01) : undefined} step={type === 'number' ? '0.01' : undefined} disabled={guardando !== null} value={ventas[item.inmuebleId]?.[key] ?? ''} onChange={event => setVentas(previous => ({ ...previous, [item.inmuebleId]: { ...(previous[item.inmuebleId] ?? { fechaVenta: '', precioFinal: '', comision: '' }), [key]: event.target.value } }))} className="mt-2 w-full rounded-xl border border-slate-200 bg-white p-3 text-sm" /></label>)}</div></section>}

                      {motivo === "alquilado" && <section className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4"><h4 className="text-sm font-bold">Resultado del alquiler</h4><p className="mt-1 text-xs text-slate-600">Registra la renta mensual acordada. Puedes adjuntar el contrato en la ficha → Documentación (categoría CONTRATO). Garantía, adelanto y fechas del contrato son opcionales; la comisión es el ingreso de la inmobiliaria.</p><div className="mt-3 grid gap-3 sm:grid-cols-3">{[['fechaAlquiler', 'Fecha de cierre', 'date', true], ['rentaMensual', 'Renta mensual (S/)', 'number', true], ['comision', 'Comisión (S/)', 'number', false], ['garantia', 'Garantía (S/)', 'number', false], ['adelanto', 'Adelanto (S/)', 'number', false], ['fechaInicioAlquiler', 'Inicio del alquiler', 'date', false], ['fechaFinAlquiler', 'Fin del alquiler', 'date', false]].map(([key, label, type, required]) => <label key={String(key)} className="text-xs font-semibold">{label}{required ? ' *' : ''}<input type={String(type)} min={type === 'number' ? (key === 'rentaMensual' ? 0.01 : 0) : undefined} step={type === 'number' ? '0.01' : undefined} disabled={guardando !== null} value={alquileres[item.inmuebleId]?.[String(key)] ?? ''} onChange={event => setAlquileres(previous => ({ ...previous, [item.inmuebleId]: { ...previous[item.inmuebleId], [String(key)]: event.target.value } }))} className="mt-2 w-full rounded-xl border border-slate-200 bg-white p-3 text-sm" /></label>)}</div></section>}

                      {/* CONFIRMACIÓN */}
                      <div className="mt-5 rounded-2xl border border-[#ead1d1] bg-[#fff7f7] p-4 sm:p-5">
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                          <div className="flex gap-3">
                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#fff1f1] text-sm font-bold text-[#c80000]">
                              !
                            </span>

                            <div>
                              <p className="text-sm font-bold text-slate-800">
                                ¿Retirar este inmueble de la cartera?
                              </p>

                              <p className="mt-1 text-xs leading-5 text-slate-500">
                                Al confirmar, dejará de estar activo y la
                                posición{" "}
                                <strong className="text-slate-700">
                                  {item.posicion}
                                </strong>{" "}
                                podrá utilizarse para otro inmueble.
                              </p>
                            </div>
                          </div>

                          <button
                            disabled={guardando !== null}
                            onClick={() => liberar(item)}
                            className="shrink-0 rounded-xl bg-[#c80000] px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[#ad0000] disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
                          >
                            {guardando === item.inmuebleId
                              ? "Liberando..."
                              : "Confirmar liberación"}
                          </button>
                        </div>
                      </div>
                    </div>
                  </details>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}