"use client";

import PageHeading from "@/app/components/PageHeading";


import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import ConfirmDialog from "./ConfirmDialog";
import { useSessionUser } from "./SessionProvider";
import type { ManagedUser, UserForm } from "@/lib/user-types";
import { reauthenticate } from './reauthenticate';

const fieldClass = "mt-2 min-h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-normal text-slate-800 outline-none focus:border-red-300 focus:bg-white disabled:opacity-60";
const primaryClass = "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#c80000] px-5 py-3 text-sm font-semibold text-white hover:bg-[#a90000] disabled:cursor-wait disabled:opacity-50";
const secondaryClass = "inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50";

class RequestError extends Error { constructor(message: string, public status: number) { super(message); } }
async function request<T>(url: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(url, { credentials: "same-origin", cache: "no-store", ...options });
  const data = await response.json();
  if(response.status===428 && data.reauthRequired){await reauthenticate();const retried=await fetch(url,{credentials:'same-origin',cache:'no-store',...options});const result=await retried.json();if(!retried.ok)throw new RequestError(result.error||'No se pudo completar.',retried.status);return result;}
  if (!response.ok) throw new RequestError(data.error || "No se pudo completar la solicitud.", response.status);
  return data;
}
function formFrom(user?: ManagedUser): UserForm {
  return { nombre: user?.nombre ?? "", usuario: user?.usuario ?? "", email: user?.email ?? "", rol: user?.rol ?? "operador", activo: user?.activo ?? true, password: "", confirmacion: "", desbloquear: false };
}

function UserEditor({ user, self, onClose, onSave }: { user?: ManagedUser; self: boolean; onClose: () => void; onSave: (form: UserForm) => Promise<void> }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [form, setForm] = useState(() => formFrom(user));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const needsPassword = !user?.tienePassword;
  useEffect(() => { const element = dialog.current; element?.showModal(); return () => element?.close(); }, []);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    if (form.password !== form.confirmacion) { setError("Las contraseñas no coinciden."); return; }
    setBusy(true); setError("");
    try { await onSave(form); } catch (failure) { setError(failure instanceof Error ? failure.message : "No se pudo guardar el usuario."); }
    finally { setBusy(false); }
  }
  function change<K extends keyof UserForm>(key: K, value: UserForm[K]) { setForm(previous => ({ ...previous, [key]: value })); }
  return <dialog ref={dialog} aria-labelledby="user-editor-title" onCancel={event => { event.preventDefault(); if (!busy) onClose(); }} className="fixed inset-0 m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%_-_2rem)] max-w-xl overflow-y-auto overscroll-contain rounded-3xl border border-slate-200 bg-white p-4 shadow-2xl backdrop:bg-slate-950/40 sm:p-6">
    <form onSubmit={submit} className="space-y-5">
      <div className="flex items-start justify-between gap-3"><div className="min-w-0"><h2 id="user-editor-title" className="text-xl font-bold text-slate-900">{user ? "Editar usuario" : "Crear usuario"}</h2><p className="mt-1 text-xs leading-5 text-slate-500">{user ? "Actualiza sus datos y permisos de acceso." : "Define quién podrá ingresar y qué podrá gestionar."}</p></div><button type="button" disabled={busy} onClick={onClose} className={`${secondaryClass} shrink-0`}>Cerrar</button></div>
      {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm leading-5 text-red-700">{error}</p>}
      <fieldset disabled={busy} className="space-y-4">
        <label className="block text-xs font-semibold text-slate-700">Nombre completo<input autoFocus required maxLength={120} autoComplete="name" value={form.nombre} onChange={event => change("nombre", event.target.value)} className={fieldClass} /></label>
        <div className="grid gap-4 sm:grid-cols-2"><label className="block text-xs font-semibold text-slate-700">Usuario<input required maxLength={60} pattern="[A-Za-z0-9._\-]+" autoCapitalize="none" autoComplete="off" spellCheck={false} value={form.usuario} onChange={event => change("usuario", event.target.value)} className={fieldClass} /><span className="mt-1.5 block text-xs font-normal leading-4 text-slate-500">Se utiliza para iniciar sesión.</span></label><label className="block text-xs font-semibold text-slate-700">Correo electrónico<input type="email" maxLength={160} autoComplete="email" value={form.email} onChange={event => change("email", event.target.value)} placeholder="Opcional" className={fieldClass} /></label></div>
        <div className="grid gap-4 sm:grid-cols-2"><label className="block text-xs font-semibold text-slate-700">Rol<select disabled={self} value={form.rol} onChange={event => change("rol", event.target.value as UserForm["rol"])} className={fieldClass}><option value="operador">Operador</option><option value="administrador">Administrador</option></select></label><label className="block text-xs font-semibold text-slate-700">Acceso<select disabled={self} value={form.activo ? "activo" : "inactivo"} onChange={event => change("activo", event.target.value === "activo")} className={fieldClass}><option value="activo">Activo</option><option value="inactivo">Desactivado</option></select></label></div>
        <p className="rounded-xl bg-slate-50 p-3 text-xs leading-5 text-slate-500">{self ? "Tu cuenta permanece activa como administrador para conservar el acceso a la gestión." : form.rol === "administrador" ? "El administrador accede a todos los módulos y puede gestionar usuarios." : "El operador accede a las fichas de inmuebles, sus documentos y fotografías."}</p>
        <div className="border-t border-slate-100 pt-4"><div className="flex flex-wrap items-center justify-between gap-2"><h3 className="text-xs font-bold text-slate-800">{user ? "Cambiar contraseña" : "Contraseña de acceso"}</h3><button type="button" onClick={() => setShowPassword(previous => !previous)} className="min-h-11 text-xs font-semibold text-slate-500">{showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}</button></div><p className="mt-1 text-xs leading-5 text-slate-500">{needsPassword ? "Define una contraseña de al menos 8 caracteres." : "Deja estos campos vacíos para conservar la contraseña actual. Mínimo 8 caracteres para cambiarla."}</p>
          <div className="mt-3 grid gap-4 sm:grid-cols-2"><label className="block text-xs font-semibold text-slate-700">{user ? "Nueva contraseña" : "Contraseña"}<input required={needsPassword} type={showPassword ? "text" : "password"} minLength={8} maxLength={256} autoComplete="new-password" value={form.password} onChange={event => change("password", event.target.value)} className={fieldClass} /></label><label className="block text-xs font-semibold text-slate-700">Confirmar contraseña<input required={needsPassword || Boolean(form.password)} type={showPassword ? "text" : "password"} minLength={8} maxLength={256} autoComplete="new-password" value={form.confirmacion} onChange={event => change("confirmacion", event.target.value)} className={fieldClass} /></label></div>
          {self && form.password && <p className="mt-3 text-xs leading-5 text-amber-700">Al guardar la nueva contraseña tendrás que iniciar sesión nuevamente.</p>}
        </div>
        {user?.bloqueado && <label className="flex items-start gap-3 rounded-xl border border-amber-100 bg-amber-50 p-3 text-xs leading-5 text-amber-800"><input type="checkbox" checked={form.desbloquear} onChange={event => change("desbloquear", event.target.checked)} className="mt-1 h-4 w-4 shrink-0" /><span>Desbloquear los intentos de acceso. Cambiar la contraseña también desbloquea la cuenta.</span></label>}
      </fieldset>
      <div className="flex flex-wrap justify-end gap-3 border-t border-slate-100 pt-4"><button type="button" disabled={busy} onClick={onClose} className={secondaryClass}>Cancelar</button><button type="submit" disabled={busy} className={primaryClass}>{busy ? "Guardando…" : user ? "Guardar cambios" : "Crear usuario"}</button></div>
    </form>
  </dialog>;
}

