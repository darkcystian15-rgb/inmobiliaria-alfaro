import PropertyInformation from "@/app/components/PropertyInformation";

export default async function Page({ searchParams }: { searchParams: Promise<{ codigo?: string | string[]; pestana?: string | string[] }> }) {
  const { codigo, pestana } = await searchParams;
  const tabs = { estado: "Estado del expediente", "estado del expediente": "Estado del expediente", arrendador: "Vendedor", arrendatario: "Comprador", seguimiento: "Seguimiento", vendedor: "Vendedor", comprador: "Comprador", visitas: "Visitas", fotos: "Visitas", inmueble: "Inmueble", propietario: "Vendedor", contacto: "Vendedor", documentacion: "Inmueble", publicacion: "Publicación", tasacion: "Tasación" } as const;
  return <PropertyInformation key={`${codigo??""}:${pestana??""}`} initialCode={typeof codigo === "string" ? codigo : ""} initialTab={typeof pestana === "string" && pestana in tabs ? tabs[pestana as keyof typeof tabs] : "Resumen"} />;
}
