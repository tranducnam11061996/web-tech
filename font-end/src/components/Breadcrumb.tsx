import { House } from "lucide-react";
import Link from "next/link";
import type { BreadcrumbItem } from "@/types/breadcrumb";

export default function Breadcrumb({ items }: { items: BreadcrumbItem[] }) {
  const normalizedItems = items.flatMap((item) => {
    const label = String(item.label || "").trim();
    return label ? [{ ...item, label }] : [];
  });
  const crumbs: BreadcrumbItem[] = [{ label: "Trang chủ", href: "/" }, ...normalizedItems];

  return (
    <nav aria-label="Breadcrumb" className="mb-5 min-w-0">
      <ol className="breadcrumb-list flex min-w-0 items-center gap-2 overflow-x-auto whitespace-nowrap text-sm text-gray-500">
        {crumbs.map((item, index) => {
          const isCurrent = index === crumbs.length - 1;
          return (
            <li
              key={`${item.href || "current"}-${item.label}-${index}`}
              className="flex shrink-0 items-center gap-2"
            >
              {index > 0 ? (
                <span aria-hidden="true" className="shrink-0 text-gray-700">
                  /
                </span>
              ) : null}
              {isCurrent || !item.href ? (
                <span
                  aria-current={isCurrent ? "page" : undefined}
                  className="max-w-[70vw] shrink-0 truncate text-gray-300 md:max-w-[48rem]"
                  title={item.label}
                >
                  {item.label}
                </span>
              ) : (
                <Link
                  href={item.href}
                  className="inline-flex shrink-0 items-center gap-1 transition-colors hover:text-cyan-400 focus-visible:text-cyan-400 focus-visible:outline-none"
                >
                  {index === 0 ? <House aria-hidden="true" className="size-3.5" /> : null}
                  {item.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
