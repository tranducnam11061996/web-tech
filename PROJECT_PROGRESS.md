# Project Progress

Last updated: 2026-07-09

This file tracks implementation status for the HACOM workspace. For the shortest handoff path, read `AI_HANDOFF.md` first, then this file, then the database docs.

## Current Status

| Area | Status | Notes |
| --- | --- | --- |
| Storefront product/category pages | Working | Dynamic slug routing, category filters, cart entry points, and product detail remain the main customer flow |
| Guest cart and checkout draft | Implemented, not production-ready | Cart quote and order transaction exist; production hardening is still open |
| Admin CRUD | Implemented first pass | Writes are gated by `ADMIN_WRITE_ENABLED=true`; auth/authorization is still missing |
| Search infrastructure | Implemented and present in live DB | `product_data_search` has 28,763 rows and 0 missing products at audit time |
| Product image albums | Implemented in code, DB migration pending | `web_admin_product_images` code exists; table was not present in live DB at audit time |
| Header menu management | Implemented, needs live smoke test | Admin menu manager, draft/publish API, storefront fetch, labels, preview, collapse tree, mojibake/icon fixes, and Circle Story data binding are in code |
| Documentation audit | Updated | Core handoff docs refreshed on 2026-07-07 |

## Completed Work

| Item | Evidence |
| --- | --- |
| Runtime database audit | 244 tables: 116 InnoDB, 128 MyISAM, 243 legacy latin1 tables |
| Search table audit | `product_data_search` exists with 28,763 rows |
| Search sync infrastructure | Normalize function, insert trigger, update trigger, and FK are present |
| Admin helper tables | `web_admin_sequence` and `web_admin_entity_registry` exist |
| Storefront image grouping | Product detail code can consume `imageGroups.product` and `imageGroups.customer` |
| Admin image album UI/API | Upload, batch metadata update, delete, media serving, and legacy sync code paths exist |
| Header menu DB/API | `web_admin_menus`, `web_admin_menu_versions`, `web_admin_menu_items`, admin APIs, public `/api/menu/header`, and target search endpoint exist |
| Header menu admin UI | `/content/menu` supports live preview, editable `Danh Mục`/`Nổi bật` labels, expand/collapse tree, area switching, quick custom links, save draft, and publish |
| Header storefront integration | `font-end` header loads public menu data, falls back locally, renders `Danh Mục`/`Nổi bật`, and repairs known mojibake values |
| Header icon/text cleanup | Header chrome icons now use `lucide-react`; Vietnamese labels/placeholders render with encoded strings or repair helpers |
| Circle Story section binding | Circle Story no longer renders from `Header`; `Section2.tsx` reads `/api/menu/header` and binds `circleStory` into the existing `.story-*` markup without CSS changes |
| Build verification | `web-admin` and `font-end` builds passed with increased Node memory |

## Important Pending Work

1. Run the admin migration with writes enabled on the intended database to create `web_admin_product_images`.
2. Run admin migrations for header menu tables/settings on the intended database, then smoke-test `/content/menu` save draft, publish, and storefront header at `localhost:3001`.
3. Verify image upload end to end: upload each type, reload admin edit page, check storefront tabs, check legacy `proThum/image_collection/image_count`.
4. Add authentication and authorization before enabling admin write routes outside a trusted environment.
5. Harden checkout before production: rate limit, CORS allowlist, request validation, backend quantity rules, idempotency, and safer error responses.
6. Add integration tests around order transaction rollback and search/image/menu migration behavior.
7. Decide whether to keep or remove legacy scratch/debug files at workspace root.

## Verification Matrix

| Check | Result | Notes |
| --- | --- | --- |
| `web-admin` typecheck | Pass | `npx.cmd tsc --noEmit` |
| `font-end` typecheck | Pass | `npx.cmd tsc --noEmit` |
| `web-admin` build | Pass | Use `NODE_OPTIONS=--max-old-space-size=4096` |
| `font-end` build | Pass | Use `NODE_OPTIONS=--max-old-space-size=4096` |
| Header menu frontend/admin typecheck | Pass | Rechecked on 2026-07-09 with `npx tsc --noEmit` in both apps |
| Header menu frontend/admin build | Pass | Rechecked on 2026-07-09 with `npm run build` in both apps; `web-admin` still shows the known multi-lockfile Next warning |
| Circle Story Section2 binding | Pass | Rechecked on 2026-07-09 with `npx tsc --noEmit` and `npm run build` in `font-end` after moving story render out of `Header` |
| `web-admin` admin migration without write flag | Expected failure | Safety gate rejects when `ADMIN_WRITE_ENABLED` is not `true` |
| Search DB health | Pass | Product rows = search rows = 28,763; missing = 0 |
| `web-admin` lint | Not clean | Legacy lint errors remain |
| `font-end` lint | Not configured | Next.js prompts for ESLint setup |

