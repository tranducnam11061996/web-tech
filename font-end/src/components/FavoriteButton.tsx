"use client";

import { Heart } from "lucide-react";
import { useRouter } from "next/navigation";
import type { MouseEvent } from "react";
import { useCustomerSession } from "@/lib/customer";
import { useCustomerFavorite } from "@/lib/customerFavorites";

type FavoriteButtonProps = {
  productId: number;
  variant?: "card" | "gallery";
  className?: string;
  onChange?: (favorited: boolean) => void;
};

export default function FavoriteButton({
  productId,
  variant = "card",
  className = "",
  onChange,
}: FavoriteButtonProps) {
  const router = useRouter();
  const { user, loading: sessionLoading } = useCustomerSession();
  const { favorited, checking, pending, error, toggle } = useCustomerFavorite(productId);
  const isFavorite = favorited === true;
  const disabled = sessionLoading || pending || Boolean(user && checking);
  const label = isFavorite
    ? "Bỏ sản phẩm khỏi danh sách yêu thích"
    : "Thêm sản phẩm vào danh sách yêu thích";

  const handleClick = async (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (disabled) return;
    if (!user) {
      const params = new URLSearchParams({
        favoriteProductId: String(productId),
        returnTo: "/yeu-thich",
      });
      router.push(`/tai-khoan/dang-nhap?${params.toString()}`);
      return;
    }
    try {
      const nextFavorite = await toggle();
      if (typeof nextFavorite === "boolean") onChange?.(nextFavorite);
    } catch {
      // The shared provider restores state and announces the safe API message.
    }
  };

  return (
    <button
      type="button"
      className={`${variant === "gallery" ? "product-gallery-icon-button" : "favorite-card-button"} ${isFavorite ? "is-active" : ""} ${className}`.trim()}
      aria-label={label}
      aria-pressed={isFavorite}
      aria-busy={disabled || undefined}
      title={error || undefined}
      disabled={disabled}
      onClick={handleClick}
    >
      {variant === "gallery" ? (
        <Heart aria-hidden="true" fill={isFavorite ? "currentColor" : "none"} />
      ) : (
        <span className="favorite-card-button-visual" aria-hidden="true">
          <Heart fill={isFavorite ? "currentColor" : "none"} />
        </span>
      )}
    </button>
  );
}
