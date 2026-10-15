import PropertyInformation from "@/app/components/PropertyInformation";

export default async function Page({ searchParams }: { searchParams: Promise<{ codigo?: string | string[]; pestana?: string | string[] }> }) {
  const { codigo, pestana } = await searchParams;
  const tabs = { visitas: "Visitas", fotos: "Fotos", inmueble: "Inmueble", propietario: "Contacto", contacto: "Contacto", documentacion: "Documentación", publicacion: "Publicación", tasacion: "Tasación" } as const;
  return <PropertyInformation key={`${codigo??""}:${pestana??""}`} initialCode={typeof codigo === "string" ? codigo : ""} initialTab={typeof pestana === "string" && pestana in tabs ? tabs[pestana as keyof typeof tabs] : "Resumen"} />;
}
