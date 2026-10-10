
"use client";
import FolderIcon from "@/app/components/FolderIcon";
import type { ReactNode } from "react";
import GeographySelect from "@/app/components/GeographySelect";

import { propertyDisplayId } from "@/lib/property-display-id";

import OperationSelect from "@/app/components/OperationSelect";
import PropertyTypeSelect from "@/app/components/PropertyTypeSelect";
import DraftRecovery from "@/app/components/DraftRecovery";
import PageHeading from "@/app/components/PageHeading";


import { Feedback } from "@/app/components/InterfaceFeedback";

import { requestJson } from "@/lib/client-request";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";

type Posicion = {
  numero: number;
  disponible: boolean;
};

function RegistrationFolder({ id, title, description, children }: { id: string; title: string; description: string; children: ReactNode }) {
  return <section id={id} aria-labelledby={`${id}-title`} className="relative mt-6 scroll-mt-24 rounded-b-2xl rounded-tr-2xl border border-amber-200 bg-amber-50/30 p-4 sm:p-5">
    <h2 id={`${id}-title`} className="cartera-folder-navigation absolute -top-5 -left-px flex h-5 items-center gap-2 rounded-t-lg border border-b-0 border-amber-200 bg-amber-100 px-3 text-xs font-bold text-amber-900"><FolderIcon className="h-4 w-4 shrink-0 text-amber-600" />{title}</h2>
    <p className="mb-4 text-xs leading-5 text-slate-500">{description}</p>
    <div className="space-y-4">{children}</div>
  </section>;
}

