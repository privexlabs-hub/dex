import Link from 'next/link';
import { AuthForm } from '@/components/auth-form';

export const metadata = { title: 'Create account' };

export default function SignUpPage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-6 px-6 py-12">
      <h1 className="text-2xl font-semibold">Create your account</h1>
      <AuthForm mode="sign-up" />
      <p className="text-sm text-muted">
        Already have an account?{' '}
        <Link href="/sign-in" className="underline">
          Sign in
        </Link>
      </p>
    </main>
  );
}
