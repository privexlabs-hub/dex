import { StaffSignIn } from '@/components/staff-sign-in';

export const metadata = { title: 'Sign in' };

export default function StaffSignInPage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-6 px-6 py-12">
      <h1 className="text-2xl font-semibold">DeX Staff</h1>
      <p className="text-sm text-muted">Authorized personnel only. All actions are audited.</p>
      <StaffSignIn />
    </main>
  );
}
