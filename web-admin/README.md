# HACOM Backend API and Admin Dashboard

Last verified: `2026-07-24`

`web-admin` is a Next.js 16.2.11 application that owns the admin UI, all REST APIs, all MySQL access, media serving, migrations, and background jobs. Read root `AGENTS.md` and `AI_HANDOFF.md` first.

The authenticated header uses the `TrucTiepGAME` wordmark and matching accessible application-icon label.

## Hidden Product Frame administration

`Quản lý khung sản phẩm` is intentionally absent from the sidebar. `/product/product-frame`, `/product/product-frame/product`, and `/product/product-frame-edit` return the standard Next.js not-found response. The dormant components, `catalog.product_frames` permission contract, and database data are retained and must not be removed unless a separate cleanup plan is approved.

## Combo Set scope management

`/product/combo-set/product?id=<id>` manages direct SKUs and dynamic category roots. Direct selection saves immediately through `PATCH /api/admin/combo-sets/[id]/scope`; category selection is drafted in the shared two-column hierarchy selector and saved as one canonical root list. The effective table is a deduplicated union with source badges, while `combo_set.product_count` remains the legacy direct-relation count.

`web_admin_combo_set_categories` stores only `(combo_set_id, category_id)` roots. Runtime discovery, group loading and quote/order validation resolve the anchor product’s current category ancestors, so selecting a parent automatically includes current/future descendants. Run `npm.cmd run admin:migrate` with `ADMIN_WRITE_ENABLED=true` only against an identified database before deploying this code.

## Brand management

`/product/brand` keeps list payloads small and requests full Brand data only after an Edit action opens. `GET /api/admin/brands/[id]` returns the Brand row plus its `idv_brand_info` row for `sellerId=0`; guarded `PATCH` validates and updates both in one transaction, inserting the info row when legacy data is missing and clearing the public response cache afterward.

The 1200px edit dialog labels `idv_brand.summary` as plain `Mô tả tóm tắt` and `idv_brand_info.description` as TinyMCE `Mô tả`. Ordering uses a text input with strict integer validation. TinyMCE is loaded only from `/tinymce.min.js`; editor images use `/api/admin/editor-images/brands/upload`.

Brand logos are selected with a native file control, previewed locally and uploaded only when the form is saved. `POST /api/admin/brands/images/upload` requires `catalog.brands.update`, accepts signature-matching JPEG/PNG/WebP/GIF files up to 10MB and writes dated `MEDIA_ROOT/brand/...` paths. The guarded PATCH accepts `image` additively and preserves the current image when omitted. Slug, public Brand response shape and database schema remain unchanged.

## Voucher management

`/sales/vouchers` keeps numeric values as digit-only text while the administrator edits them, then validates and converts them to the existing numeric payload before create/update. Limited quantity must be positive; discounts must be positive; percent discounts are capped at 100 and require a positive maximum divisible by 1,000; blank minimum order value becomes zero.

Voucher category scope uses two columns on desktop: removable selected categories on the left and the complete active parent-child tree on the right. The right column includes local accent-insensitive name/ID search. Selecting one category removes conflicting selected ancestors/descendants and stores only that category ID; runtime descendant matching remains server-owned. Inactive or deleted IDs from older vouchers stay visible as removable warning chips.

The same form now accepts up to 500 direct SKUs through the shared paginated product picker, including currently hidden catalog rows. Direct SKUs and category roots are combined with OR semantics and deduplicated at quote time; leaving both empty keeps the existing global-voucher behavior. Admin list responses expose `productCount`, detail responses expose existing `products`/`productIds`, and POST/PUT replace both relation sets transactionally. Missing product IDs are omitted from the edit draft and removed on the next explicit save.

`web_admin_voucher_products(voucher_id,product_id)` owns direct scope with a composite primary key, reverse `(product_id,voucher_id)` index and cascading FK to `web_admin_vouchers`; product IDs remain logical references. Run the guarded admin migration against an identified database before deploying code that reads the table. Product-detail discovery and checkout use the same global/direct/category predicate, while the storefront relies on the authored voucher description and does not infer scope text.

## Homepage product-section bootstrap

The homepage bootstrap currently loads only category `1087` for the retained Section 17 product pipeline. Categories `178` and `521` remain valid for the dormant Section 6/10 components but are intentionally excluded from homepage bootstrap/fallback work. Bootstrap v3 also returns `featuredNews`: at most ten newest unique public articles across active article categories marked featured, with deterministic primary-category preference and the selected category's additive `category_url`. The `productSections` response shape and generic `GET /api/categories/homepage-product-sections` endpoint remain unchanged.

## Managed Header utility links

`/content/menu/header` manages account, cart, favorites and assistant in the `Link tiện ích` area, including order, icon, active state and independent desktop/mobile visibility. Public `GET /api/menu/header` exposes `linkMode`, `systemKey`, `desktopVisible` and `mobileVisible`; canonical system URLs are `/tai-khoan`, `/gio-hang`, `/yeu-thich` and `#` respectively.

For the guarded canonical replacement, run `npm.cmd run header-utilities:publish` only with `ADMIN_WRITE_ENABLED=true` against identified database `it_tech_db`. The command snapshots the full draft under ignored `var/migrations/header-menu-utility-links/`, hashes every non-utility menu area/settings before and after save, publishes, verifies the public payload and restores the prior state on failure.

## PC Builder

PC Builder v6 adds optional direct SKU pricing through `web_admin_pc_builder_product_prices`. Product create/edit accepts `Giá Build PC`; blank/`0` disables it and active values must be integer VND below the catalog selling price. Run the guarded migration only after restore verification: `npm.cmd run pc-builder:v6:migrate -- --mode=apply|verify --database=<identified-db> --backup-sha256=<sha256>`.

Quote derives `buildPriceEligible` from every active required component and `minSelections`, counting distinct SKUs rather than quantity. Incomplete builds use catalog/Flash Sale only and skip campaign promotions. Complete builds give a valid direct SKU price absolute precedence; campaign pricing is fallback only for SKUs without a direct price. Candidate exposes the conditional price, while quote/order add `buildPcPrice`, `buildPriceApplied`, `cartSubtotal` and `buildPriceRevision`. Normal cart/product pricing APIs remain unchanged.

