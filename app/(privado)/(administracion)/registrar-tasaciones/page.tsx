import { redirect } from "next/navigation";
import RegistrationWorkspace from "./RegistrationWorkspace";

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  if (params.pestana === "registradas") {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (key === "pestana" || value === undefined) continue;
      for (const item of Array.isArray(value) ? value : [value]) query.append(key, item);
    }
    redirect(`/tasaciones-negociadas-registradas?${query}`);
  }
  return <RegistrationWorkspace />;
}
