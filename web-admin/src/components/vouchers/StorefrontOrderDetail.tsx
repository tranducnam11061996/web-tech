'use client';

import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

const money = (value: number) => `${new Intl.NumberFormat('vi-VN').format(value || 0)}đ`;

export function StorefrontOrderDetail() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [order, setOrder] = useState<any>(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const response = await fetch(`/api/admin/storefront-orders/${id}`);
    const result = await response.json();
    if (result.success) setOrder(result.data);
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  const patch = async (body: any) => {
    setBusy(true);
    const response = await fetch(`/api/admin/storefront-orders/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const result = await response.json();
    if (result.success) setOrder(result.data);
    setBusy(false);
  };

  if (!order) {
    return <div className="p-8 text-slate-400">Đang tải đơn hàng...</div>;
  }

  const delivery = order.delivery || {};
  const customer = order.customer || {};

  return (
    <section className="space-y-4">
      <button onClick={() => router.push('/sales/orders')} className="text-sm text-cyan-300 hover:text-cyan-200">
        ← Danh sách đơn hàng
      </button>

      <header className="rounded-xl border border-slate-700/80 bg-slate-950/70 p-5">
        <h1 className="text-2xl font-bold text-white">Đơn hàng #{order.id}</h1>
        <p className="mt-2 text-sm text-slate-300">
          {new Date(order.createTime * 1000).toLocaleString('vi-VN')} ·{' '}
          <span className="font-medium text-blue-300">{order.statusLabel}</span>
        </p>
      </header>
      {order.orderType === 'combo' && (
        <section className="rounded-xl border border-fuchsia-500/50 bg-fuchsia-950/30 p-5 text-fuchsia-100">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-fuchsia-300">Đơn hàng combo</p>
          <h2 className="mt-2 text-xl font-bold">{order.combo?.set?.title || `Combo set #${order.meta.comboSetId}`}</h2>
          <p className="mt-1 text-sm">Sản phẩm chính: {order.combo?.anchor?.name || `#${order.meta.comboAnchorProductId}`}</p>
        </section>
      )}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,2fr)_360px]">
        <main className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <section className="rounded-xl border border-cyan-900/70 bg-cyan-950/20 p-5">
              <h2 className="font-bold text-cyan-100">Khách hàng</h2>
              <p className="mt-3 text-white">{customer.name || 'Chưa có thông tin'}</p>
              <p className="text-sm text-slate-300">{customer.phone || '—'} · {customer.email || '—'}</p>
            </section>

            <section className="rounded-xl border border-indigo-900/70 bg-indigo-950/20 p-5">
              <h2 className="font-bold text-indigo-100">Địa chỉ giao hàng</h2>
              <p className="mt-3 text-sm text-slate-200">
                {[delivery.address, delivery.ward, delivery.province].filter(Boolean).join(', ') || 'Chưa có thông tin'}
              </p>
              <p className="mt-1 text-xs text-slate-400">
                {delivery.method || '—'} {delivery.note ? `· ${delivery.note}` : ''}
              </p>
            </section>
          </div>

          <section className="overflow-x-auto rounded-xl border border-blue-900/70 bg-blue-950/20">
            <table className="min-w-[650px] w-full text-sm">
              <thead className="border-y border-blue-900/60 bg-blue-950/50 text-xs text-blue-200/80">
                <tr>
                  <th className="p-3 text-left">Sản phẩm</th>
                  <th className="p-3 text-right">Giá</th>
                  <th className="p-3 text-center">SL</th>
                  <th className="p-3 text-right">Tổng</th>
                </tr>
              </thead>
              <tbody>
                {order.items.map((item: any) => (
                  <tr
                    key={item.productId}
                    className="border-b border-blue-950/70 odd:bg-slate-950/45 even:bg-blue-950/25 transition-colors hover:bg-blue-900/25"
                  >
                    <td className="p-3 text-white">
                      {item.title}
                      <p className="text-xs text-slate-400">{item.sku || item.productId}</p>
                    </td>
                    <td className="p-3 text-right text-slate-100">{money(item.price)}</td>
                    <td className="p-3 text-center text-slate-100">{item.quantity}</td>
                    <td className="p-3 text-right font-semibold text-white">{money(item.lineTotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section className="rounded-xl border border-emerald-900/70 bg-emerald-950/20 p-5">
            <h2 className="font-bold text-emerald-100">Số tiền</h2>
            <div className="mt-3 space-y-2 text-sm text-slate-200">
              <p className="flex justify-between gap-4"><span>Tổng sản phẩm</span><b>{money(order.totals.subtotal || order.totalValue)}</b></p>
              {order.voucher ? (
                <p className="flex justify-between gap-4 text-emerald-300">
                  <span>Voucher {order.voucher.code}</span><b>-{money(order.voucher.discount)}</b>
                </p>
              ) : null}
              {order.orderType === 'combo' ? (
                <p className="flex justify-between gap-4 text-fuchsia-300"><span>Giảm combo</span><b>-{money(order.totals.comboDiscount || 0)}</b></p>
              ) : null}
              <p className="flex justify-between gap-4 border-t border-emerald-900/60 pt-3 text-base text-white">
                <span>Cần thanh toán</span><b>{money(order.totalValue)}</b>
              </p>
            </div>
          </section>

          <section className="rounded-xl border border-amber-900/70 bg-amber-950/20 p-5">
            <h2 className="font-bold text-amber-100">Lịch sử cập nhật</h2>
            <div className="mt-3 space-y-3">
              {order.events.map((event: any) => (
                <div key={event.id} className="rounded-lg border border-amber-900/45 bg-amber-950/20 p-3 text-sm">
                  <p className="text-slate-100">{event.type}: {event.to || event.note}</p>
                  <p className="mt-1 text-xs text-slate-400">
                    {event.actor} · {new Date(event.createdAt).toLocaleString('vi-VN')}
                  </p>
                </div>
              ))}
            </div>
          </section>
        </main>

        <aside className="space-y-4">
          <section className="space-y-4 rounded-xl border border-violet-900/70 bg-violet-950/20 p-5">
            <h2 className="font-bold text-violet-100">Vận hành đơn hàng</h2>
            <label className="block text-sm text-violet-200">
              Nhân sự
              <select
                disabled={busy}
                value={order.meta.assignedAdminUserId || ''}
                onChange={(event) => void patch({ assigneeId: event.target.value })}
                className="mt-1 w-full rounded-md border border-violet-900/70 bg-slate-950/80 p-2 text-white outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/25"
              >
                <option value="">Chưa phân công</option>
                {order.admins.map((admin: any) => <option key={admin.id} value={admin.id}>{admin.name}</option>)}
              </select>
            </label>
            <label className="block text-sm text-violet-200">
              Thanh toán
              <select
                disabled={busy}
                value={order.meta.paymentStatus}
                onChange={(event) => void patch({ paymentStatus: event.target.value })}
                className="mt-1 w-full rounded-md border border-violet-900/70 bg-slate-950/80 p-2 text-white outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/25"
              >
                {['unpaid', 'paid', 'refunded'].map((status) => <option key={status}>{status}</option>)}
              </select>
            </label>
            <label className="block text-sm text-violet-200">
              Vận chuyển
              <select
                disabled={busy}
                value={order.meta.shippingStatus}
                onChange={(event) => void patch({ shippingStatus: event.target.value })}
                className="mt-1 w-full rounded-md border border-violet-900/70 bg-slate-950/80 p-2 text-white outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/25"
              >
                {['pending', 'packing', 'shipped', 'delivered', 'returned'].map((status) => <option key={status}>{status}</option>)}
              </select>
            </label>
            <label className="block text-sm text-violet-200">
              Trạng thái đơn
              <select
                disabled={busy || [3, 4, 5].includes(order.status)}
                value={order.status}
                onChange={(event) => void patch({ orderStatus: event.target.value })}
                className="mt-1 w-full rounded-md border border-violet-900/70 bg-slate-950/80 p-2 text-white outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/25"
              >
                {[[1, 'Chờ xử lý'], [2, 'Xác nhận'], [3, 'Hoàn tất'], [4, 'Thất bại'], [5, 'Đã hủy']].map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </label>
            <textarea
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Ghi chú nội bộ"
              className="min-h-24 w-full rounded-md border border-violet-900/70 bg-slate-950/80 p-2 text-sm text-white outline-none placeholder:text-slate-500 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/25"
            />
            <button
              disabled={!note.trim() || busy}
              onClick={() => { void patch({ note }); setNote(''); }}
              className="w-full rounded bg-blue-600 py-2 text-sm font-semibold text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Lưu ghi chú
            </button>
          </section>
        </aside>
      </div>
    </section>
  );
}
