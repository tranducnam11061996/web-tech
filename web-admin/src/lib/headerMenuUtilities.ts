export type HeaderUtilitySystemKey = "account" | "cart" | "favorites" | "assistant";

export type HeaderUtilityDefinition = {
  label: string;
  iconKey: "user" | "shopping-cart" | "heart" | "bot";
  systemKey: HeaderUtilitySystemKey;
  url: string;
};

export const HEADER_UTILITY_DEFINITIONS: readonly HeaderUtilityDefinition[] = [
  { label: "Tài khoản", iconKey: "user", systemKey: "account", url: "/tai-khoan" },
  { label: "Giỏ hàng", iconKey: "shopping-cart", systemKey: "cart", url: "/gio-hang" },
  { label: "Yêu thích", iconKey: "heart", systemKey: "favorites", url: "/yeu-thich" },
  { label: "Trợ lý AI", iconKey: "bot", systemKey: "assistant", url: "#" },
] as const;

const SYSTEM_URLS = new Map<string, string>([
  ["account", "/tai-khoan"],
  ["cart", "/gio-hang"],
  ["favorites", "/yeu-thich"],
  ["assistant", "#"],
  ["search", "/tim"],
]);

export function resolveHeaderSystemUrl(value: unknown) {
  return SYSTEM_URLS.get(String(value || "").trim()) || "#";
}

export function resolveHeaderSystemKey(linkMode: unknown, customUrl: unknown) {
  return linkMode === "system" ? String(customUrl || "").trim() : undefined;
}