PC Builder v5 adds quantity-aware (`1–4`) quotes and three additive promotion tables. Admin `/product/pc-builder` now has a “Khuyến mãi Build PC” tab; `GET/PUT /api/admin/pc-builder/promotions` manages scheduled fixed/percent rules, caps, priority, logical SKU/category-descendant targets and AND requirements by distinct component SKU count. Writes use `catalog.pc_builder.update`, same-origin checks, `ADMIN_WRITE_ENABLED`, optimistic SHA-256 versioning, one transaction, audit and cache bump.

Run the guarded v5 migration only after a restore-verified backup: `npm.cmd run pc-builder:v5:migrate -- --mode=apply|verify --database=<identified-db> --backup-sha256=<sha256>`. The local `it_tech_db` apply/verify is complete; clone rehearsal passed apply twice. Quote now returns `regularPrice`, `cartPrice`, final `price`, `priceSource`, `lineDiscount`, promotion metadata, `regularSubtotal`, `buildDiscount` and `promotionRevision`. Order always re-quotes in its transaction and snapshots those values.

Catalog-live v4 uses `web_admin_pc_builder_components.category_id` plus `web_admin_pc_builder_component_relations`. Admin category configuration is `GET/PUT /api/admin/pc-builder/components`; option endpoints are `/category-options` and `/relation-attributes`. Category selectors render the active parent-child taxonomy with local ID/name search and descendant sellable-product counts. Relation options and configured rows expose sellable-product attribute coverage. Runtime applies a relation only at 90% or greater coverage on both category trees; lower-coverage relations remain configured but are visibly marked and skipped by candidate/quote/order. All writes require same-origin, `catalog.pc_builder.update`, audit authorization and `ADMIN_WRITE_ENABLED=true`; omitted existing rows are soft-disabled.

Candidate requests accept page/limit, search, sort, price, brands and up to eight attribute filters. Quote returns `requiresConfirmation`, `missingRequiredComponents`, `warningSignature` and a fingerprint containing the composite published-rule/config revision. Order confirmation must echo the current fingerprint and warning signature. Auto/benchmark/release APIs remain future-phase backend code but are absent from current admin/storefront clients.

The active revision is `pc-builder-v4-catalog-live`; it is applied and verified on `it_tech_db`. `ADMIN_WRITE_ENABLED=true` is intentionally active for the current local admin testing window and must be returned to `false` afterward.

PC Builder APIs, compatibility, saved builds and orders are owned here. Schema changes use dedicated `npm.cmd run pc-builder:migrate -- --mode=apply|verify --database=<name> --backup-sha256=<sha256>` from `database-docs/PC_BUILDER_MIGRATION.md`, not the general admin migration. Manual is catalog-live; Gaming Auto/release endpoints intentionally return 503.

Public routes are `GET /api/pc-builder/bootstrap`; `POST /api/pc-builder/candidates|quote|builds|orders`; and `GET /api/pc-builder/builds/[token]`. Candidate filters use numeric `attributeValueId` values. Account CRUD is under `/api/customer/pc-builds`; admin configuration is `/product/pc-builder` and `/api/admin/pc-builder/components`.

Operational commands are `pc-builder:migrate`, `pc-builder:history-hash` and guarded `pc-builder:commerce-qa`. `scripts/load-pc-builder-read-smoke.js` is a configurable low-load read-only k6 check; it is not 1,500-VU evidence.

## Quick tools

`/quick-tools` is visible with `catalog.attributes.read`. The active phase is `/quick-tools/incomplete-product-attributes`; the other overview cards are non-interactive placeholders.

Read APIs are:

- `GET /api/admin/quick-tools/incomplete-product-attributes/categories`
- `GET /api/admin/quick-tools/incomplete-product-attributes/attributes?categoryId=`
- `GET /api/admin/quick-tools/incomplete-product-attributes/products?categoryId=&attributeId=`

Autosave uses `PUT /api/admin/quick-tools/incomplete-product-attributes/products/[productId]/values` with `{ categoryId, attributeId, attributeValueIds, expectedRevision }`. It requires `catalog.attributes.update`, a same-origin authenticated request, and the shared admin write gate. Reads include all product sale states but only active category descendants and active mappings. This feature uses the legacy category/attribute/product junctions directly and has no migration. Run the destructive fixture only with `QUICK_ATTRIBUTE_DESTRUCTIVE_TEST=true` against a database whose name explicitly contains `test`, `tmp`, or `disposable`.

Step 01 consumes `parentId` and `ordering` from the category summary and renders a root-first disclosure tree. Pass `selectedCategoryId` to preserve a completed selected node and its active ancestor path when `includeComplete` is off. Category search remains in `categoryQ` for reload/back-forward context but is applied locally to the loaded tree by accent-insensitive name, breadcrumb, or ID; it does not trigger per-keystroke API reads.

## Combo commerce

Admin combo APIs support create/update plus product relation remove/reorder. Public combo endpoints are `GET /api/combo-sets/[setId]/groups/[groupIndex]`, `POST /api/combo-cart/quote`, and `POST /api/combo-orders`. Run `npm run admin:migrate` only with an identified database and explicit `ADMIN_WRITE_ENABLED=true`; it adds required indexes/metadata, force-removes obsolete Product Group value visual columns, but does not clean legacy relation orphans or assign combo data.

`/product/combo-set/list` opens the create form through `/product/combo-set/edit` without an ID; the same editor uses `POST /api/admin/combo-sets` for create and switches to PATCH after the returned ID is installed in the URL. Combo Set POST/PATCH/DELETE routes require `catalog.combo_sets.create`, `.update` and `.delete` respectively, while both list and editor pages require `.read`.

Combo Set end time uses the existing `toTime` Unix timestamp contract. The editor exposes native radio choices: `Không giới hạn thời gian` is the create default and sends `0`; `Chọn ngày kết thúc` sends a positive timestamp after validating it is later than the start. Its initial bounded draft is start time plus 30 days, or current time plus 30 days when the start is invalid. The list displays the zero sentinel as `Không giới hạn`.

Combo product discounts are edited as digit-only text with `inputMode="numeric"`; pasted separators are stripped and submit still converts the string to the existing numeric payload. Adding a product group prepends it in an expanded state above prior groups.

## Responsibilities

- Public storefront APIs for catalog, categories, collections, content, menus, banners, search, quote, and order creation.
- Customer APIs for authentication, profile, addresses, locations, and order history.
- Authenticated/RBAC-protected admin APIs and screens for catalog, content, commerce, users, roles, and customer CRM.
- MySQL connection pool, legacy schema integration, additive `web_admin_*` tables, cache invalidation, and search infrastructure.
- Transactional email outbox, expired-record cleanup, readiness/liveness, and media serving.

