import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://intranet.inmobiliariaalbertoalfaro.com.pe"),
  title: "Intranet | Alberto Alfaro",
  description: "Acceso interno para gestionar inmuebles, visitas, tasaciones y publicaciones.",
  openGraph: {
    type: "website",
    locale: "es_PE",
    siteName: "Inmobiliaria Alberto Alfaro",
    title: "Intranet | Alberto Alfaro",
    description: "Acceso interno para gestionar inmuebles, visitas, tasaciones y publicaciones.",
    images: [{ url: "/branding/compartir-intranet-v2.png", width: 1200, height: 630, alt: "Intranet de Inmobiliaria Alberto Alfaro" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Intranet | Alberto Alfaro",
    description: "Acceso interno para gestionar inmuebles, visitas, tasaciones y publicaciones.",
    images: [{ url: "/branding/compartir-intranet-v2.png", alt: "Intranet de Inmobiliaria Alberto Alfaro" }],
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-slate-100 text-slate-900">
        {children}
      </body>
    </html>
  );
}
