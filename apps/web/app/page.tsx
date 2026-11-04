import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col justify-center gap-6 px-6 py-12">
      <h1 className="text-3xl font-semibold tracking-tight">DeX</h1>
      <p className="text-muted">
        Your AI product marketing studio. From product understanding to production-ready marketing
        content.
      </p>
      <div className="flex gap-3">
        <Link href="/sign-up" className="rounded-lg bg-accent px-4 py-3 text-accent-fg">
          Create account
        </Link>
        <Link href="/sign-in" className="rounded-lg border border-border px-4 py-3">
          Sign in
        </Link>
      </div>
      <p className="text-xs text-muted">
        Foundation build. Visual design pending the design track.
      </p>
    </main>
  );
}
