'use client';

import { useEffect, useState } from 'react';

type AuditLog = { id: number; action: string; resource: string; resourceId: string; actor: { email: string; name: string } | null; method: string; path: string; ipAddress: string; createdAt: string };

export default function AdminAuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [error, setError] = useState('');
  useEffect(() => { fetch('/api/admin/audit-logs?limit=100').then(async (response) => { const payload = await response.json(); if (!response.ok || !payload.success) throw new Error(payload?.error?.message || 'Khong the tai nhat ky'); setLogs(payload.data); }).catch((reason) => setError(reason instanceof Error ? reason.message : 'Khong the tai nhat ky')); }, []);
  return <div className="mx-auto max-w-7xl space-y-6"><div><p className="text-xs font-mono text-red-400">AUDIT TRAIL</p><h1 className="text-2xl font-black text-white">Nhat ky admin</h1><p className="mt-1 text-sm text-gray-400">100 su kien gan nhat, khong luu mat khau hoac session token.</p></div>{error ? <p className="text-red-300">{error}</p> : null}<div className="overflow-x-auto rounded-xl border border-gray-800 bg-gray-950/50"><table className="w-full min-w-[900px] text-left text-sm"><thead className="bg-black/30 text-xs uppercase text-gray-500"><tr><th className="p-3">Thoi gian</th><th className="p-3">Nguoi thuc hien</th><th className="p-3">Hanh dong</th><th className="p-3">Request</th><th className="p-3">IP</th></tr></thead><tbody className="divide-y divide-gray-800">{logs.map((log) => <tr key={log.id}><td className="p-3 text-gray-400">{log.createdAt}</td><td className="p-3"><p className="text-gray-200">{log.actor?.name || 'He thong'}</p><p className="text-xs text-gray-500">{log.actor?.email || ''}</p></td><td className="p-3"><p className="font-mono text-red-300">{log.action}</p><p className="text-xs text-gray-500">{log.resource} {log.resourceId}</p></td><td className="p-3 font-mono text-xs text-gray-400">{log.method} {log.path}</td><td className="p-3 text-gray-500">{log.ipAddress}</td></tr>)}</tbody></table></div></div>;
}