### Banner location deletion

`DELETE /api/admin/banner-locations/[id]` requires the normal same-origin admin session, `ADMIN_WRITE_ENABLED=true`, and `marketing.banner_locations.delete`. It permanently removes only the selected non-default location. Every owned banner is moved in the same transaction to the protected `unassigned` / `Chưa có vị trí` location, has its denormalized location fields synchronized, and is hidden; banner rows, media, metadata, category mappings, and visit logs remain intact. Public banner APIs always exclude `unassigned`.

The dedicated migration requires a restore-verified backup hash and an environment-only confirmation token:

```powershell
$env:ADMIN_WRITE_ENABLED='true'
$env:BANNER_LOCATION_RESTORE_VERIFIED_SHA256='<sha256>'
$env:BANNER_LOCATION_MIGRATION_CONFIRMATION_TOKEN='<64-character-secret>'
$env:BANNER_LOCATION_MIGRATION_CONFIRMATION_INPUT=$env:BANNER_LOCATION_MIGRATION_CONFIRMATION_TOKEN
npm.cmd run banner-locations:migrate -- --mode=apply --database=it_tech_db --backup-sha256=<sha256>
npm.cmd run banner-locations:migrate -- --mode=verify --database=it_tech_db --backup-sha256=<sha256>
```

`rollback` is permitted only while no banner references the default location. Return `ADMIN_WRITE_ENABLED=false` after migration.

## Managed Footer menus

- `Footer Menu` is administered at `/content/menu/footer`; its public endpoint is `GET /api/menu/footer`. One protected root owns zero or more dynamically named groups, each with zero or more custom links.
- `Bottom Footer` is administered at `/content/menu/bottom-footer`; its public endpoint is `GET /api/menu/bottom-footer`. It retains exactly one protected group, but the group heading and custom-link count are dynamic.
- Both validators enforce the three-level structure and a 200-node safety ceiling without comparing labels or cardinality to seed content. Explicitly empty published content is valid; seed fallback is reserved for a missing, malformed, or unavailable published source.
- Both menus use draft/publish versions, `content.menus` RBAC, `ADMIN_WRITE_ENABLED=true` for mutations, public ETag responses, and cache invalidation after publication.

## Article-category featured state

- Article-category create/edit accepts `isFeatured` as strict `0|1`; admin reads expose the stored value as `is_featured` for compatibility with the existing raw category response shape.
- `PATCH /api/admin/article-categories/[id]/featured` accepts `{ "isFeatured": 0|1 }` and updates only that field under `content.article_categories.update`, the shared write gate, same-origin/session checks, and audit logging.
- `admin:migrate` creates/backfills additive `web_admin_article_category_meta`. It does not modify `idv_seller_news_category`; permanent category deletion removes the corresponding metadata row in the same transaction.
- This flag is currently managed only by `web-admin`; no storefront ranking or rendering behavior is inferred from it.

## Environment

Page-view tracking uses `PAGE_VIEW_TRACKING_ENABLED` as an emergency kill switch (default enabled), with `RATE_LIMIT_PAGE_VIEW_IP=300` and `RATE_LIMIT_PAGE_VIEW_IP_PATH=120` as the one-minute application limits. Production must set the exact storefront origin and must overwrite forwarded-IP headers at the trusted proxy.

Use the committed root/app `.env.example` files as sanitized starting points. They cover runtime essentials but script/test/benchmark commands also expose optional overrides documented with those commands and in `../NEW_MACHINE_SETUP.md`. Major groups:

