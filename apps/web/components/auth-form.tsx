'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { authClient } from '@/lib/auth-client';

type Mode = 'sign-in' | 'sign-up';

export function AuthForm({ mode, next }: { mode: Mode; next?: string | undefined }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setPending(true);
    const form = new FormData(e.currentTarget);
    const email = String(form.get('email') ?? '').trim();
    const password = String(form.get('password') ?? '');
    const name = String(form.get('name') ?? '').trim();
    try {
      if (mode === 'sign-up') {
        const res = await authClient.signUp.email({
          email,
          password,
          name,
          callbackURL: next ?? '/onboarding',
        });
        if (res.error) throw new Error(res.error.message ?? 'Sign up failed');
        setNotice('Check your email to verify your address, then sign in.');
      } else {
        const res = await authClient.signIn.email({
          email,
          password,
          callbackURL: next ?? '/dashboard',
        });
        if (res.error) throw new Error(res.error.message ?? 'Sign in failed');
        router.push(next ?? '/dashboard');
        router.refresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
      {mode === 'sign-up' && (
        <label className="flex flex-col gap-1 text-sm">
          Name
          <input
            name="name"
            autoComplete="name"
            required
            className="min-h-11 rounded-lg border border-border bg-transparent px-3"
          />
        </label>
      )}
      <label className="flex flex-col gap-1 text-sm">
        Email
        <input
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          required
          className="min-h-11 rounded-lg border border-border bg-transparent px-3"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Password
        <input
          name="password"
          type="password"
          autoComplete={mode === 'sign-up' ? 'new-password' : 'current-password'}
          minLength={12}
          required
          className="min-h-11 rounded-lg border border-border bg-transparent px-3"
        />
        {mode === 'sign-up' && <span className="text-xs text-muted">At least 12 characters.</span>}
      </label>
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="text-sm">
          {notice}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="min-h-11 rounded-lg bg-accent px-4 text-accent-fg disabled:opacity-50"
      >
        {pending ? 'Please wait…' : mode === 'sign-up' ? 'Create account' : 'Sign in'}
      </button>
    </form>
  );
}
