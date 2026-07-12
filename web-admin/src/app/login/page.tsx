'use client';

import { LockKeyhole, ShieldCheck } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { FormEvent, Suspense, useState } from 'react';
import { getAdminLoginRecaptchaToken } from '@/lib/adminRecaptcha';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      const recaptchaToken = await getAdminLoginRecaptchaToken();
      const response = await fetch('/api/admin/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Origin: window.location.origin },
        body: JSON.stringify({ email, password, recaptchaToken }),
      });
      const payload = await response.json();
      if (!response.ok || !payload.success) throw new Error(payload?.error?.message || 'Khong the dang nhap');
      const next = searchParams.get('next');
      const target = next?.startsWith('/') && !next.startsWith('//') ? next : '/';
      router.replace(payload.data.user.mustChangePassword ? '/change-password' : target);
      router.refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Khong the dang nhap');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-[#08090d] px-4 py-10 text-gray-100">
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-gray-800 bg-[#111319] shadow-2xl shadow-black/50">
        <div className="border-b border-gray-800 bg-[radial-gradient(circle_at_top_right,_rgba(220,38,38,.25),_transparent_48%)] p-8">
          <div className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-xl border border-red-500/30 bg-red-500/10 text-red-400"><ShieldCheck /></div>
          <h1 className="text-2xl font-black tracking-tight">TrucTiepGAME Admin</h1>
          <p className="mt-2 text-sm text-gray-400">Dang nhap de quan ly du lieu va noi dung he thong.</p>
        </div>
        <form onSubmit={submit} className="space-y-5 p-8">
          <label className="block text-sm font-medium text-gray-300">Email
            <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" autoComplete="email" required className="mt-2 w-full rounded-lg border border-gray-700 bg-gray-950 px-3 py-3 text-sm outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-500/20" />
          </label>
          <label className="block text-sm font-medium text-gray-300">Mat khau
            <input value={password} onChange={(event) => setPassword(event.target.value)} type="password" autoComplete="current-password" required className="mt-2 w-full rounded-lg border border-gray-700 bg-gray-950 px-3 py-3 text-sm outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-500/20" />
          </label>
          {error ? <p role="alert" className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</p> : null}
          <button disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-red-500 disabled:opacity-60">
            <LockKeyhole className="h-4 w-4" />{loading ? 'Dang dang nhap...' : 'Dang nhap'}
          </button>
        </form>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return <Suspense fallback={<main className="min-h-screen bg-[#08090d]" />}><LoginForm /></Suspense>;
}