- `DATABASE_URL`; optional pool tuning via `DB_CONNECTION_LIMIT`, `DB_QUEUE_LIMIT`, `DB_CONNECT_TIMEOUT_MS`.
- `ADMIN_WRITE_ENABLED` for write APIs/migrations. Migration commands intentionally fail unless it is exactly `true`.
- `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `STOREFRONT_ORIGIN`.
- `RECAPTCHA_SECRET_KEY`, `NEXT_PUBLIC_RECAPTCHA_SITE_KEY`, score/hostname/shadow/bypass controls.
- `SEARCH_WEBHOOK_SECRET`.
- SMTP/outbox variables and `BACKGROUND_WORKER_POLL_MS`.
- `MEDIA_ROOT`, `MEDIA_BASE_URL`, and Vietnam location provider/cache variables.

Never put real secrets into committed examples or logs.

## Commands

```powershell
npm.cmd run dev
npm.cmd run dev:clean
npm.cmd run build
npm.cmd run start
npm.cmd run lint -- --quiet
npx.cmd tsc --noEmit
```

`npm run dev` starts Next.js and the background email worker together; both share the terminal and stop together on `Ctrl+C`. Use `npm run dev:api` for an intentional API-only session, or `npm run worker:background` to run only the worker. Inspect pending delivery in `web_admin_email_outbox`; never mark an email as sent manually.

```powershell
npm.cmd run admin:migrate
npm.cmd run admin:access-migrate
npm.cmd run admin:bootstrap
npm.cmd run locations:sync
npm.cmd run search:migrate
npm.cmd run search:rebuild
npm.cmd run search:test-ranking
```

```powershell
npm.cmd run worker:background
npm.cmd run local:healthcheck
npm.cmd run local:benchmark
npm.cmd run storefront:benchmark
npm.cmd run db:indexes
npm.cmd run db:explain-hot
npm.cmd run db:repair-catalog-routes -- --dry-run --expected-database=it_tech_db
npm.cmd run db:collation -- --audit --expected-database=it_tech_db
npm.cmd run test:unit
npm.cmd run test:integration
npm.cmd run load:k6
```

Run `load:k6` only against an approved isolated target. It is not a local smoke test.

`db:collation` owns the audited Latin-1-to-UTF-8 workflow. `--apply` additionally requires `ADMIN_WRITE_ENABLED=true`, a locked `--baseline-plan`, its `--expected-plan-hash`, `--backup-confirmed`, `--maintenance-window`, and `--confirm=CONVERT_LATIN1_TO_UTF8MB4`. Phase 1 and the accepted run 2-8 recovery cleanup are complete; the live schema has no Latin-1 or importer recovery tables. Artifacts are written under ignored `var/migrations/collation`.

## PCMarket legacy category import

The active local database is configured in the ignored `.env` as `it_tech_db`; keep the persisted write gate `false`. `hanoi23_db` is a retained read-only source. Bootstrap approved non-catalog configuration only after confirming the target business tables are empty:

```powershell
npm.cmd run db:bootstrap-safe-config -- --source-database=hanoi23_db --target-database=it_tech_db --dry-run
$env:ADMIN_WRITE_ENABLED='true'
npm.cmd run db:bootstrap-safe-config -- --source-database=hanoi23_db --target-database=it_tech_db --apply --expected-hash=<sha256> --confirm=COPY_SAFE_CONFIGURATION
```

Create a logical artifact and require a successful disposable restore before acknowledging backup readiness:

```powershell
$env:ADMIN_WRITE_ENABLED='true'
npm.cmd run db:logical-backup -- --database=it_tech_db --label=<label> --output-dir=D:\web-tech\tmp\db-backups --verify-restore
```

The importer is read-only by default. It downloads the source twice, validates every page with Zod, canonicalizes records by ID, requires matching SHA-256 hashes, stores the raw snapshot under the ignored `var/imports` directory, and runs target-schema/route preflight without writing MySQL:

```powershell
npm.cmd run import:legacy -- --source=pcmarket --entity=product-categories --dry-run
```

Apply is a full category replacement and must run only after a full MySQL backup in an approved maintenance window. It preserves source category IDs, atomically swaps a populated staging table, detaches existing products, stages category-attribute links as pending import records, disables category-scoped voucher/promotion/banner/menu behavior, bumps shared caches, and retains every per-run backup table:

```powershell
$env:ADMIN_WRITE_ENABLED='true'
npm.cmd run import:legacy -- --source=pcmarket --entity=product-categories --apply --expected-database=<name> --expected-hash=<sha256> --confirm=REPLACE_PRODUCT_CATEGORIES --backup-confirmed --maintenance-window
```

Rollback also requires the write gate and exact database name:

```powershell
npm.cmd run import:legacy -- --source=pcmarket --entity=product-categories --rollback --run-id=<id> --expected-database=<name>
```

Before acceptance, do not manually delete `web_admin_import_b_<run-id>_*`; use only the guarded cleanup after restore verification. Runs 2-8 have already completed that lifecycle. Restart API/background workers after apply or rollback. The category integration test is skipped unless `LEGACY_IMPORT_TEST_DATABASE_URL` points to a disposable database whose name contains `test`, `import`, or `disposable`, and `LEGACY_IMPORT_DESTRUCTIVE_TEST=true`.

Local cutover completed on `2026-07-13`: safe configuration is run `1`, PCMarket categories are run `2`, and PCMarket products are run `3`. Never reuse a documented snapshot hash for another apply because the source may change; use the hash printed by the immediately preceding dry-run.

All live product-category routes were canonicalized on `2026-07-14`. The repair command is dry-run by default and lists every exact row/conflict. Apply requires `ADMIN_WRITE_ENABLED=true`, the exact preimage hash, a restore-verified backup containing the same `idv_url` category-route hash, a maintenance window, and `--confirm=REPAIR_PRODUCT_CATEGORY_ROUTE_TYPES`. Rollback requires the database-bound preimage artifact and `--confirm=ROLLBACK_PRODUCT_CATEGORY_ROUTE_TYPES`:

```powershell
npm.cmd run db:repair-catalog-routes -- --dry-run --expected-database=it_tech_db
$env:ADMIN_WRITE_ENABLED='true'
npm.cmd run db:repair-catalog-routes -- --apply --expected-database=it_tech_db --expected-preimage-hash=<sha256> --backup-manifest=<verified-manifest.json> --maintenance-window --confirm=REPAIR_PRODUCT_CATEGORY_ROUTE_TYPES
npm.cmd run db:repair-catalog-routes -- --rollback --expected-database=it_tech_db --artifact=<preimage.json> --maintenance-window --confirm=ROLLBACK_PRODUCT_CATEGORY_ROUTE_TYPES
```

The command updates only routes joined exactly to `idv_seller_category`, uses importer/repair advisory locks, refuses active imports, stores the rollback preimage outside MySQL, and bumps product/catalog cache versions. Live state is 788 canonical routes, zero invalid hashes/orphans/duplicates; the persisted write gate is back to `false`.

## PCMarket legacy product import

The product entity imports the product, brand, and attribute exporters as one stable composite snapshot. It is dry-run by default and requires an empty target catalog plus the already imported 788 categories:

```powershell
npm.cmd run import:legacy -- --source=pcmarket --entity=products --dry-run --expected-database=it_tech_db
$env:ADMIN_WRITE_ENABLED='true'
npm.cmd run import:legacy -- --source=pcmarket --entity=products --apply --expected-database=it_tech_db --expected-hash=<fresh-composite-sha256> --confirm=IMPORT_PCMARKET_PRODUCTS --backup-confirmed --maintenance-window
```

Rollback requires the write gate and the applied run ID:

```powershell
$env:ADMIN_WRITE_ENABLED='true'
npm.cmd run import:legacy -- --source=pcmarket --entity=products --rollback --run-id=3 --expected-database=it_tech_db
```

Run `3` applied hash `5f1f22c6756c862131f9f46926d9d3f4c47835159a82ad4fb70891fa0bd74021`. Media remains on `https://pcmarket.vn`; variants, config groups, and combosets without complete source contracts remain pending audit data. Set the process write gate back to `false` after apply/rollback and retain all snapshot/backup artifacts until acceptance.

## PCMarket legacy brand sync

The standalone brand entity preserves remote `https://pcmarket.vn/...` logos, maps the unassigned source sentinel `0` to the public PCM brand ID `96`, merges source IDs 34/57 into canonical IDs 25/31, refreshes product references/search/cache state, and retains every source mapping in audit:

```powershell
npm.cmd run import:legacy -- --source=pcmarket --entity=brands --dry-run --expected-database=it_tech_db
npm.cmd run import:legacy -- --source=pcmarket --entity=brands --verify-applied --expected-database=it_tech_db
$env:ADMIN_WRITE_ENABLED='true'
npm.cmd run import:legacy -- --source=pcmarket --entity=brands --apply --expected-database=it_tech_db --expected-hash=<fresh-sha256> --confirm=SYNC_PCMARKET_BRANDS --backup-confirmed --maintenance-window
npm.cmd run import:legacy -- --source=pcmarket --entity=brands --rollback --run-id=<id> --expected-database=it_tech_db
```

Applied live run `8` uses hash `4ace3a4c0cc7ba7c2270e10463ce7f31e653d7c86915cdc2b13db6eeacf43eef` and produces 90 brands/info rows, 1,587 brand-category rows, and PCM counts 2,276 total/849 enabled. Runs 2-8 are accepted and their rollback windows are closed; the rollback command now refuses them.

