import assert from "node:assert/strict";
import test from "node:test";
import { HEADER_MENU_ICON_PATHS, HEADER_MENU_SEED } from "../src/lib/header-menu-seed";
import {
  HEADER_UTILITY_DEFINITIONS,
  resolveHeaderSystemKey,
  resolveHeaderSystemUrl,
} from "../src/lib/headerMenuUtilities";

test("header utility definitions keep the managed order, icons and system destinations", () => {
  assert.deepEqual(
    HEADER_UTILITY_DEFINITIONS.map(({ label, iconKey, systemKey, url }) => ({ label, iconKey, systemKey, url })),
    [
      { label: "Tài khoản", iconKey: "user", systemKey: "account", url: "/tai-khoan" },
      { label: "Giỏ hàng", iconKey: "shopping-cart", systemKey: "cart", url: "/gio-hang" },
      { label: "Yêu thích", iconKey: "heart", systemKey: "favorites", url: "/yeu-thich" },
      { label: "Trợ lý AI", iconKey: "bot", systemKey: "assistant", url: "#" },
    ],
  );

  assert.deepEqual(
    HEADER_MENU_SEED.utilityLinks.map((item) => ({
      label: item.label,
      iconKey: item.iconKey,
      systemKey: item.customUrl,
      desktopVisible: item.desktopVisible !== false,
      mobileVisible: item.mobileVisible !== false,
    })),
    HEADER_UTILITY_DEFINITIONS.map((item) => ({
      label: item.label,
      iconKey: item.iconKey,
      systemKey: item.systemKey,
      desktopVisible: true,
      mobileVisible: true,
    })),
  );

  for (const item of HEADER_UTILITY_DEFINITIONS) assert.ok(HEADER_MENU_ICON_PATHS[item.iconKey]);
});

test("header system URLs are canonical and assistant remains non-navigating", () => {
  for (const item of HEADER_UTILITY_DEFINITIONS) {
    assert.equal(resolveHeaderSystemUrl(item.systemKey), item.url);
    assert.equal(resolveHeaderSystemKey("system", item.systemKey), item.systemKey);
  }
  assert.equal(resolveHeaderSystemUrl("unknown"), "#");
  assert.equal(resolveHeaderSystemKey("custom", "cart"), undefined);
});
