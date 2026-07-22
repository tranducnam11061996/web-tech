"use client";

import Image from "next/image";
import {
  AlertTriangle,
  FileSpreadsheet,
  ImageDown,
  Loader2,
  Minus,
  Pencil,
  Plus,
  Printer,
  RotateCcw,
  Save,
  Share2,
  ShoppingCart,
  Trash2,
} from "lucide-react";
import {
  formatPcPrice,
  type PcBuilderQuote,
  type PcBuilderSelection,
} from "@/lib/pcBuilder";

export type PcBuilderViewComponent = {
  code: string;
  name: string;
  required: boolean;
  minSelections: number;
  maxSelections: number;
  ordering: number;
};

type Props = {
  components: PcBuilderViewComponent[];
  selections: PcBuilderSelection[];
  quote: PcBuilderQuote | null;
  quoteLoading: boolean;
  visibleSelectionCount: number;
  exporting: "excel" | "png" | null;
  onChoose: (componentCode: string, opener: HTMLElement) => void;
  onRemove: (componentCode: string, productId: number) => void;
  onQuantity: (componentCode: string, productId: number, quantity: number) => void;
  onReset: () => void;
  onSave: () => void;
  onExcel: () => void;
  onPng: () => void;
  onShare: () => void;
  onAddCart: () => void;
  onCheckout: () => void;
};

const faqs = [
  [
    "Build PC là gì và khi nào nên chọn build PC thay vì mua máy bộ?",
    "Build PC là quá trình tự lựa chọn và lắp ráp CPU, mainboard, RAM, VGA, SSD, nguồn và case theo đúng nhu cầu. Cách này phù hợp khi bạn muốn tối ưu hiệu năng, ngân sách và khả năng nâng cấp lâu dài.",
  ],
  [
    "Build PC gồm những linh kiện nào bắt buộc phải có?",
    "Một cấu hình cơ bản thường cần CPU, mainboard, RAM, bộ lưu trữ, nguồn và case. Các dòng được đánh dấu Bắt buộc trong bảng do quản trị viên cấu hình và hệ thống sẽ cảnh báo nếu còn thiếu.",
  ],
  [
    "Nên build PC theo nhu cầu hay theo ngân sách sẽ hiệu quả hơn?",
    "Hãy xác định ứng dụng chính trước, sau đó phân bổ ngân sách cho linh kiện ảnh hưởng trực tiếp đến công việc đó. Bộ lọc và kiểm tra tương thích sẽ giúp thu hẹp lựa chọn phù hợp.",
  ],
  [
    "Build PC theo các mức ngân sách 10 – 20 – 30 triệu khác nhau như thế nào?",
    "Mỗi mức ngân sách thay đổi ưu tiên giữa CPU, GPU, dung lượng RAM và khả năng nâng cấp. Giá trên trang luôn được báo lại theo catalog hiện hành trước khi đặt hàng.",
  ],
  [
    "Nên tự build PC hay chọn dịch vụ build PC trọn gói?",
    "Bạn có thể tự chọn từng linh kiện trên trang và dùng dịch vụ lắp ráp. Đội ngũ kỹ thuật sẽ kiểm tra lại cấu hình, lắp đặt và hỗ trợ bảo hành theo từng sản phẩm.",
  ],
  [
    "Build PC có cần quan tâm đến case và tản nhiệt không?",
    "Có. Case quyết định không gian lắp đặt và luồng gió; tản nhiệt cần phù hợp socket, công suất CPU và kích thước bên trong case.",
  ],
] as const;

