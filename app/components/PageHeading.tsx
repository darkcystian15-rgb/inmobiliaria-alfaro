import { dashboardMenuItem, menuGroups } from "@/lib/navigation";

export default function PageHeading({ href }: { href: string }) {
  const group = menuGroups.find(group => group.items.some(item => item.href === href));
  const item = group?.items.find(item => item.href === href);
  if (href === "/alquileres") return <div className="aa-page-heading"><h1 className="text-xl font-bold tracking-tight text-slate-950 sm:text-2xl">Contratos de alquiler</h1><p className="mt-1 text-xs font-semibold text-slate-600">Seguimiento</p></div>;
  if (!group || !item) {
    return <h1 className="text-xl font-bold tracking-tight text-slate-950 sm:text-2xl">{dashboardMenuItem.label}</h1>;
  }
  return <div className="aa-page-heading">
    <h1 className="text-xl font-bold tracking-tight text-slate-950 sm:text-2xl">{item.label}</h1>
    <p className="mt-1 text-xs font-semibold text-slate-600">{group.label}</p>
  </div>;
}
