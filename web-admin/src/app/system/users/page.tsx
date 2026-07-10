'use client';

import { FormEvent, useEffect, useState } from 'react';
import { KeyRound, Pencil, Plus, UserX } from 'lucide-react';
import { PERMISSION_DEFINITIONS, type AdminPermission } from '@/lib/admin/permissions';

type Role = { code: string; name: string; isSystem: boolean };
type User = { id: number; email: string; name: string; role: string; status: boolean; mustChangePassword: boolean; overrides: { grant: AdminPermission[]; revoke: AdminPermission[] } };
const emptyDraft = { email: '', name: '', role: 'viewer', password: '', status: true, grant: [] as AdminPermission[], revoke: [] as AdminPermission[] };

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [draft, setDraft] = useState(emptyDraft);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const load = async () => {
    const [usersResponse, rolesResponse] = await Promise.all([fetch('/api/admin/users'), fetch('/api/admin/roles')]);
    const usersPayload = await usersResponse.json();
    const rolesPayload = await rolesResponse.json();
    if (usersPayload.success) setUsers(usersPayload.data);
    if (rolesPayload.success) setRoles(rolesPayload.data);
  };
  useEffect(() => { load().catch(() => setMessage('Khong the tai du lieu tai khoan.')); }, []);

  const toggleOverride = (permission: AdminPermission, kind: 'grant' | 'revoke') => {
    setDraft((current) => {
      const other = kind === 'grant' ? 'revoke' : 'grant';
      const selected = current[kind].includes(permission) ? current[kind].filter((item) => item !== permission) : [...current[kind], permission];
      return { ...current, [kind]: selected, [other]: current[other].filter((item) => item !== permission) };
    });
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true); setMessage('');
    try {
      const response = await fetch(editingId ? `/api/admin/users/${editingId}` : '/api/admin/users', {
        method: editingId ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json', Origin: window.location.origin },
        body: JSON.stringify({ ...draft, overrides: { grant: draft.grant, revoke: draft.revoke } }),
      });
      const payload = await response.json();
      if (!response.ok || !payload.success) throw new Error(payload?.error?.message || 'Khong the luu tai khoan');
      setDraft(emptyDraft); setEditingId(null); await load(); setMessage('Da luu tai khoan admin.');
    } catch (reason) { setMessage(reason instanceof Error ? reason.message : 'Khong the luu tai khoan'); }
    finally { setLoading(false); }
  };

  const edit = (user: User) => {
    setEditingId(user.id);
    setDraft({ email: user.email, name: user.name, role: user.role, password: '', status: user.status, grant: user.overrides.grant || [], revoke: user.overrides.revoke || [] });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const resetPassword = async (user: User) => {
    const password = window.prompt(`Mat khau tam thoi moi cho ${user.email} (toi thieu 12 ky tu):`);
    if (!password) return;
    const response = await fetch(`/api/admin/users/${user.id}/reset-password`, { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: window.location.origin }, body: JSON.stringify({ password }) });
    const payload = await response.json();
    setMessage(response.ok && payload.success ? 'Da dat lai mat khau va revoke cac phien cu.' : payload?.error?.message || 'Khong the dat lai mat khau');
    if (response.ok) await load();
  };

  return <div className="mx-auto max-w-7xl space-y-6">
    <div><p className="text-xs font-mono text-red-400">ACCESS CONTROL</p><h1 className="text-2xl font-black text-white">Tai khoan admin</h1><p className="mt-1 text-sm text-gray-400">Tao, khoa va cap quyen theo vai tro cho nguoi quan tri.</p></div>
    <form onSubmit={submit} className="rounded-xl border border-gray-800 bg-gray-950/50 p-5 space-y-5">
      <div className="flex items-center justify-between"><h2 className="font-bold text-white">{editingId ? 'Cap nhat tai khoan' : 'Tao tai khoan moi'}</h2>{editingId ? <button type="button" onClick={() => { setEditingId(null); setDraft(emptyDraft); }} className="text-xs text-gray-400 hover:text-white">Huy sua</button> : null}</div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <input value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} placeholder="Ho ten" required className="rounded-lg border border-gray-700 bg-black/40 px-3 py-2.5 text-sm outline-none focus:border-red-500" />
        <input value={draft.email} onChange={(event) => setDraft({ ...draft, email: event.target.value })} placeholder="Email" type="email" required disabled={editingId !== null} className="rounded-lg border border-gray-700 bg-black/40 px-3 py-2.5 text-sm outline-none focus:border-red-500 disabled:opacity-50" />
        <select value={draft.role} onChange={(event) => setDraft({ ...draft, role: event.target.value })} className="rounded-lg border border-gray-700 bg-black/40 px-3 py-2.5 text-sm outline-none focus:border-red-500">{roles.map((role) => <option key={role.code} value={role.code}>{role.name}</option>)}</select>
        {editingId ? <label className="flex items-center gap-2 rounded-lg border border-gray-700 px-3 py-2.5 text-sm"><input checked={draft.status} onChange={(event) => setDraft({ ...draft, status: event.target.checked })} type="checkbox" />Tai khoan hoat dong</label> : <input value={draft.password} onChange={(event) => setDraft({ ...draft, password: event.target.value })} placeholder="Mat khau tam thoi (>=12)" type="password" required className="rounded-lg border border-gray-700 bg-black/40 px-3 py-2.5 text-sm outline-none focus:border-red-500" />}
      </div>
      <details className="rounded-lg border border-gray-800 bg-black/20 p-3"><summary className="cursor-pointer text-sm font-medium text-gray-300">Override quyen rieng (tuy chon)</summary><div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">{PERMISSION_DEFINITIONS.filter((item) => !item.systemOnly).map((definition) => <div key={definition.resource} className="rounded border border-gray-800 p-3"><p className="mb-2 text-xs font-bold text-gray-300">{definition.label}</p>{definition.actions.map((action) => { const permission = `${definition.resource}.${action}` as AdminPermission; return <div key={permission} className="flex items-center gap-3 text-xs text-gray-400"><label><input type="checkbox" checked={draft.grant.includes(permission)} onChange={() => toggleOverride(permission, 'grant')} /> Cap</label><label><input type="checkbox" checked={draft.revoke.includes(permission)} onChange={() => toggleOverride(permission, 'revoke')} /> Thu</label><span>{action}</span></div>; })}</div>)}</div></details>
      {message ? <p role="status" className="text-sm text-red-300">{message}</p> : null}
      <button disabled={loading} className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-red-500 disabled:opacity-60"><Plus className="h-4 w-4" />{loading ? 'Dang luu...' : editingId ? 'Luu thay doi' : 'Tao tai khoan'}</button>
    </form>
    <div className="overflow-hidden rounded-xl border border-gray-800 bg-gray-950/50"><table className="w-full text-left text-sm"><thead className="bg-black/30 text-xs uppercase text-gray-500"><tr><th className="p-3">Tai khoan</th><th className="p-3">Vai tro</th><th className="p-3">Trang thai</th><th className="p-3 text-right">Thao tac</th></tr></thead><tbody className="divide-y divide-gray-800">{users.map((user) => <tr key={user.id}><td className="p-3"><p className="font-medium text-white">{user.name}</p><p className="text-xs text-gray-500">{user.email}</p></td><td className="p-3 text-gray-300">{user.role}</td><td className="p-3"><span className={user.status ? 'text-emerald-400' : 'text-red-400'}>{user.status ? 'Hoat dong' : 'Da khoa'}</span>{user.mustChangePassword ? <p className="text-xs text-amber-400">Can doi mat khau</p> : null}</td><td className="p-3"><div className="flex justify-end gap-2"><button onClick={() => edit(user)} className="rounded p-2 text-blue-400 hover:bg-blue-500/10" title="Sua"><Pencil className="h-4 w-4" /></button><button onClick={() => resetPassword(user)} className="rounded p-2 text-amber-400 hover:bg-amber-500/10" title="Dat lai mat khau"><KeyRound className="h-4 w-4" /></button><button onClick={() => edit({ ...user, status: false })} className="rounded p-2 text-red-400 hover:bg-red-500/10" title="Khoa"><UserX className="h-4 w-4" /></button></div></td></tr>)}</tbody></table></div>
  </div>;
}