export default function RegistrarInmueblePage() {
  const [seleccionPosicion, setPosicion] = useState("");
  const [posicionSolicitada, setPosicionSolicitada] = useState<string | null>(
    null
  );
  const [posiciones, setPosiciones] = useState<Posicion[]>([]);
  const [cargandoPosiciones, setCargandoPosiciones] = useState(true);
  const [operacion, setOperacion] = useState("venta");
  const [tipo, setTipo] = useState<string>("");
  const [nombresPropietario,setNombresPropietario]=useState("");
  const [numeroDireccion,setNumeroDireccion]=useState("");
  const [distrito,setDistrito]=useState("");
  const [provincia,setProvincia]=useState("");
  const [departamento,setDepartamento]=useState("");
  const [nombre, setNombre] = useState("");
  const [ubicacion, setUbicacion] = useState("");
  const [dni, setDni] = useState("");
  const [apellidos, setApellidos] = useState("");
  const [telefono, setTelefono] = useState("");
  const [buscando, setBuscando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [propietarioEncontrado, setPropietarioEncontrado] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");

  const cargarPosiciones = useCallback((signal?: AbortSignal) => {
    return requestJson<{ posiciones: Posicion[] }>("/api/posiciones", { signal }).then(data => {
      if (signal?.aborted) return;
      setPosicionSolicitada(new URLSearchParams(window.location.search).get("posicion"));
      setPosiciones(data.posiciones ?? []);
    }).catch(error => {
      if (!signal?.aborted) setError(error instanceof Error ? error.message : "No fue posible consultar las posiciones.");
    }).finally(() => {
      if (!signal?.aborted) setCargandoPosiciones(false);
    });
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void cargarPosiciones(controller.signal);
    return () => controller.abort();
  }, [cargarPosiciones]);

  async function buscarPropietario() {
    setError("");
    setMensaje("");
    setPropietarioEncontrado(false);

    if (!/^\d{8}$/.test(dni)) return;

    setBuscando(true);

    try {
      const response = await fetch(`/api/propietarios?dni=${dni}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "No fue posible consultar el propietario."
        );
      }

      if (data.propietario) {
        setNombresPropietario(data.propietario.nombres);
        setApellidos(data.propietario.apellidos);
        setTelefono(data.propietario.telefono ?? "");
        setPropietarioEncontrado(true);
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No fue posible consultar el propietario."
      );
    } finally {
      setBuscando(false);
    }
  }

  async function registrar() {
    setError("");
    setMensaje("");

    if (!posicion || !tipo || !nombre.trim() || !ubicacion.trim()) {
      setError(
        "Completa tipo de inmueble, nombre del propietario y ubicación."
      );
      return;
    }

    setGuardando(true);

    try {
      const response = await fetch("/api/inmuebles", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          posicion: Number(posicion),
          tipo,
          operacion,
          referencia: nombre,
          ubicacion,
          dni,
          nombres: nombresPropietario,
          numeroDireccion,distrito,provincia,departamento,
          apellidos,
          telefono,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "No fue posible registrar el inmueble."
        );
      }

      setMensaje(
        `Inmueble ${propertyDisplayId({ posicion: data.posicion, tipo, propietarioNombres: nombresPropietario, propietarioApellidos: apellidos })} registrado correctamente en la posición ${String(
          data.posicion
        ).padStart(2, "0")} y enviado a Visita pendiente.`
      );

      setPosicion("");
      setTipo("");
      setOperacion("venta");
      setNombre("");
      setNombresPropietario("");setNumeroDireccion("");setDistrito("");setProvincia("");setDepartamento("");
      setUbicacion("");
      setDni("");
      setApellidos("");
      setTelefono("");
      setPropietarioEncontrado(false);

      setCargandoPosiciones(true);
      await cargarPosiciones();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No fue posible registrar el inmueble."
      );

      setCargandoPosiciones(true);
      await cargarPosiciones();
    } finally {
      setGuardando(false);
    }
  }

  const disponibles = useMemo(
    () => posiciones.filter((p) => p.disponible),
    [posiciones]
  );

  const posicion = disponibles.some(p => String(p.numero) === seleccionPosicion)
    ? seleccionPosicion
    : disponibles.some(p => String(p.numero) === posicionSolicitada)
      ? posicionSolicitada ?? ""
      : String(disponibles[0]?.numero ?? "");

  const dniValido = /^\d{8}$/.test(dni);
  const puedeRegistrar = Boolean(
    posicion && tipo && nombre.trim() && ubicacion.trim() && !guardando
  );

  return (
    <main className="min-h-screen bg-[#f7f7f5] p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-[1380px]">
      <DraftRecovery draftKey="registro:actual" data={{seleccionPosicion,tipo,operacion,nombre,ubicacion,dni,apellidos,telefono,nombresPropietario,numeroDireccion,distrito,provincia,departamento}} dirty={!!(tipo||nombre||ubicacion||dni||apellidos||telefono)} onRestore={draft=>{setNombresPropietario(String(draft.nombresPropietario??""));setNumeroDireccion(String(draft.numeroDireccion??""));setDistrito(String(draft.distrito??""));setProvincia(String(draft.provincia??""));setDepartamento(String(draft.departamento??""));setOperacion(draft.operacion === 'alquiler' ? 'alquiler' : 'venta');setPosicion(String(draft.seleccionPosicion??''));setTipo(draft.tipo as string||'');setNombre(String(draft.nombres||draft.nombre||''));setUbicacion(String(draft.ubicacion??''));setDni(String(draft.dni??''));setApellidos(String(draft.apellidos??''));setTelefono(String(draft.telefono??''));}}/>

        {/* ENCABEZADO */}
        <header className="mb-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <PageHeading href="/registrar-inmueble" />

            <Link
              href="/cartera"
              className="cartera-folder-navigation inline-flex w-fit items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-amber-100"
            >
              <FolderIcon className="h-5 w-5 shrink-0 text-amber-500" /><span>←</span>
              Volver a cartera
            </Link>
          </div>
        </header>
        <nav aria-label="Secciones del registro" className="mb-6 flex flex-wrap gap-2">{[["registro-posicion", "Posición"], ["registro-operacion", "Operación y datos básicos"], ["registro-ubicacion", "Ubicación"], ["registro-propietario", "Propietario"]].map(([id, title]) => <a key={id} href={`#${id}`} className="cartera-folder-navigation inline-flex min-h-11 items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-amber-100"><FolderIcon className="h-5 w-5 shrink-0 text-amber-500" />{title}</a>)}</nav>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
          {/* FORMULARIO PRINCIPAL */}
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-5 py-5 sm:px-6">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50">
                  <FolderIcon />
                </span>

                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    Datos de registro
                  </h2>
                  <p className="mt-0.5 text-xs text-slate-500">
                    Estos datos permiten iniciar el flujo comercial.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-7 p-5 sm:p-6">
              {/* POSICIÓN */}
              <RegistrationFolder id="registro-posicion" title="Posición en cartera" description="Elige el espacio disponible que ocupará el inmueble.">
                <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <label htmlFor="registro-posicion-select" className="text-sm font-bold text-slate-700">
                    Posición en cartera{" "}
                    <span className="text-[#c80000]">*</span>
                  </label>

                  <span className="w-fit rounded-full bg-[#fff1f1] px-2.5 py-1 text-xs font-bold text-[#a90000]">
                    {cargandoPosiciones
                      ? "Consultando..."
                      : `${disponibles.length} disponibles`}
                  </span>
                </div>

                <select
                  id="registro-posicion-select"
                  value={posicion}
                  onChange={(e) => setPosicion(e.target.value)}
                  disabled={
                    cargandoPosiciones || disponibles.length === 0
                  }
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm text-slate-700 outline-none transition focus:border-[#c80000] focus:ring-2 focus:ring-[#f5dede] disabled:cursor-not-allowed disabled:bg-slate-100"
                >
                  <option value="">
                    {cargandoPosiciones
                      ? "Consultando posiciones..."
                      : disponibles.length
                        ? "Seleccionar posición disponible"
                        : "No hay posiciones disponibles"}
                  </option>

                  {disponibles.map((p) => (
                    <option key={p.numero} value={p.numero}>
                      {String(p.numero).padStart(2, "0")} · Disponible
                    </option>
                  ))}
                </select>

                <p className="mt-2 text-xs leading-5 text-slate-500">
                  La primera posición disponible se selecciona
                  automáticamente. Puedes cambiarla antes de guardar.
                </p>
              </RegistrationFolder>

              {/* DATOS DEL INMUEBLE */}
              <RegistrationFolder id="registro-operacion" title="Operación y datos básicos" description="Indica el tipo de operación, el tipo de inmueble y su nombre o referencia.">
                <div className="grid gap-5 sm:grid-cols-2">
                  <div>
                    <label className="mb-4 block text-sm font-semibold text-slate-700">Tipo de operación *<OperationSelect value={operacion} onChange={setOperacion} disabled={guardando} className="mt-2 w-full rounded-xl border border-slate-200 bg-white p-3 text-sm font-normal" /></label>
                    <label className="mb-2 block text-sm font-semibold text-slate-700">
                      Tipo de inmueble{" "}
                      <span className="text-[#c80000]">*</span>
                    </label>

                    <PropertyTypeSelect value={tipo} onChange={setTipo} disabled={guardando} className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm text-slate-700 outline-none transition focus:border-[#c80000]" />
                  </div>

                  <div>
                    <label htmlFor="registro-nombre" className="mb-2 block text-sm font-semibold text-slate-700">
                      Nombre del inmueble{" "}
                      <span className="text-[#c80000]">*</span>
                    </label>

                    <input
                      required
                      maxLength={120}
                      id="registro-nombre"
                      value={nombre}
                      onChange={(e) => setNombre(e.target.value)}
                      placeholder="Nombre o referencia del inmueble"
                      className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm outline-none placeholder:text-slate-500 transition focus:border-[#c80000] focus:ring-2 focus:ring-[#f5dede]"
                    />
                  </div>
                </div>

              </RegistrationFolder>
              <RegistrationFolder id="registro-ubicacion" title="Ubicación" description="Registra la dirección y selecciona la zona del inmueble.">
                <div>
                  <label htmlFor="registro-direccion" className="mb-2 block text-sm font-semibold text-slate-700">
                    Calle / avenida{" "}
                    <span className="text-[#c80000]">*</span>
                  </label>

                  <input
                    required
                    maxLength={255}
                    id="registro-direccion"
                    value={ubicacion}
                    onChange={(e) => setUbicacion(e.target.value)}
                    placeholder="Calle o avenida"
                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm outline-none placeholder:text-slate-500 transition focus:border-[#c80000] focus:ring-2 focus:ring-[#f5dede]"
                  />
                </div>

              <label className="block text-sm font-semibold">Número / lote<input value={numeroDireccion} maxLength={30} onChange={e=>setNumeroDireccion(e.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 bg-white p-3 text-sm"/></label>
              <GeographySelect disabled={guardando} value={{departamento,provincia,distrito}} onChange={next=>{setDepartamento(next.departamento||'');setProvincia(next.provincia||'');setDistrito(next.distrito||'');}}/>

              </RegistrationFolder>
              <RegistrationFolder id="registro-propietario" title="Propietario" description="Datos opcionales. Puedes buscar un propietario existente por DNI o completar sus datos.">
                <div className="mt-4"><label className="mb-4 block text-sm font-semibold">Nombres del propietario<input value={nombresPropietario} maxLength={120} onChange={e=>setNombresPropietario(e.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 bg-white p-3" /></label>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-xs font-semibold text-slate-600">
                        DNI{" "}
                        <span className="font-normal text-slate-500">
                          (opcional)
                        </span>
                      </label>

                      <div className="flex gap-2">
                        <input
                          value={dni}
                          onChange={(e) => {
                            setDni(
                              e.target.value
                                .replace(/\D/g, "")
                                .slice(0, 8)
                            );
                            setPropietarioEncontrado(false);
                          }}
                          onBlur={buscarPropietario}
                          placeholder="8 dígitos"
                          inputMode="numeric"
                          className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none transition focus:border-[#c80000] focus:ring-2 focus:ring-[#f5dede]"
                        />

                        <button
                          type="button"
                          onClick={buscarPropietario}
                          disabled={!dniValido || buscando}
                          className="rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {buscando ? "..." : "Buscar"}
                        </button>
                      </div>
                    </div>

                  </div>

                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-xs font-semibold text-slate-600">
                        Apellidos{" "}
                        <span className="font-normal text-slate-500">
                          (opcional)
                        </span>
                      </label>

                      <input
                        value={apellidos}
                        onChange={(e) => setApellidos(e.target.value)}
                        placeholder="Apellidos del propietario"
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none transition focus:border-[#c80000] focus:ring-2 focus:ring-[#f5dede]"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-xs font-semibold text-slate-600">
                        Teléfono / contacto{" "}
                        <span className="font-normal text-slate-500">
                          (opcional)
                        </span>
                      </label>

                      <input
                        value={telefono}
                        onChange={(e) => setTelefono(e.target.value)}
                        placeholder="Celular o teléfono de contacto"
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none transition focus:border-[#c80000] focus:ring-2 focus:ring-[#f5dede]"
                      />
                    </div>
                  </div>

                  {propietarioEncontrado && (
                    <div className="mt-4 rounded-xl border border-[#ead1d1] bg-[#fff5f5] px-4 py-3">
                      <p className="text-xs font-bold text-[#a90000]">
                        Propietario encontrado
                      </p>

                      <p className="mt-1 text-xs leading-5 text-[#a90000]">
                        Se vinculará el propietario existente con sus datos registrados.
                      </p>
                    </div>
                  )}

                  {!propietarioEncontrado && dniValido && (
                    <div className="mt-4 rounded-xl border border-[#e7e5e2] bg-white px-4 py-3">
                      <p className="text-xs font-bold text-slate-600">
                        Consulta de propietario
                      </p>

                      <p className="mt-1 text-xs leading-5 text-slate-500">
                        Pulsa Buscar para comprobar si el DNI ya existe. Si no
                        existe, se creará al registrar el inmueble.
                      </p>
                    </div>
                  )}

                  {!dni && (
                    <div className="mt-4 flex gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3">
                      <span className="mt-0.5 text-sm text-slate-500">ⓘ</span>

                      <div>
                        <p className="text-xs font-bold text-slate-600">
                          Datos adicionales opcionales
                        </p>

                        <p className="mt-1 text-xs leading-5 text-slate-500">
                          El propietario es opcional. Si completas DNI o contacto, indica también sus nombres.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </RegistrationFolder>

              {/* MENSAJES */}
              {error && <Feedback tone="error" className="my-5">{error}</Feedback>}

              {mensaje && <Feedback tone="success" className="my-5">{mensaje}</Feedback>}

              {/* DESPUÉS DEL REGISTRO */}
              <div className="rounded-2xl border border-[#ead1d1] bg-[#fff7f7] p-4 sm:p-5">
                <div className="flex gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#c80000] text-sm font-bold text-white">
                    ✓
                  </span>

                  <div>
                    <p className="text-sm font-bold text-[#333]">
                      Después del registro
                    </p>

                    <p className="mt-1 text-xs leading-5 text-[#666]">
                      El inmueble quedará incorporado a la{" "}
                      <strong>cartera activa</strong>, la posición quedará
                      ocupada y se generará automáticamente la{" "}
                      <strong>visita pendiente</strong> y el primer evento de
                      historial.
                    </p>
                  </div>
                </div>
              </div>

              {/* ACCIONES */}
              <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
                <Link
                  href="/cartera"
                  className="rounded-xl border border-slate-200 px-5 py-3 text-center text-sm font-semibold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
                >
                  Cancelar
                </Link>

                <button
                  onClick={registrar}
                  disabled={!puedeRegistrar}
                  className="rounded-xl bg-[#c80000] px-6 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[#ad0000] disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
                >
                  {guardando ? "Registrando..." : "Registrar inmueble"}
                </button>
              </div>
            </div>
          </section>

          {/* PANEL LATERAL */}
          <aside className="h-fit space-y-5">
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
                Flujo de ingreso
              </p>

              <div className="mt-5 space-y-4">
                <div className="flex gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#c80000] text-xs font-bold text-white">
                    1
                  </span>

                  <div>
                    <p className="text-sm font-bold text-slate-800">
                      Registrar inmueble
                    </p>

                    <p className="mt-1 text-xs leading-5 text-slate-500">
                      Tipo + nombre del inmueble + dirección. Los demás datos pueden completarse después.
                    </p>
                  </div>
                </div>

                <div className="ml-4 h-5 border-l border-dashed border-slate-200" />

                <div className="flex gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#fff1f1] text-xs font-bold text-[#c80000]">
                    2
                  </span>

                  <div>
                    <p className="text-sm font-bold text-slate-800">
                      Visita pendiente
                    </p>

                    <p className="mt-1 text-xs leading-5 text-slate-500">
                      Aparece automáticamente en la bandeja de visitas
                      pendientes.
                    </p>
                  </div>
                </div>

                <div className="ml-4 h-5 border-l border-dashed border-slate-200" />

                <div className="flex gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-500">
                    3
                  </span>

                  <div>
                    <p className="text-sm font-bold text-slate-800">
                      Tasación
                    </p>

                    <p className="mt-1 text-xs leading-5 text-slate-500">
                      Se habilita después de completar la visita.
                    </p>
                  </div>
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-bold text-slate-700">
                  Capacidad de cartera
                </p>

                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-500">
                  Máx. 90
                </span>
              </div>

              <p className="mt-3 text-2xl font-bold tracking-tight text-slate-950">
                {posiciones.length}{" "}
                <span className="text-sm font-medium text-slate-500">
                  posiciones
                </span>
              </p>

              <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-[#c80000] transition-all"
                  style={{
                    width: `${Math.min(
                      100,
                      posiciones.length ? ((posiciones.length - disponibles.length) / posiciones.length) * 100 : 0
                    )}%`,
                  }}
                />
              </div>

              <p className="mt-2 text-xs leading-5 text-slate-500">
                Ocupadas:{" "}
                <strong className="text-slate-600">
                  {cargandoPosiciones ? "..." : posiciones.length - disponibles.length}
                </strong>{" "}
                · Disponibles:{" "}
                <strong className="text-slate-600">
                  {cargandoPosiciones ? "..." : disponibles.length}
                </strong>
              </p>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-[#faf9f7] p-5">
              <p className="text-xs font-bold text-slate-700">
                Regla de registro
              </p>

              <p className="mt-2 text-xs leading-5 text-slate-500">
                Solo necesitas completar{" "}
                <strong className="text-slate-700">
                  tipo, nombre del inmueble y dirección
                </strong>
                . Los demás datos del propietario y la información detallada pueden
                completarse posteriormente.
              </p>
            </section>
          </aside>
        </div>
      </div>
    </main>
  );
}