## PCMarket article-category import

This entity imports only the news taxonomy from the PCMarket article-category exporter. It preserves source IDs and `.html` slugs, keeps validated `https://pcmarket.vn/...` media remote, and does not create articles or menus. Initial apply is intentionally blocked unless the article-category, article, junction, category-route, registry, and menu-reference target state is empty:

```powershell
npm.cmd run import:legacy -- --source=pcmarket --entity=article-categories --dry-run --expected-database=it_tech_db
$env:ADMIN_WRITE_ENABLED='true'
npm.cmd run import:legacy -- --source=pcmarket --entity=article-categories --apply --expected-database=it_tech_db --expected-hash=<fresh-sha256> --confirm=IMPORT_ARTICLE_CATEGORIES --backup-confirmed --maintenance-window
npm.cmd run import:legacy -- --source=pcmarket --entity=article-categories --rollback --run-id=<id> --expected-database=it_tech_db
```

Live run `6` applied snapshot `0a3d22d053ec9feb5f6eadf752b4191a240b5e0010515f671a84fd0a34204b04` after a disposable-clone apply/verify/rollback. It created 4 categories and 4 canonical route/registry/map/record rows. Its accepted recovery tables were removed after run-8 finalization; audit and external restore artifacts remain.

## PCMarket article import

The article entity imports the bounded paginated PCMarket news export, keeps remote HTTPS thumbnails/body media, quarantines source ID 83, and uses a staged MyISAM junction swap plus transactional InnoDB article/content/route/audit writes. Always create and restore-verify a current backup first:

```powershell
npm.cmd run import:legacy -- --source=pcmarket --entity=articles --dry-run --expected-database=it_tech_db
$env:ADMIN_WRITE_ENABLED='true'
npm.cmd run import:legacy -- --source=pcmarket --entity=articles --apply --expected-database=it_tech_db --expected-hash=<fresh-sha256> --expected-quarantined=83 --confirm=IMPORT_PCMARKET_ARTICLES --backup-confirmed --maintenance-window
npm.cmd run import:legacy -- --source=pcmarket --entity=articles --rollback --run-id=<id> --expected-database=it_tech_db --confirm=ROLLBACK_PCMARKET_ARTICLES
```

Live run `7` applied hash `0ef9d19c682182113ce43d70b9cb6eb21045a0fb7041287a288716c78b1fab13` after disposable-clone apply/rollback/re-apply. It created 668 articles, 668 content rows, 705 unique category links, 668 routes/registry/maps and 669 records; 654 articles are public, 14 inactive, and ID 83 remains pending. Its accepted recovery tables were removed after a verified external backup.

Read-only verification on `2026-07-14` observed source hash `aaeda512473de728ba04eff924ea07f1c31587a5cf0194ea1a69220428760784`: it adds IDs 682 and 683 without changing/removing prior source rows. Those records are not live and require a separate reviewed article-import cutover; they were intentionally excluded from the catalog-route repair.

## Applied-source verification and recovery cleanup

Every PCMarket entity supports read-only source/runtime verification:

```powershell
npm.cmd run import:legacy -- --source=pcmarket --entity=<product-categories|products|brands|article-categories|articles> --verify-applied --expected-database=it_tech_db
```

Recovery cleanup is dry-run by default and lists exact table names, rows, engines, and sizes. Apply requires a restore-verified manifest newer than the selected runs and closes rollback permanently:

```powershell
npm.cmd run db:import-recovery-cleanup -- --dry-run --expected-database=it_tech_db --run-ids=2,3,4,5,6,7,8
$env:ADMIN_WRITE_ENABLED='true'
npm.cmd run db:import-recovery-cleanup -- --apply --expected-database=it_tech_db --run-ids=2,3,4,5,6,7,8 --backup-manifest=<verified-manifest.json> --maintenance-window --confirm=DROP_ACCEPTED_IMPORT_RECOVERY
```

Live runs 2-8 are already cleaned. The final schema has no `web_admin_import_b_*`, stage, or restore tables; do not rerun cleanup against those IDs.

The post-import runtime healthcheck uses category ID 30. Set `LOCAL_HEALTHCHECK_EMPTY_CATALOG=true` only to accept the expected collection 404s (collection definitions were not imported); product list/search/detail and cart quote still run and must pass:

```powershell
$env:LOCAL_HEALTHCHECK_CATEGORY_ID='30'
$env:LOCAL_HEALTHCHECK_EMPTY_CATALOG='true'
npm.cmd run local:healthcheck
```

## API groups

### Public reads

Product-detail performance contracts:

- `GET /api/products/[slug]?include=full` is the backward-compatible default.
- `GET /api/products/[slug]?include=core` omits below-the-fold recommendations, posts, and buying-guide data.
- `GET /api/products/[slug]/supplemental` returns deferred content with its own cache and ETag.
- Product caches use `PUBLIC_CACHE_MAX_ITEMS`/`PUBLIC_CACHE_MAX_BYTES`, negative TTLs, true stale-while-revalidate, and DB-version invalidation.
- `/api/internal/metrics` requires `INTERNAL_METRICS_TOKEN` in production. `/api/telemetry/web-vitals` accepts only bounded, same-origin, non-PII batches.

- `/api/products/[slug]` optionally embeds a bounded `productGroup` for the current sellable SKU. Group items include each SKU's thumbnail, resolved from `proThum` with a legacy `image_collection` fallback; attribute value visual metadata is not exposed. Product-group data is intentionally absent from lists, search, categories, homepage, and news.
- `/api/products`, `/api/products/[slug]`, `/api/search`, `/api/search-attributes`.
- `/api/brands/[slug]` returns canonical brand metadata, enabled products, price bounds, sort and pagination.
- `/api/categories/*`, `/api/collections/[slug]`.
- `/api/categories/homepage-feature-sections` returns each enabled category feature with at most nine distinct sellable products from the enabled category/descendant scope. Products are ordered by `idv_sell_product_price.ordering DESC`, then product ID descending. The feature target is always derived from the category `request_path`, falling back to its legacy `url`; submitted or stored custom target URLs are not trusted.
- Category-detail reads and `GET /api/products?...&feature_scope=configured` may reuse a feature box enabled for either homepage or the retained category-page flag. This read-only scope exists for the storefront category banner and never changes the stored flags; the default `category` and `homepage` scopes retain their individual gating behavior.
- `/api/homepage/bootstrap`, `/api/menu/header`, `/api/menu/homepage`, `/api/menu/footer`, `/api/menu/bottom-footer`.
- `/api/homepage/bootstrap` optionally accepts bounded `collectionId`, `collectionSlug`, and `collectionLimit` parameters. When ID and slug identify the same active collection, `data.featuredCollection` contains only its metadata and the requested sellable product cards; invalid, missing, empty, or failed collection loads return `featuredCollection: null` without failing the remaining homepage bootstrap.
- `/api/homepage/bootstrap` also returns `data.featuredNews`, capped at ten newest unique public articles whose active primary or linked category is marked featured in `web_admin_article_category_meta`. Each item includes the selected public category ID, name and additive `category_url`; an active featured primary `catId` wins over linked categories.
- `/api/banners/homepage`, `/api/banners/global`, `/api/banners/location/[locationKey]`.
- `/api/news`, `/api/news/[slug]`, `/api/news-category/[slug]`, `/api/media/[...path]`.