export default function UserManagement() {
  const session = useSessionUser();
  const router = useRouter();
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [revision, setRevision] = useState(0);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("todos");
  const [editor, setEditor] = useState<{ user?: ManagedUser } | null>(null);
  const [deactivate, setDeactivate] = useState<ManagedUser | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    request<{ usuarios: ManagedUser[] }>("/api/usuarios", { signal: controller.signal })
      .then(data => { if (!controller.signal.aborted) setUsers(data.usuarios); })
      .catch(failure => { if (!controller.signal.aborted) { if (failure instanceof RequestError && failure.status === 401) router.replace("/login"); else setError(failure instanceof Error ? failure.message : "No se pudieron cargar los usuarios."); } })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [revision, router]);
  function reload() { setLoading(true); setRevision(previous => previous + 1); }
  const search = query.trim().toLowerCase();
  const visible = users.filter(user => (status === "todos" || user.activo === (status === "activo")) && [user.nombre, user.usuario, user.email].filter(Boolean).join(" ").toLowerCase().includes(search));
  async function save(form: UserForm) {
    const current = editor?.user;
    setBusy(true);
    try {
      const result = await request<{ volverAIngresar?: boolean }>(current ? `/api/usuarios/${current.id}` : "/api/usuarios", { method: current ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      if (result.volverAIngresar) { router.replace("/login"); router.refresh(); return; }
      setEditor(null); setNotice(current ? "Usuario actualizado correctamente." : "Usuario creado. Ya puede iniciar sesión si su acceso está activo."); setError(""); reload();
      if (current?.id === session.id) router.refresh();
    } finally { setBusy(false); }
  }
  async function toggle(user: ManagedUser) {
    if (busy) return;
    setBusy(true); setError(""); setNotice("");
    try {
      await request(`/api/usuarios/${user.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...formFrom(user), activo: !user.activo }) });
      setDeactivate(null); setNotice(user.activo ? "Acceso desactivado. Sus sesiones se han cerrado." : "Acceso activado correctamente."); reload();
    } catch (failure) { setDeactivate(null); setError(failure instanceof Error ? failure.message : "No se pudo cambiar el acceso."); }
    finally { setBusy(false); }
  }

  return <main className="min-h-screen bg-background p-4 sm:p-6 lg:p-8"><div className="mx-auto max-w-7xl">
    <header className="flex flex-wrap items-end justify-between gap-4"><PageHeading href="/usuarios" /><button type="button" disabled={busy || loading} onClick={() => { setNotice(""); setEditor({}); }} className={primaryClass}><span aria-hidden="true" className="text-lg">+</span>Crear usuario</button></header>
    <div className="mt-7 grid gap-3 sm:grid-cols-3">{[["Usuarios", users.length], ["Accesos activos", users.filter(user => user.activo).length], ["Administradores activos", users.filter(user => user.activo && user.rol === "administrador").length]].map(([label, value]) => <div key={label} className="rounded-2xl border border-slate-200 bg-white p-5"><p className="text-xs text-slate-500">{label}</p><p className="mt-2 text-2xl font-bold text-slate-900">{loading ? "—" : value}</p></div>)}</div>
    {error && <div role="alert" className="mt-5 rounded-2xl border border-red-100 bg-red-50 p-4 text-sm text-red-700">{error}<button type="button" disabled={busy} onClick={() => { setError(""); reload(); }} className="ml-3 min-h-11 font-semibold underline">Reintentar</button></div>}
    {notice && <p role="status" className="mt-5 rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-sm text-emerald-700">{notice}</p>}
    <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-4"><div className="flex flex-col gap-3 sm:flex-row"><label className="min-w-0 flex-1"><span className="sr-only">Buscar usuarios</span><input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Buscar por nombre, usuario o correo…" className="min-h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm" /></label><label><span className="sr-only">Filtrar acceso</span><select value={status} onChange={event => setStatus(event.target.value)} className="min-h-11 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600"><option value="todos">Todos los accesos</option><option value="activo">Activos</option><option value="inactivo">Desactivados</option></select></label></div></section>
    {loading ? <p role="status" className="mt-6 rounded-2xl bg-white p-6 text-sm text-slate-500">Cargando usuarios…</p> : visible.length === 0 ? <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">No se encontraron usuarios con esos filtros.</div> : <div className="mt-5 grid grid-cols-[repeat(auto-fill,minmax(min(100%,18rem),1fr))] gap-4">{visible.map(user => <article key={user.id} className="flex min-w-0 flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start gap-3"><span aria-hidden="true" className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-lg font-bold ${user.rol === "administrador" ? "bg-red-50 text-[#c80000]" : "bg-slate-100 text-slate-500"}`}>{user.nombre.trim().charAt(0).toUpperCase()}</span><div className="min-w-0 flex-1"><h2 className="break-words text-sm font-bold text-slate-800">{user.nombre}</h2><p className="mt-1 break-words font-mono text-xs text-slate-500">{user.usuario || "Usuario por configurar"}</p></div>{user.id === session.id && <span className="shrink-0 text-xs font-semibold text-slate-500">Tu cuenta</span>}</div>
      <div className="mt-4 flex flex-wrap gap-2"><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">{user.rol === "administrador" ? "Administrador" : "Operador"}</span><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${user.activo ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>{user.activo ? "Activo" : "Desactivado"}</span>{user.bloqueado && <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">Bloqueado temporalmente</span>}{!user.tienePassword && <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">Acceso sin configurar</span>}</div>
      {user.email && <p className="mt-4 break-words text-xs text-slate-500">{user.email}</p>}
      <div className="mt-auto grid grid-cols-2 gap-2 pt-5"><button type="button" disabled={busy} onClick={() => { setNotice(""); setEditor({ user }); }} aria-label={`Editar usuario ${user.usuario || user.nombre}`} className={secondaryClass}>Editar usuario</button><button type="button" disabled={busy || user.id === session.id || !user.tienePassword} onClick={() => user.activo ? setDeactivate(user) : void toggle(user)} aria-label={`${user.activo ? "Desactivar" : "Activar"} usuario ${user.usuario || user.nombre}`} className={`${secondaryClass} ${user.activo ? "text-red-700" : "text-emerald-700"}`}>{user.activo ? "Desactivar" : "Activar"}</button></div>
    </article>)}</div>}
    {editor && <UserEditor key={editor.user?.id ?? "new"} user={editor.user} self={editor.user?.id === session.id} onClose={() => { if (!busy) setEditor(null); }} onSave={save} />}
    {deactivate && <ConfirmDialog title="Desactivar acceso" confirmLabel="Desactivar usuario" busy={busy} onCancel={() => setDeactivate(null)} onConfirm={() => void toggle(deactivate)}><p className="break-words font-semibold text-slate-800">{deactivate.nombre} · {deactivate.usuario}</p><p>Ya no podrá iniciar sesión y sus sesiones abiertas se cerrarán. Sus registros de trabajo se conservarán.</p></ConfirmDialog>}
  </div></main>;
}
