import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { canAccessPortal, homeForUser } from '@/lib/access.mjs';
export default async function PortalLayout({children}:{children:React.ReactNode}) {
  const user=await getSession();
  if(!user) redirect('/login');
  if(!canAccessPortal(user)) redirect(homeForUser(user));
  return children;
}
