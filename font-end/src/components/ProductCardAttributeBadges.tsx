export type ProductCardAttributeBadge = {
  id?: string;
  attributeId?: number;
  attributeCode?: string;
  valueId?: number;
  text: string;
  slot: 'image_top_left' | 'image_bottom_center';
  colorVariant?: 'red' | 'blue' | 'cyan' | 'green' | 'amber' | 'purple' | 'slate';
  ordering?: number;
};

const colorClasses: Record<NonNullable<ProductCardAttributeBadge['colorVariant']>, string> = {
  red: 'bg-red-700 text-white shadow-red-950/40 ring-red-300/20',
  blue: 'bg-blue-600 text-white shadow-blue-950/40 ring-blue-300/20',
  cyan: 'bg-cyan-700 text-white shadow-cyan-950/40 ring-cyan-200/20',
  green: 'bg-emerald-700 text-white shadow-emerald-950/40 ring-emerald-200/20',
  amber: 'bg-amber-400 text-zinc-950 shadow-amber-950/40 ring-amber-100/30',
  purple: 'bg-violet-600 text-white shadow-violet-950/40 ring-violet-200/20',
  slate: 'bg-slate-500 text-white shadow-slate-950/40 ring-slate-200/20',
};

function cleanBadgeText(value: unknown) {
  return String(value || '').replace(/\s+/g, ' ').trim().slice(0, 48);
}

function ProductCardBadgeChip({ badge }: { badge: ProductCardAttributeBadge }) {
  const text = cleanBadgeText(badge.text);
  if (!text) return null;

  return (
    <span
      className={`max-w-[180px] truncate rounded-md px-2.5 py-1 text-[11px] font-black leading-none tracking-[-0.01em] shadow-lg ring-1 ${
        colorClasses[badge.colorVariant || 'blue']
      }`}
      title={text}
    >
      {text}
    </span>
  );
}

export default function ProductCardAttributeBadges({ badges = [] }: { badges?: ProductCardAttributeBadge[] }) {
  const safeBadges = badges
    .filter((badge) => cleanBadgeText(badge.text))
    .sort((left, right) => (left.ordering || 0) - (right.ordering || 0));
  if (safeBadges.length === 0) return null;

  const topLeft = safeBadges.filter((badge) => badge.slot === 'image_top_left');
  const bottomCenter = safeBadges.filter((badge) => badge.slot === 'image_bottom_center');

  return (
    <>
      {topLeft.length > 0 ? (
        <div className="pointer-events-none absolute left-3 top-3 z-20 flex max-w-[70%] flex-col items-start gap-1.5">
          {topLeft.map((badge, index) => (
            <ProductCardBadgeChip key={badge.id || `${badge.attributeId}-${badge.valueId}-${index}`} badge={badge} />
          ))}
        </div>
      ) : null}

      {bottomCenter.length > 0 ? (
        <div className="pointer-events-none absolute bottom-3 left-1/2 z-20 flex max-w-[78%] -translate-x-1/2 flex-col items-center gap-1.5">
          {bottomCenter.map((badge, index) => (
            <ProductCardBadgeChip key={badge.id || `${badge.attributeId}-${badge.valueId}-${index}`} badge={badge} />
          ))}
        </div>
      ) : null}
    </>
  );
}
