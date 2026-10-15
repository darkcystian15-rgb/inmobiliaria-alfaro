import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { ZoneWorkspaceProvider, ZonePage } from "@/app/components/ZoneWorkspace";
import Sidebar from "@/app/components/Sidebar";
import { SessionProvider } from "@/app/components/SessionProvider";

export default async function PrivateLayout({ children }: { children: React.ReactNode }) {
  const user = await getSession();
  if (!user) redirect("/login");
  return (
    <SessionProvider user={user}>
      <ZoneWorkspaceProvider><Sidebar />
      <div className="mobile-page-shell min-h-screen min-w-0 xl:pl-72"><ZonePage>{children}</ZonePage></div></ZoneWorkspaceProvider>
    </SessionProvider>
  );
}
