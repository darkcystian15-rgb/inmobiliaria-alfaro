import { redirect } from "next/navigation";

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const values = await searchParams;
  const query = new URLSearchParams();
  for (const key of ["zona", "inmueble"]) {
    const value = values[key];
    if (typeof value === "string" && value) query.set(key, value);
  }
  redirect(`/registrar-tasaciones${query.size ? `?${query}` : ""}`);
}
