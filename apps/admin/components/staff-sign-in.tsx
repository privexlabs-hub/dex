'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { staffAuthClient } from '@/lib/auth-client';

export function StaffSignIn() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [totpNeeded, setTotpNeeded] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setPending(true);
    const form = new FormData(e.currentTarget);
    try {
      if (totpNeeded) {
        const res = await staffAuthClient.twoFactor.verifyTotp({
          code: String(form.get('code') ?? ''),
        });
        if (res.error) throw new Error(res.error.message ?? 'Invalid code');
      } else {
        const res = await staffAuthClient.signIn.email({
          email: String(form.get('email') ?? ''),
          password: String(form.get('password') ?? ''),
        });
        if (res.error) throw new Error(res.error.message ?? 'Sign in failed');
        if ((res.data as { twoFactorRedirect?: boolean } | null)?.twoFactorRedirect) {
          setTotpNeeded(true);
          return;
        }
      }
      router.push('/dashboard');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
      {totpNeeded ? (
        <label className="flex flex-col gap-1 text-sm">
          Authenticator code
          <input
            name="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            required
            className="min-h-11 rounded-lg border border-border bg-transparent px-3"
          />
        </label>
      ) : (
        <>
          <label className="flex flex-col gap-1 text-sm">
            Staff email
            <input
              name="email"
              type="email"
              autoComplete="username"
              required
              className="min-h-11 rounded-lg border border-border bg-transparent px-3"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Password
            <input
              name="password"
              type="password"
              autoComplete="current-password"
              required
              className="min-h-11 rounded-lg border border-border bg-transparent px-3"
            />
          </label>
        </>
      )}
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="min-h-11 rounded-lg bg-accent px-4 text-accent-fg disabled:opacity-50"
      >
        {pending ? 'Please wait…' : totpNeeded ? 'Verify' : 'Sign in'}
      </button>
    </form>
  );
}
