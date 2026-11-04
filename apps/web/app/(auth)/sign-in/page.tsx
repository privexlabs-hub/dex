import Link from 'next/link';
import { AuthForm } from '@/components/auth-form';

export const metadata = { title: 'Sign in' };

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const safeNext = next && next.startsWith('/') && !next.startsWith('//') ? next : undefined;
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-6 px-6 py-12">
      <h1 className="text-2xl font-semibold">Sign in</h1>
      <AuthForm mode="sign-in" next={safeNext} />
      <p className="text-sm text-muted">
        No account?{' '}
        <Link href="/sign-up" className="underline">
          Create one
        </Link>
      </p>
    </main>
  );
}