`GET /api/news/landing` returns the fixed storefront news-home composition under `data`: up to 11 newest public articles deduplicated across the configured `Tin Công Nghệ`, `Thủ thuật máy tính`, `Game`, `Tin khuyến mại`, and `Ứng dụng, Phần mềm` memberships; up to six newest `Review Sản Phẩm` articles; safe active category navigation; and a bounded PCM YouTube channel payload. Category identity is resolved by active slug rather than hardcoded ID. The YouTube Atom feed is cached for 15 minutes, capped at six validated videos and degrades to `available=false` without failing database news data.

`GET /api/news-category/[slug]` keeps its existing `data`, `news`, `totalNews`, and `pagination` fields and accepts `sort=latest|popular` (default `latest`). It also returns `categories` with safe active navigation fields (`image`, `totalNews`, `isFeatured`) and `popularNews`, the four highest-visit public articles globally with date/ID tie-breaks. `/api/news` reuses the same category query so public featured/count mapping cannot drift; neither route exposes admin metadata.

`GET /api/news/[slug]` keeps its existing `data` field and adds the same active `categories` navigation plus four global `popularNews` items. `data.relatedNews` contains at most six newest active articles from the displayed breadcrumb category, resolves both primary and junction membership, excludes the current article, orders by `createDate DESC,id DESC`, and does not fall back to another category.

Product detail/category responses and news detail/category responses include `categoryTrail: Array<{ id, name, slug }>` for storefront breadcrumbs. `/api/products?category_id=...` exposes the same trail under `layoutMeta.categoryTrail`. Trails are resolved from the legacy hierarchy with bounded recursion, cycle protection, partial results for missing parents, and legacy-link fallbacks; no storefront route reads MySQL directly.

Product-detail responses also include up to 15 `similarProducts` (leaf category first, direct-parent fallback only when fewer than five leaf matches) and up to five title-ranked `relatedPosts`. `GET /api/products?ids=1,2,...` accepts at most 15 unique positive IDs and returns active product cards in request order for browser-local recently viewed history; this private-cache branch bypasses the shared product-response LRU.

`GET /api/products/[slug]` also returns an optional `buyingGuide` only for product/product-category detail payloads. The bounded guide is embedded in the existing cached response; list, search, homepage, and news routes do not query or expose it.

Product detail also returns up to 50 active, in-window, non-exhausted voucher summaries whose category roots contain the product; vouchers without category links apply globally. Public summaries omit quota/redemption/admin data, and `POST /api/cart/quote` plus `POST /api/orders` remain authoritative.

Product detail returns one `productPromotions` array from two sources. It first includes at most 50 active managed records; direct SKU and category-root scopes are combined with OR, descendants are resolved dynamically, duplicates are removed, and ordering remains manual priority then end time then id. Non-empty paragraphs, list items and explicit breaks from the product's legacy `specialOffer` are sanitized and appended as `product-editor` records with stable string IDs, plain-text fallback and allowlisted rich HTML. Raw `specialOffer` is never exposed. Promotions never affect quote or order totals.

Public read APIs use bounded inputs, reduced response shapes, local single-flight caches, ETags, and cross-worker invalidation where applicable.

For `category_id=X`, product list/count, price bounds, brand filters, attribute definitions/counts and category child counts use the same enabled scope: X plus every enabled descendant. Duplicate product links are collapsed. Category metadata, breadcrumbs, feature boxes and buying guides still belong to the category being viewed; inactive roots and unknown slugs remain 404.

Category attribute metadata and `/api/products` URL-filter validation use the same versioned resolver. Active searchable Global attributes apply to every scope; Local attributes prefer active `idv_attribute_category` mappings, but when a mapping is absent a value is exposed only if a sellable product in the enabled scope actually uses that attribute/value relation. This is a read-time fallback and does not create category mappings.

### Commerce writes

`POST /api/page-views` is a public runtime write with a strict 512-byte `{ eventId, path }` body. It requires the storefront origin and exact referrer path, resolves the active product/category/article server-side, stores no IP/user-agent/referrer, and returns `202` for both a new event and an idempotent UUID replay. The background worker aggregates accepted events into `web_admin_page_view_totals`; the route is intentionally independent of the admin write gate.

- `POST /api/cart/quote`: validates up to 50 distinct products with integer quantity 1–99; never trusts client prices.
- `POST /api/orders`: requires storefront origin, `recaptchaToken`, and an `Idempotency-Key` UUID-like value.

Order creation performs final quote, voucher locking, order/items, customer link/metrics, idempotency completion, and email outbox enqueue in one transaction. Email delivery occurs asynchronously after commit.

### Customer

- `/api/customer/auth/register`, `/verify-email`, `/resend-verification`, `/login`, `/logout`.
- `/api/customer/auth/forgot-password/request`, `/confirm`, `/change-password`.
- `/api/customer/me`, `/addresses`, `/orders`, and `/locations/*`.
- `GET /api/customer/favorites?cursor=&limit=` returns at most 24 newest live product cards without a count query; `GET /api/customer/favorites/status?ids=` checks at most 100 unique IDs in one batch.
- `PUT` and `DELETE /api/customer/favorites/[productId]` are idempotent authenticated writes with same-origin enforcement and per-customer throttling. PUT accepts only currently public catalog products.

Anonymous high-risk actions use action-specific reCAPTCHA and IP/identifier rate limits. Authenticated writes use customer session, origin/ownership checks, and route limits.

### Admin

