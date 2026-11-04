import { redirect } from 'next/navigation';
import { getPrincipal } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/** Server-side session gate for every signed-in route. The edge proxy is only a hint. */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const principal = await getPrincipal();
  if (!principal) redirect('/sign-in');
  return <>{children}</>;
}
