import { dashboardMenuItem, menuGroups } from "@/lib/navigation";

export default function PageHeading({ href }: { href: string }) {
  const group = menuGroups.find(group => group.items.some(item => item.href === href));
  const item = group?.items.find(item => item.href === href);
  if (href === "/alquileres") return <div className="aa-page-heading"><h1 className="text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">Contratos de alquiler</h1><p className="mt-2 text-sm font-semibold text-slate-600">Seguimiento</p></div>;
  if (!group || !item) {
    return <h1 className="text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">{dashboardMenuItem.label}</h1>;
  }
  return <div className="aa-page-heading">
    <h1 className="text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">{item.label}</h1>
    <p className="mt-2 text-sm font-semibold text-slate-600">{group.label}</p>
  </div>;
}
