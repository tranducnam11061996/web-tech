'use client';

import { KeyRound } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';

export default function ChangePasswordPage() {
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (newPassword !== confirmPassword) {
      setMessage('Xac nhan mat khau chua khop.');
      return;
    }
    setLoading(true);
    setMessage('');
    try {
      const response = await fetch('/api/admin/auth/password', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Origin: window.location.origin },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const payload = await response.json();
      if (!response.ok || !payload.success) throw new Error(payload?.error?.message || 'Khong the doi mat khau');
      router.replace('/login');
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : 'Khong the doi mat khau');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto mt-12 w-full max-w-lg rounded-2xl border border-gray-800 bg-[#111319] p-8 shadow-xl shadow-black/30">
      <div className="mb-6 flex items-center gap-3"><KeyRound className="h-6 w-6 text-red-400" /><div><h1 className="text-xl font-bold text-white">Doi mat khau</h1><p className="text-sm text-gray-400">Mat khau moi can co it nhat 12 ky tu.</p></div></div>
      <form onSubmit={submit} className="space-y-4">
        <input value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} type="password" autoComplete="current-password" placeholder="Mat khau hien tai" required className="w-full rounded-lg border border-gray-700 bg-gray-950 px-3 py-3 text-sm outline-none focus:border-red-500" />
        <input value={newPassword} onChange={(event) => setNewPassword(event.target.value)} type="password" autoComplete="new-password" placeholder="Mat khau moi" required className="w-full rounded-lg border border-gray-700 bg-gray-950 px-3 py-3 text-sm outline-none focus:border-red-500" />
        <input value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} type="password" autoComplete="new-password" placeholder="Xac nhan mat khau moi" required className="w-full rounded-lg border border-gray-700 bg-gray-950 px-3 py-3 text-sm outline-none focus:border-red-500" />
        {message ? <p role="alert" className="text-sm text-red-300">{message}</p> : null}
        <button disabled={loading} className="rounded-lg bg-red-600 px-5 py-3 text-sm font-bold text-white hover:bg-red-500 disabled:opacity-60">{loading ? 'Dang luu...' : 'Doi mat khau va dang xuat'}</button>
      </form>
    </div>
  );
}
