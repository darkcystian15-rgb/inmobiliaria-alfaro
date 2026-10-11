import Image from "next/image";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { homeForUser } from "@/lib/access.mjs";
import LoginForm from "./LoginForm";

export const metadata = { title: "Iniciar sesión | Inmobiliaria Alberto Alfaro" };

export default async function LoginPage() {
  const user = await getSession();
  if (user) redirect(homeForUser(user));
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f7f7f5] px-5 py-10">
      <section className="w-full max-w-[440px] overflow-hidden rounded-3xl border border-[#e7e5e2] bg-white shadow-[0_20px_70px_rgba(23,23,23,0.07)]">
        <div className="h-1.5 bg-[#c80000]" />
        <div className="px-7 py-9 sm:px-10">
          <Image src="/branding/logo.png" alt="Inmobiliaria Alberto Alfaro" width={240} height={100} priority className="mx-auto h-auto max-h-24 w-60 object-contain" />
          <p className="mt-6 text-center text-[10px] font-bold uppercase tracking-[0.2em] text-[#c80000]">Intranet</p>
          <h1 className="mt-3 text-center text-2xl font-bold tracking-tight text-[#171717]">Bienvenido</h1>
          <p className="mt-2 text-center text-sm leading-6 text-slate-500">Ingresa a tu cuenta para gestionar la cartera inmobiliaria.</p>
          <LoginForm />
        </div>
        <div className="border-t border-[#e7e5e2] bg-[#faf9f7] px-6 py-4 text-center text-xs text-slate-500">Inmobiliaria Alberto Alfaro</div>
      </section>
    </main>
  );
}