Admin API groups live under `/api/admin/*`. Mutations require authenticated session, RBAC permission, same-origin handling, audit behavior where applicable, and `ADMIN_WRITE_ENABLED=true`. Do not add CAPTCHA to ordinary post-login admin forms; use re-authentication or step-up controls only for sensitive/risky actions.

Category create/edit keeps `categoryPageEnabled` in the internal feature-box contract for backward compatibility but does not expose that option. New categories default it to false. The feature editor supports a headline of at most 255 characters and two lines, automatic category targeting, hero-side selection with copy on the opposite side, and a validated `#RRGGBB` Section 11 container color.

Collection create/edit keeps legacy `icon_url` API compatibility without exposing the field in the admin form: create defaults an omitted icon to the collection name and edit preserves the stored value. Ordering uses an integer-validated text control; `status` and `home_page` remain stored as `0/1` but render as `Ẩn`/`Hiển thị` and `Không`/`Có`. Global single-value native selects use the shared inset-arrow treatment; `multiple` selects are excluded.

Attributes are managed at `/product/attribute-list` and `/product/attribute/edit`. `POST /api/admin/attributes` creates, collection `PATCH` applies active/hidden status, collection `DELETE` performs confirmed bulk cascade deletion, and `GET/PATCH/DELETE /api/admin/attributes/[id]` reads, updates, or permanently deletes one attribute. Saving reconciles values and Local category links transactionally; Global attributes use `scope=1`. The legacy value table has no status column, so values are always active. Destructive integration coverage requires both `ATTRIBUTE_CRUD_DESTRUCTIVE_TEST=true` and an explicitly disposable database name.

All admin rich-text fields use the shared offline GPL TinyMCE instance in `RichTextEditor`. It loads `/tinymce.min.js` only when mounted, resolves its plugins/skins from `public`, keeps the dark UI/content skin, disables the feature-promotion CTA through `promotion: false`, hides its generated container and resets the editor-header grid within the wrapper so menubar/toolbars remain full-width. It exposes the standard menubar plus a horizontally wrapping toolbar for formatting, links, images, media, tables, source code, fullscreen, and help. The native `Insert/Edit Image` dialog includes an image-only file picker for every current editor scope; it uploads through `POST /api/admin/editor-images/[scope]/upload` and fills only Source with the returned durable `/api/media/...` URL. Do not move this script into the root layout, replace it with Tiny Cloud, or store selected images as Base64/blob content.

`idv_attribute_value.api_key` is the authoritative URL value for category and search filters. It is required, lowercase, hyphen-delimited, at most 200 characters, unique within its attribute, and editable in the existing form. The guarded backfill command is dry-run by default:

```powershell
npm.cmd run db:backfill-attribute-api-keys
$env:ADMIN_WRITE_ENABLED='true'
npm.cmd run db:backfill-attribute-api-keys -- --apply --expected-database=it_tech_db --expected-updates=426 --confirm=BACKFILL_ATTRIBUTE_VALUE_API_KEYS
$env:ADMIN_WRITE_ENABLED='false'
```

Footer Menu is managed at `/content/menu/footer` through `GET/PUT /api/admin/menus/footer` and `POST /api/admin/menus/footer/publish`. Its one protected root accepts a dynamic ordered list of groups and custom links, including an explicitly empty menu; the public `GET /api/menu/footer` payload remains cacheable and keeps the same response shape.

Product and category editors manage independent buying guides through `GET/PUT /api/admin/products/[id]/buying-guide` and `GET/PUT /api/admin/product-categories/[id]/buying-guide`. PUT replaces the bounded ordered item list in one transaction and invalidates only catalog-detail response caches.

Product-card attribute rules are managed at `/product/card-attributes` through `GET/PUT /api/admin/product-card-attribute-rules`. The editor Preview chooses an enabled positive-price SKU from the selected category first, then its active descendant categories, so rules configured on a parent can be previewed against descendant inventory. Preview applies the same first-rule-wins contract as saving when drafts repeat an `attribute + slot`, and removes repeated legacy attribute values before rendering stable badge keys. This is read-only sample selection and does not change rule inheritance or public badge projection.

Product groups are managed through `GET/POST /api/admin/product-groups`, `GET/PUT/DELETE /api/admin/product-groups/[id]`, and the existing product catalog with assignment filters. In the editor, each attribute is an independent two-column desktop section: attribute/value controls are on the left and the group SKU table for that attribute is on the right. New attributes are prepended and focused. A SKU value select can create a value inline; confirmation reuses a case-insensitive match or blank slot when possible, otherwise appends the value, and selects it for that SKU in the same state update. Value payloads contain only identity, name, description, and ordering; legacy value image/color fields are rejected. Writes reconcile legacy IDs and PHP-serialized SKU mappings in one transaction; each product may belong to only one group.

Product promotions are managed through `GET/POST /api/admin/product-promotions` and `GET/PUT/DELETE /api/admin/product-promotions/[id]`. Writes require `marketing.product_promotions` permissions and `ADMIN_WRITE_ENABLED=true`, replace SKU/category scopes transactionally, validate supplied internal/HTTPS links and Vietnam-time ranges, and invalidate catalog-detail caches. `detailUrl` is optional: an empty string is retained in the existing non-null column and public/admin presentation omits `Xem chi tiết`; `displayOrder` is an integer from `0` to `65535`, with blank input normalized to `0`.

Flash Sale is managed at `/sales/flash-sales`. Admin reads/writes use `GET/POST /api/admin/flash-sales`, `GET/PUT /api/admin/flash-sales/[id]`, and the dedicated `POST .../[id]/publish` / `POST .../[id]/pause` transitions. RBAC uses `marketing.flash_sales.*`; writes also require same-origin admin session, audit logging, optimistic revisions, and `ADMIN_WRITE_ENABLED=true`. A normal create/update cannot change publication status, so `update` cannot bypass `publish` permission.

Public `GET /api/flash-sales` exposes only active/upcoming campaign display data and derived promotional availability. Cart quote and order creation always re-read current product price and Flash Sale quota. Order creation reserves quota in the existing order transaction; completed orders consume it and cancelled/failed orders release it. Exclusive campaigns invalidate a requested voucher. Enable the runtime only after the guarded procedure in `database-docs/FLASH_SALE_MIGRATION.md`.

Saving the product editor's `combo` section preserves its original TinyMCE HTML in `idv_sell_product_store.specialOffer` and invalidates catalog-detail caches. Public reads sanitize at projection time: safe foreground/background colors, emphasis, decoration, alignment and internal/HTTPS text links are retained; scripts, handlers, unsafe CSS/URLs and embedded media/form/table content are removed.

