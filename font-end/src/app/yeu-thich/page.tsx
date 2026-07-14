import type { Metadata } from "next";
import FavoritesPageClient from "./FavoritesPageClient";

export const metadata: Metadata = {
  title: "Sản phẩm đã lưu | TrucTiepGAME",
  description: "Xem lại các sản phẩm công nghệ bạn đã lưu tại TrucTiepGAME.",
  robots: { index: false, follow: false },
};

export default function FavoritesPage() {
  return <FavoritesPageClient />;
}