## Commands Used For Verification

```powershell
cd D:\web-tech\web-admin
npx.cmd tsc --noEmit
$env:NODE_OPTIONS='--max-old-space-size=4096'
npm.cmd run build
```

```powershell
cd D:\web-tech\font-end
npx.cmd tsc --noEmit
$env:NODE_OPTIONS='--max-old-space-size=4096'
npm.cmd run build
```

## Product Image Album State

Code supports three image types:

| Type | Admin label | Storefront grouping |
| --- | --- | --- |
| `product` | Anh san pham | `imageGroups.product` |
| `self` | Anh tu chup / Hacom tu chup | `imageGroups.product` |
| `customer` | Anh khach hang | `imageGroups.customer` |

The new admin metadata table is expected to be `web_admin_product_images`. The migration was not applied to the audited database because admin writes were not enabled.

## Search State

`product_data_search` is the current production-facing search cache for `/api/search`.

Owners:

- Migration: `web-admin/scripts/run-search-migration.ts`
- Rebuild: `web-admin/scripts/rebuild-search-data.ts`
- Runtime helpers: `web-admin/src/lib/searchInfrastructure.ts`
- API: `web-admin/src/app/api/search/route.ts`
- Webhook sync: `web-admin/src/app/api/webhook/update-search/route.ts`

## Header Menu State

Header navigation is now managed from `web-admin` instead of only from hardcoded storefront data.

Owners:

- Admin UI: `web-admin/src/app/content/menu/page.tsx` and `web-admin/src/components/menu/HeaderMenuManager.tsx`
- Admin API: `web-admin/src/app/api/admin/menus/header/*`
- Public API: `web-admin/src/app/api/menu/header/route.ts`
- Backend service: `web-admin/src/lib/admin/menus.ts`
- Seed data: `web-admin/src/lib/header-menu-seed.ts`
- Storefront renderer: `font-end/src/components/Header.tsx`
- Circle Story section renderer: `font-end/src/components/sections/Section2.tsx`
- Storefront fallback data: `font-end/src/components/menuData.ts`

Current behavior:

- Admin edits draft menu data, then publishes it for the storefront.
- `Danh Mục` and `Nổi bật` labels are editable in draft/published settings.
- Admin preview updates from local draft state and supports area switching.
- Menu tree is expandable/collapsible so large zone/group/link lists stay manageable.
- Storefront fetches `/api/menu/header`, uses fallback data if the API fails, and repairs known mojibake labels/suffixes before rendering.
- Circle Story data is published with the header menu but renders only in `Section2.tsx`, using the existing `.story-*` HTML structure. Do not render the same story strip from `Header`.

## Storefront Section Binding Rule

For future work in `font-end/src/components/sections/Section*.tsx`:

- Keep existing section markup, classes, IDs, and layout unless a task explicitly asks for new UI.
- Replace hardcoded repeated content with a data loop, then bind values into existing text nodes, attributes, or inline style values.
- Do not add wrappers, new CSS classes, or duplicate render locations just to consume dynamic data.
- URL values should only be bound when an existing link element is already part of the markup.
- If dynamic data is empty or the API fails, avoid falling back to stale hardcoded content unless the task explicitly asks for a local fallback.
- Normalize values before printing them: trim text, validate hex colors, and prefix relative media URLs with `NEXT_PUBLIC_API_URL`.

## Known Risks

- Most database tables still use legacy `latin1_swedish_ci`.
- The database mixes InnoDB and MyISAM.
- Admin write routes are powerful and should stay disabled until auth is complete.
- Uploaded media serving depends on correct `MEDIA_ROOT` and `MEDIA_BASE_URL`.
- Legacy image fields must continue to be synced until every consumer reads the new image metadata table.