### Health and webhook

- `GET /api/health/live`: process liveness.
- `GET /api/health/ready`: DB and required runtime-table readiness.
- `POST /api/webhook/update-search`: requires `X-Webhook-Timestamp`, `X-Webhook-Nonce`, and `X-Webhook-Signature`.

Signature input is `${timestamp}.${nonce}.${rawBody}` using HMAC SHA-256 with `SEARCH_WEBHOOK_SECRET`. Reject stale timestamps and reused nonces.

## Public error contract

Hardened public write routes return:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Vietnamese user-facing message",
    "fields": { "field": "Field error" },
    "requestId": "correlation id"
  }
}
```

Responses include `X-Request-ID`. Rate-limit responses use HTTP `429` plus `Retry-After`. Never return raw exceptions or SQL details.

## Password, session, and CAPTCHA rules

- New customer/admin password hashes use Argon2id. Continue reading bcrypt hashes and rehash after successful verification.
- Store only hashed session/OTP/idempotency/rate-limit identifiers where designed.
- Production session cookies are `Secure`, `HttpOnly`, `SameSite=Lax`, path `/`, and prefer `__Host-*` names.
- reCAPTCHA verification checks success, expected action, configurable score, allowed hostname, and two-minute challenge age. Use shadow mode before production enforcement.

Configure the secret and verifier policy only in `D:\web-tech\web-admin\.env.local`:

```env
RECAPTCHA_SECRET_KEY=your_private_secret_key
NEXT_PUBLIC_RECAPTCHA_SITE_KEY=your_public_site_key
RECAPTCHA_SCORE_THRESHOLD=0.5
RECAPTCHA_ALLOWED_HOSTNAMES=localhost,storefront.example.com
RECAPTCHA_SHADOW_MODE=false
RECAPTCHA_DEVELOPMENT_BYPASS=false
STOREFRONT_ORIGIN=http://localhost:3001
```

The admin login page also uses this public site key, so a production `next start` build requires both keys in `web-admin/.env.local`. The public key may be shared with the storefront only when it belongs to the same Google reCAPTCHA key pair and permits the local hostname.

For local development without Google, leave the frontend site key empty and set `RECAPTCHA_DEVELOPMENT_BYPASS=true` here. The verifier ignores this bypass when `NODE_ENV=production`. SMTP-backed OTP additionally requires `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, and `SMTP_FROM`; SMTP does not replace CAPTCHA. Restart both applications after environment changes and never copy `RECAPTCHA_SECRET_KEY` into the storefront.

## Cache and search

- Worker-local public caches are bounded and use normalized keys.
- `web_admin_cache_versions` propagates invalidation between clustered API workers.
- Search prewarms at process start and uses single-flight/stale data during rebuild.
- The exact normalized query `pc` uses a positive product-title intent gate: names must start with `PC`, `Bộ PC`, or `Full bộ PC`. This rejects prefix-only `PCM`/`PCIe`/`PCE` matches and accessory titles such as `RAM PC` or `Case ... PC` while retaining complete PC bundles that mention included monitors or Windows.
- The same strict-intent registry canonicalizes exact `win 11`/`win11`/`windows 11` searches to `windows 11` and exact `mic`/`micro` searches to `mic`. Positive title predicates keep only standalone Windows 11 software, microphones, HDDs, or speakers for exact `hdd` and `loa`; queries with additional qualifiers use the general search path.
- Storage synonyms are deliberately type-safe: `ssd` maps to `o cung the ran`, `hdd` maps to `o cung co`, and generic `o cung` is not expanded into either type. Strict candidate filtering runs before price/attribute filters, sort, pagination and facets.
- These rules require no migration or `search:rebuild`. Restart API workers after deployment so their lexical and public-response caches reload the new rules.
- `product_data_search`, its normalize function, triggers, and FK remain part of the production search contract.
- `search-tool` is not runtime code.

## Upload rules

- Resolve all destinations under `MEDIA_ROOT` and use randomized file names.
- Enforce body/file size, extension allowlist, declared MIME, and binary image signature.
- Rich-text image uploads accept one JPEG, PNG, WebP or GIF file up to 10 MB, require the editor scope's existing update permission, and store it under `rich-text/<scope>/<ddMMyyyy>/<uuid>.<ext>` without adding database metadata.
- Product albums support `product`, `self`, and `customer`; keep legacy thumbnail/image collection/count synchronized while legacy readers exist.

## Database status

The active local database is `it_tech_db`; `hanoi23_db` remains the read-only legacy source. The accepted live catalog has 788 categories, 90 brands, 4,712 products, and 4,712 search rows. After the additive page-view migration on `2026-07-16`, read-only verification found 292 physical tables: 164 InnoDB and 128 MyISAM, with no importer recovery/stage/restore tables and no Latin-1 tables or columns. PCM is the canonical target for source brand `0` and owns 2,276 products, including 849 enabled products.

This does not prove migration state in any other environment. Follow `database-docs/ADMIN_MIGRATION_GUIDE.md`, and use `database-docs/DATABASE_TRANSFER.md` for full export/import or machine migration.

## Verification status

The `2026-07-15` working-tree audit passed web-admin TypeScript, ESLint, production build, 104/104 unit tests, and 6 integration tests with 7 explicit fixture/safety skips. Both application npm audits found zero known vulnerabilities. Strict local health returned 13/15 because both configured collection probes correctly return 404 with the current empty collection catalog; `LOCAL_HEALTHCHECK_EMPTY_CATALOG=true` returned 15/15 while MySQL was healthy. At audit end MySQL was no longer listening and readiness returned 503, so restart/identify it and rerun runtime checks before further database work. Full 1,500-VU target testing remains pending. Exact evidence is in `../PROJECT_AUDIT_2026-07-15.md`.

Current `2026-07-16` verification passes both applications' TypeScript, quiet ESLint and production build, 144/144 backend unit tests and the default integration suite at 17 pass/7 safety- or fixture-gated skips. The strict-PC live ranking regression traverses every result page under default/price/newest ordering, and storefront smoke canonicalizes `?q=PC&page=27` to page 25 with 580 products and zero invalid cards. The controlled four-worker storefront Playwright run remains 107 checks with 19 expected skips across 126 cases. Strict health is 13/15 for the two documented collection 404s and empty-catalog mode passes 15/15.