export default function PcBuilderV5View({
  components,
  selections,
  quote,
  quoteLoading,
  visibleSelectionCount,
  exporting,
  onChoose,
  onRemove,
  onQuantity,
  onReset,
  onSave,
  onExcel,
  onPng,
  onShare,
  onAddCart,
  onCheckout,
}: Props) {
  const quoteItems = new Map(
    (quote?.items || []).map((item) => [
      `${item.componentCode}:${item.productId}`,
      item,
    ]),
  );
  const promotions = (quote?.items || []).filter(
    (item) => item.buildPriceApplied || (item.promotion && item.lineDiscount > 0),
  );
  const requiredComponents = components.filter((component) => component.required);
  const satisfiedRequiredCount = requiredComponents.filter((component) =>
    selections.filter((selection) => selection.componentCode === component.code).length >= component.minSelections,
  ).length;
  const canUseQuote = Boolean(quote?.compatible && !quoteLoading);

  return (
    <>
      <section aria-labelledby="pc-builder-title" className="pc-builder-v5">
        <header className="mb-4 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[.22em] text-red-400">
              PC Builder Manual
            </p>
            <h1 id="pc-builder-title" className="mt-1 text-2xl font-black sm:text-3xl">
              Xây dựng cấu hình PC
            </h1>
            <p className={`mt-2 text-xs font-bold ${quote?.buildPriceEligible ? "text-emerald-400" : "text-amber-300"}`} aria-live="polite">
              {quote?.buildPriceEligible
                ? `Đã đủ ${requiredComponents.length}/${requiredComponents.length} nhóm bắt buộc · Giá Build PC đang được áp dụng`
                : `Đã đủ ${satisfiedRequiredCount}/${requiredComponents.length} nhóm bắt buộc · Hoàn thiện cấu hình để nhận giá Build PC`}
            </p>
          </div>
          <button
            type="button"
            onClick={onReset}
            disabled={!selections.length}
            className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-white/10 px-4 text-sm font-bold text-zinc-300 hover:bg-white/5 disabled:opacity-40"
          >
            <RotateCcw className="h-4 w-4" /> Làm lại cấu hình
          </button>
        </header>

        <div className="overflow-hidden rounded-xl border border-white/10 bg-[#141417] shadow-2xl shadow-black/20">
          <div className="hidden grid-cols-[230px_minmax(0,1fr)] border-b border-white/10 bg-[#1a1a1f] px-4 py-3 text-xs font-black uppercase tracking-wider text-zinc-500 md:grid">
            <span>Danh mục</span>
            <span>Linh kiện đã chọn</span>
          </div>
          {components.map((component, index) => {
            const selected = selections.filter(
              (selection) => selection.componentCode === component.code,
            );
            const canAddMore = selected.length < component.maxSelections;
            return (
              <article
                key={component.code}
                className="grid border-b border-white/[.07] last:border-b-0 md:grid-cols-[230px_minmax(0,1fr)] md:even:bg-white/[.018]"
              >
                <div className="flex items-center gap-3 border-b border-white/[.06] bg-[#18181c] px-4 py-3 md:border-b-0 md:border-r md:border-white/[.07] md:bg-transparent">
                  <span className="text-xs font-black tabular-nums text-zinc-500">
                    {index + 1}.
                  </span>
                  <div>
                    <h2 className="text-sm font-black text-zinc-100">{component.name}</h2>
                    <p className="mt-0.5 text-[11px] text-zinc-500">
                      {component.required ? "Bắt buộc" : "Tùy chọn"} · tối đa {component.maxSelections} SKU
                    </p>
                  </div>
                </div>
                <div className="min-w-0">
                  {selected.length ? (
                    <div>
                      {selected.map((selection) => {
                        const item = quoteItems.get(
                          `${component.code}:${selection.productId}`,
                        );
                        return (
                          <div
                            key={selection.productId}
                            className="grid gap-3 border-b border-white/[.055] p-3 last:border-b-0 sm:grid-cols-[72px_minmax(0,1fr)] lg:grid-cols-[72px_minmax(280px,1fr)_125px_126px_130px_76px] lg:items-center"
                          >
                            <div className="relative h-[72px] w-[72px] overflow-hidden rounded-lg bg-white p-1">
                              {item?.thumbnail ? (
                                <Image
                                  src={item.thumbnail}
                                  alt=""
                                  fill
                                  sizes="72px"
                                  className="object-contain p-1"
                                />
                              ) : (
                                <div className="grid h-full place-items-center text-xs text-zinc-400">#{selection.productId}</div>
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="line-clamp-2 text-sm font-bold leading-5 text-zinc-100">
                                {item?.name || `Sản phẩm #${selection.productId}`}
                              </p>
                              <div className="mt-1 space-y-0.5 text-[11px] leading-4 text-zinc-500">
                                <p>Mã SP: {item?.sku || "Đang kiểm tra"}</p>
                                <p>Bảo hành: {item?.warranty || "Theo chính sách sản phẩm"}</p>
                                <p className="font-semibold text-emerald-400">Có thể đặt hàng</p>
                              </div>
                            </div>
                            <div className="text-sm lg:text-right">
                              <span className="mr-2 text-xs text-zinc-500 lg:hidden">Đơn giá</span>
                              <strong className="tabular-nums text-zinc-200">
                                {item ? formatPcPrice(item.price) : "—"}
                              </strong>
                              {item && item.regularPrice > item.price ? (
                                <p className="text-[11px] text-zinc-600 line-through">
                                  {formatPcPrice(item.regularPrice)}
                                </p>
                              ) : null}
                              {item?.buildPcPrice ? (
                                <p className={`mt-1 text-[11px] font-bold ${item.buildPriceApplied ? "text-emerald-400" : "text-cyan-300"}`}>
                                  {item.buildPriceApplied
                                    ? `Giá Build PC đang áp dụng: ${formatPcPrice(item.buildPcPrice)}`
                                    : `Giá Build PC khi đủ bộ: ${formatPcPrice(item.buildPcPrice)}`}
                                </p>
                              ) : null}
                            </div>
                            <div
                              className="inline-grid h-9 w-[126px] grid-cols-3 overflow-hidden rounded-md border border-white/10 bg-[#101013]"
                              role="group"
                              aria-label={`Số lượng ${item?.name || selection.productId}`}
                            >
                              <button
                                type="button"
                                onClick={() => onQuantity(component.code, selection.productId, selection.quantity - 1)}
                                disabled={selection.quantity <= 1}
                                aria-label="Giảm số lượng"
                                className="grid place-items-center hover:bg-white/5 disabled:text-zinc-700"
                              >
                                <Minus className="h-3.5 w-3.5" />
                              </button>
                              <output className="grid place-items-center border-x border-white/10 text-sm font-bold tabular-nums">
                                {selection.quantity}
                              </output>
                              <button
                                type="button"
                                onClick={() => onQuantity(component.code, selection.productId, selection.quantity + 1)}
                                disabled={selection.quantity >= 4}
                                aria-label="Tăng số lượng"
                                className="grid place-items-center hover:bg-white/5 disabled:text-zinc-700"
                              >
                                <Plus className="h-3.5 w-3.5" />
                              </button>
                            </div>
                            <div className="text-sm font-black tabular-nums text-red-400 lg:text-right">
                              <span className="mr-2 text-xs font-normal text-zinc-500 lg:hidden">Thành tiền</span>
                              {item ? formatPcPrice(item.lineTotal) : "Đang báo giá"}
                            </div>
                            <div className="flex justify-end gap-1">
                              <button
                                type="button"
                                onClick={(event) => onChoose(component.code, event.currentTarget)}
                                aria-label={`Thay ${item?.name || "sản phẩm"}`}
                                className="grid h-9 w-9 place-items-center rounded-md text-blue-400 hover:bg-blue-500/10"
                              >
                                <Pencil className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => onRemove(component.code, selection.productId)}
                                aria-label={`Xóa ${item?.name || "sản phẩm"}`}
                                className="grid h-9 w-9 place-items-center rounded-md text-red-400 hover:bg-red-500/10"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                      {component.maxSelections > 1 && canAddMore ? (
                        <div className="px-3 pb-3">
                          <button
                            type="button"
                            onClick={(event) => onChoose(component.code, event.currentTarget)}
                            className="inline-flex min-h-9 items-center gap-2 rounded-md bg-[#223b78] px-3 text-xs font-black text-blue-50 hover:bg-[#2b4b96]"
                          >
                            <Plus className="h-3.5 w-3.5" /> Chọn thêm {component.name} khác
                          </button>
                        </div>
                      ) : null}
                    </div>
                  ) : (
                    <div className="flex min-h-[76px] items-center px-3 py-3">
                      <button
                        type="button"
                        onClick={(event) => onChoose(component.code, event.currentTarget)}
                        className="inline-flex min-h-10 items-center gap-2 rounded-md bg-red-600 px-4 text-sm font-black text-white hover:bg-red-500"
                      >
                        <Plus className="h-4 w-4" /> Chọn {component.name}
                      </button>
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </div>

        <section
          id="pc-builder-v5-summary"
          aria-labelledby="pc-builder-summary-title"
          className="mt-5 ml-auto w-full max-w-[470px] rounded-xl border border-white/10 bg-[#161619] p-5"
        >
          <div className="flex items-center justify-between gap-3">
            <h2 id="pc-builder-summary-title" className="text-lg font-black">Tóm tắt đơn hàng</h2>
            {quoteLoading ? <Loader2 className="h-4 w-4 animate-spin text-zinc-500" aria-label="Đang cập nhật báo giá" /> : null}
          </div>
          {promotions.length ? (
            <div className="mt-4">
              <p className="mb-2 text-xs font-bold text-zinc-400">Ưu đãi Build PC đang áp dụng</p>
              <div className="overflow-hidden rounded-lg border border-white/10">
                {promotions.map((item) => (
                  <div key={`${item.componentCode}:${item.productId}`} className="grid grid-cols-[1fr_auto] gap-3 border-b border-white/[.07] px-3 py-2.5 text-xs last:border-b-0">
                    <span className="line-clamp-2 text-zinc-300">{item.name}<br /><em className="text-zinc-500">{item.buildPriceApplied ? "Giá Build PC theo SKU" : item.promotion?.name}</em></span>
                    <strong className="tabular-nums text-red-400">
                      {item.lineDiscount > 0 ? `Giảm ${formatPcPrice(item.lineDiscount)}` : formatPcPrice(item.price)}
                    </strong>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
          <dl className="mt-4 space-y-3 border-b border-white/10 pb-4 text-sm">
            <div className="flex justify-between gap-4 text-zinc-400">
              <dt>{quote?.totals.itemCount ?? visibleSelectionCount} linh kiện</dt>
              <dd className="tabular-nums">{formatPcPrice(quote?.totals.cartSubtotal || 0)}</dd>
            </div>
            {quote?.totals.buildDiscount ? (
              <div className="flex justify-between gap-4 text-emerald-400">
                <dt>Giảm giá Build PC</dt>
                <dd className="font-bold tabular-nums">-{formatPcPrice(quote.totals.buildDiscount)}</dd>
              </div>
            ) : null}
            <div className="flex justify-between gap-4 text-zinc-400">
              <dt>Phí lắp ráp</dt>
              <dd className="font-bold text-emerald-400">Miễn phí</dd>
            </div>
          </dl>
          <div className="flex items-end justify-between gap-4 py-4">
            <span className="font-black">Tổng tiền thanh toán</span>
            <strong className="text-2xl font-black tabular-nums text-red-500">{formatPcPrice(quote?.totals.total || 0)}</strong>
          </div>
          {quote?.diagnostics.length ? (
            <div className="mb-4 max-h-44 space-y-2 overflow-y-auto" aria-live="polite">
              {quote.diagnostics.map((diagnostic) => (
                <div key={`${diagnostic.ruleCode}:${diagnostic.componentCodes.join("-")}`} className={`flex gap-2 rounded-lg border p-2.5 text-xs ${diagnostic.severity === "error" ? "border-red-500/25 bg-red-500/10 text-red-100" : "border-amber-500/25 bg-amber-500/10 text-amber-100"}`}>
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {diagnostic.message}
                </div>
              ))}
            </div>
          ) : null}
          <div className="grid gap-2 sm:grid-cols-2">
            <button type="button" onClick={onAddCart} disabled={!canUseQuote} className="min-h-11 rounded-md border border-white/10 bg-white/[.035] px-3 text-sm font-black hover:bg-white/[.07] disabled:opacity-40">
              Thêm vào giỏ hàng
            </button>
            <button type="button" onClick={onCheckout} disabled={!canUseQuote} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-red-600 px-3 text-sm font-black hover:bg-red-500 disabled:opacity-40">
              Đặt hàng ngay <ShoppingCart className="h-4 w-4" />
            </button>
          </div>
          <p className="mt-3 text-[11px] leading-5 text-zinc-500">
            Khi thêm vào giỏ thường, sản phẩm được báo lại theo giá thường/Flash Sale và không giữ ưu đãi Build PC. Đặt hàng ngay sẽ giữ ngữ cảnh cấu hình và ưu đãi hiện hành.
          </p>
        </section>

        <nav aria-label="Thao tác cấu hình" className="mt-8 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
          <ActionButton icon={<Save />} label="Lưu cấu hình" onClick={onSave} disabled={!canUseQuote} />
          <ActionButton icon={exporting === "excel" ? <Loader2 className="animate-spin" /> : <FileSpreadsheet />} label="Tải file Excel" onClick={onExcel} disabled={!canUseQuote || exporting !== null} />
          <ActionButton icon={exporting === "png" ? <Loader2 className="animate-spin" /> : <ImageDown />} label="Tải ảnh cấu hình" onClick={onPng} disabled={!canUseQuote || exporting !== null} />
          <ActionButton icon={<Share2 />} label="Chia sẻ cấu hình" onClick={onShare} disabled={!canUseQuote} navy />
          <ActionButton icon={<Printer />} label="Xem & In" onClick={() => window.print()} disabled={!canUseQuote} />
        </nav>
      </section>

      <section className="mx-auto mt-16 max-w-[1180px] border-t border-white/10 pt-10">
        <h2 className="text-xl font-black sm:text-2xl">1. Giới thiệu về Build PC và xu hướng hiện nay</h2>
        <h3 className="mt-5 font-black">Build PC là gì?</h3>
        <blockquote className="mt-3 rounded-r-lg border-l-4 border-blue-500 bg-blue-500/10 px-4 py-3 text-sm italic leading-6 text-blue-100">
          Build PC là quá trình tự lựa chọn, mua và lắp ghép các linh kiện máy tính riêng lẻ để tạo thành một bộ máy hoàn chỉnh, phù hợp chính xác với nhu cầu và ngân sách.
        </blockquote>
        <picture className="mt-6 block overflow-hidden rounded-xl border border-white/10 bg-[#111318]">
          <source srcSet="/images/pc-builder/build-pc-studio-v1.avif" type="image/avif" />
          <source srcSet="/images/pc-builder/build-pc-studio-v1.webp" type="image/webp" />
          <Image src="/images/pc-builder/build-pc-studio-v1.webp" alt="Kỹ thuật viên TrucTiepGAME bên cấu hình PC gaming đang hoàn thiện" width={1600} height={900} className="aspect-video h-auto w-full object-cover" />
        </picture>
        <details className="group mt-4 text-sm leading-7 text-zinc-400">
          <summary className="mx-auto flex min-h-10 w-fit cursor-pointer list-none items-center gap-2 rounded-md bg-blue-600 px-5 font-bold text-white hover:bg-blue-500">
            <span className="group-open:hidden">Xem thêm</span><span className="hidden group-open:inline">Thu gọn</span>
          </summary>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <p>Tự build PC giúp người dùng chủ động ưu tiên hiệu năng chơi game, đồ họa, lập trình hoặc làm việc chuyên sâu. Từng linh kiện có thể được nâng cấp độc lập khi nhu cầu thay đổi.</p>
            <p>PC Builder của TrucTiepGAME sử dụng catalog đang bán và báo giá lại ở mỗi thay đổi. Quan hệ thuộc tính giữa các nhóm linh kiện giúp loại sớm những lựa chọn không tương thích.</p>
          </div>
        </details>
      </section>

      <section className="mx-auto mt-12 max-w-[1180px]">
        <h2 className="mb-5 text-xl font-black sm:text-2xl">Build PC và những câu hỏi thường gặp</h2>
        <div className="space-y-2">
          {faqs.map(([question, answer], index) => (
            <details key={question} open={index === 0} className="group rounded-xl border border-white/10 bg-[#151518] px-4 py-1 open:bg-[#19191d]">
              <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-4 py-3 text-sm font-black marker:hidden">
                <span>{index + 1}. {question}</span>
                <span className="text-zinc-500 transition-transform group-open:rotate-180">⌄</span>
              </summary>
              <div className="mb-4 border-l-2 border-blue-500 bg-black/20 px-4 py-3 text-sm leading-6 text-zinc-400">{answer}</div>
            </details>
          ))}
        </div>
      </section>

      <section className="pc-builder-print-sheet" data-pc-builder-print aria-hidden="true">
        <h1>CẤU HÌNH PC TRỰCTIẾPGAME</h1>
        <p>Ngày xuất: {new Intl.DateTimeFormat("vi-VN").format(new Date())}</p>
        <table>
          <thead><tr><th>Danh mục</th><th>Linh kiện</th><th>SL</th><th>Thành tiền</th></tr></thead>
          <tbody>
            {(quote?.items || []).map((item) => (
              <tr key={`${item.componentCode}:${item.productId}`}><td>{components.find((component) => component.code === item.componentCode)?.name || item.componentCode}</td><td>{item.name}<br /><small>{item.sku}</small></td><td>{item.quantity}</td><td>{formatPcPrice(item.lineTotal)}</td></tr>
            ))}
          </tbody>
        </table>
        <div className="print-total"><span>Tổng thanh toán</span><strong>{formatPcPrice(quote?.totals.total || 0)}</strong></div>
      </section>
    </>
  );
}

function ActionButton({ icon, label, onClick, disabled, navy = false }: { icon: React.ReactNode; label: string; onClick: () => void; disabled: boolean; navy?: boolean }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-md px-3 text-sm font-black text-white disabled:opacity-40 ${navy ? "bg-[#223b78] hover:bg-[#2b4b96]" : "bg-red-600 hover:bg-red-500"}`}>
      <span className="[&>svg]:h-4 [&>svg]:w-4">{icon}</span>{label}
    </button>
  );
}
