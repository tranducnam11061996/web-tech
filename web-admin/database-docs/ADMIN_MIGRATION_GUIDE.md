# Admin and Search Migration Guide

Last verified: `2026-07-16`

Read this before any schema-changing command. The configured local database has received the latest additive admin migration; no other environment should be assumed migrated.

## Safety rules

- Identify and back up the target database before enabling writes.
- Admin migration requires `ADMIN_WRITE_ENABLED=true`; this guard must remain in place.
- Run migrations from `D:\web-tech\web-admin` with production secrets supplied outside Git.
- Do not modify legacy engines, collations, columns, or data unless a dedicated migration/rollback plan explicitly requires it.
- Prefer additive, idempotent `CREATE TABLE IF NOT EXISTS`/compatible helper-column changes.
- After migration, verify readiness, table/index definitions, application build, and core smoke flows before serving traffic.

## Configured local database state

### Collation migration

Phase 1 completed on `it_tech_db` with plan `15f0f236257b0214617d6b3f0ec8b04d02aad19989d91f04f8044665fc5782e6`. Audit/apply/verify artifacts live outside Git under `var/migrations/collation`. The apply command must use the exact audit file as `--baseline-plan`; it verifies the stored plan hash and safely skips tables already at target on resume. A session-only permissive SQL mode is used during legacy table rebuilds so existing zero-date defaults remain byte/contract compatible, then the original session mode is restored.

Phase 2 and accepted recovery cleanup are complete. Runs 2–8 have closed rollback windows, their run-scoped recovery tables were removed through the guarded cleanup, and the accepted runtime has zero Latin-1/utf8mb3 columns. Do not recreate recovery objects or attempt an ALTER back to Latin-1; rollback is restore from a verified external artifact.

### Combo migration

The combo migration ran twice successfully against identified local database `hanoi23_db` on `2026-07-12`. It verified that `(product_id,set_id)` had no duplicates, then added two `combo_set_product` indexes and three combo-order metadata columns with two indexes. For other environments, retain the same preflight. Roll back application code first; only then, if no combo orders depend on the metadata, drop `idx_web_admin_order_meta_combo`, `idx_web_admin_order_meta_type`, the three metadata columns, `idx_combo_set_product_set_product`, and `uq_combo_set_product_product_set`. Do not remove orphan legacy rows as part of this rollback.

### Product-group migration

The product-group migration ran twice successfully against local `hanoi23_db` on `2026-07-12`. It preflights duplicate `config_group_product.product_id` rows, then adds `uq_config_group_product_product(product_id)` to enforce one group per product and force-removes obsolete `config_group_attribute_value.image`/`color_code` columns after logging their non-empty counts. It does not add foreign keys or remove legacy orphans. Rollback after reverting application writes is `ALTER TABLE config_group_product DROP INDEX uq_config_group_product_product`; restoring removed value columns only restores empty schema, not discarded data.

The 285-table count (157 InnoDB and 128 MyISAM) was the empty `it_tech_db` pre-import baseline and also reflects the additive migration set present during cutover. Buying-guide and product-promotion migrations had previously completed twice against identified `hanoi23_db` to prove idempotency. Product-promotion fixtures were removed after verifying UTF-8 tables, relation FKs/indexes, mixed-scope resolution, and cascade deletion.

Active accepted `it_tech_db` has 289 physical tables (161 InnoDB and 128 MyISAM): the 288-table lean post-import schema plus the additive customer-favorites table. It contains 788 categories, 90 brands, 4,712 products, and 4,712 search rows, with no importer recovery/stage/restore tables and no Latin-1/utf8mb3 columns. These totals are verification evidence, not permission to migrate an unidentified target.

### Category-feature container-color migration

On `2026-07-16`, the configured database was read-only identified as `it_tech_db`, then captured to the restore-verified bundle `it_tech_db-pre-category-feature-container-color-2026-07-16T03-15-43-439Z.json` (SHA-256 `e7232e66509adda20ec6ebd91ab58700c2eded8b7d8f548454aab57c42f4b970`; 289 tables, 84,254 rows, one routine, two triggers). With `ADMIN_WRITE_ENABLED=true` scoped only to each command, `admin:migrate` ran twice successfully and added `web_admin_category_feature_boxes.container_background_color varchar(16) NOT NULL DEFAULT '#0f0f14'`. The write gate was then unset and the existing `category_page_enabled`/`target_url` values were verified unchanged.

Rollback starts by deploying application code that does not read/write the new column. Only after that compatibility step, and only with a fresh backup and confirmed no dependent deployment, may an operator drop this additive column. Do not remove `category_page_enabled` or `target_url` as part of this rollback.

- Admin sequence/entity registry, access/RBAC/audit infrastructure.
- Product images, managed menus, banner metadata, product-card rules, and category feature boxes.
- Product/category buying guides and ordered guide items.
- Voucher/category/redemption tables.
- Product-promotion program/product/category tables.
- Storefront customer registration/password/session/OTP/attempt/address/order-link/metrics tables.
- `web_admin_order_requests`, `web_admin_request_limits`, `web_admin_email_outbox`, `web_admin_cache_versions`, and `web_admin_webhook_nonces`.
- `web_admin_import_runs`, `web_admin_import_records`, and `web_admin_import_entity_map` for guarded legacy-import audit/mapping state.

The historical `hanoi23_db` audit found 28,763 product/search rows. Active `it_tech_db` instead has 4,712 product/search rows with zero missing search rows after PCMarket run 3.

## Admin migration

The script calls the current ensure functions for admin core/access, product images, menus, banners, badges, category feature boxes, product/category buying guides, vouchers, storefront orders, customer accounts, and performance/security infrastructure.

```powershell
cd D:\web-tech\web-admin
$env:ADMIN_WRITE_ENABLED='true'
npm.cmd run admin:migrate
```

The migration also removes the obsolete `config_group_attribute_value.image` and `color_code` columns when present. It logs the number of non-empty values before its forced drop; restore columns only from a database backup if legacy value visuals are needed again.

Without the flag the expected result is:

```text
ADMIN_WRITE_ENABLED must be true to run admin migrations.
```

Disable or unset the flag after migration if the environment should not permit admin writes.

## Search migration and rebuild

`search:migrate` creates/recreates `product_data_search`, the normalize function, insert/update triggers, and search rows. It is destructive to those search infrastructure objects and should not be run as a routine deployment step.

```powershell
npm.cmd run search:migrate
```

Use rebuild when only search text needs refreshing:

```powershell
npm.cmd run search:rebuild
```

Production search runtime is in `web-admin`; `search-tool` is historical reference only.

## Post-migration verification

```sql
SELECT COUNT(*) AS total_tables,
       SUM(engine = 'InnoDB') AS innodb_tables,
       SUM(engine = 'MyISAM') AS myisam_tables
FROM information_schema.tables
WHERE table_schema = DATABASE();
```

```sql
SELECT table_name, engine
FROM information_schema.tables
WHERE table_schema = DATABASE()
  AND table_name IN (
    'web_admin_product_images',
    'web_admin_menus',
    'web_admin_menu_versions',
    'web_admin_menu_items',
    'web_admin_banner_meta',
    'web_admin_product_card_attribute_rules',
    'web_admin_category_feature_boxes',
    'web_admin_buying_guides',
    'web_admin_buying_guide_items',
    'web_admin_vouchers',
    'web_admin_voucher_categories',
    'web_admin_voucher_redemptions',
    'web_admin_product_promotions',
    'web_admin_product_promotion_products',
    'web_admin_product_promotion_categories',
    'web_admin_storefront_customers',
    'web_admin_customer_sessions',
    'web_admin_customer_favorites',
    'web_admin_order_requests',
    'web_admin_request_limits',
    'web_admin_email_outbox',
    'web_admin_cache_versions',
    'web_admin_webhook_nonces',
    'web_admin_import_runs',
    'web_admin_import_records',
    'web_admin_import_entity_map'
  )
ORDER BY table_name;
```

```sql
SHOW CREATE TABLE web_admin_order_requests;
SHOW CREATE TABLE web_admin_request_limits;
SHOW CREATE TABLE web_admin_email_outbox;
SHOW CREATE TABLE web_admin_cache_versions;
SHOW CREATE TABLE web_admin_webhook_nonces;
SHOW CREATE TABLE web_admin_import_runs;
SHOW CREATE TABLE web_admin_import_records;
SHOW CREATE TABLE web_admin_import_entity_map;
SHOW CREATE TABLE web_admin_buying_guides;
SHOW CREATE TABLE web_admin_buying_guide_items;
SHOW INDEX FROM web_admin_customer_sessions;
SHOW INDEX FROM web_admin_voucher_redemptions;
SHOW CREATE TABLE web_admin_product_promotions;
SHOW CREATE TABLE web_admin_product_promotion_products;
SHOW CREATE TABLE web_admin_product_promotion_categories;
```

Application verification:

```powershell
npm.cmd run test:unit
npm.cmd run test:integration
npm.cmd run build
npm.cmd run start
npm.cmd run local:healthcheck
```

Confirm `/api/health/ready` returns `200`. Then smoke product images, managed content, voucher/customer/admin flows, order idempotency, outbox processing, and cache invalidation.

Buying-guide rollback is code-first: deploy code that no longer reads/writes the helper tables, take a backup, then drop `web_admin_buying_guide_items` before `web_admin_buying_guides`. Never drop them while a deployed admin can still save this content.

Product-promotion rollback is also code-first: deploy code that no longer reads/writes `productPromotions`, back up the data, then drop `web_admin_product_promotion_products` and `web_admin_product_promotion_categories` before `web_admin_product_promotions`.

## Operational inspection and cleanup

Use aggregate/status queries and avoid exposing sensitive payloads:

```sql
SELECT status, COUNT(*) FROM web_admin_order_requests GROUP BY status;
SELECT status, COUNT(*) FROM web_admin_email_outbox GROUP BY status;
SELECT cache_key, version, updated_at FROM web_admin_cache_versions ORDER BY cache_key;
SELECT COUNT(*) AS expired_limits FROM web_admin_request_limits WHERE expires_at < UTC_TIMESTAMP();
SELECT COUNT(*) AS expired_nonces FROM web_admin_webhook_nonces WHERE expires_at < UTC_TIMESTAMP();
```

The background worker removes expired runtime rows in bounded batches and sends outbox entries with retry/backoff. Do not replace it with unbounded deletes in request handlers.

## Vietnam location catalog

The admin migration creates UTF-8 helper storage for the current two-level address model without changing legacy `province_*` data. Run the explicit sync only when refreshing the last-known-good catalog:

```powershell
npm.cmd run locations:sync
```

New addresses store province/ward codes plus name snapshots; existing legacy three-tier addresses retain their legacy schema marker. Runtime should continue serving cached DB data if the upstream provider is unavailable.

## PCMarket product-category replacement

For the empty-schema cutover, bootstrap only the approved configuration whitelist; do not run the full `admin:migrate` seeder:

```powershell
npm.cmd run db:bootstrap-safe-config -- --source-database=hanoi23_db --target-database=it_tech_db --dry-run
$env:ADMIN_WRITE_ENABLED='true'
npm.cmd run db:bootstrap-safe-config -- --source-database=hanoi23_db --target-database=it_tech_db --apply --expected-hash=<sha256> --confirm=COPY_SAFE_CONFIGURATION
```

Rollback safe configuration independently with `--rollback --run-id=<id> --target-database=it_tech_db`. The rollback deletes the copied whitelist in reverse FK order and retains the audit run. Before category apply, run `db:logical-backup` with `--verify-restore`; an artifact is written only after schema/count/data hashes match in the disposable restore.

Run the dry-run first. It makes no database writes, but it does require read access to the target so schema, foreign keys/triggers, field lengths, dependency counts, and cross-entity route conflicts can be reported:

```powershell
npm.cmd run import:legacy -- --source=pcmarket --entity=product-categories --dry-run
```

Before apply, take and verify a full MySQL backup, stop catalog writes, enter the approved maintenance window, record the dry-run hash/database name, and verify there are no non-category route conflicts. Apply is intentionally blocked unless every guard is present:

```powershell
$env:ADMIN_WRITE_ENABLED='true'
npm.cmd run import:legacy -- --source=pcmarket --entity=product-categories --apply --expected-database=<name> --expected-hash=<sha256> --confirm=REPLACE_PRODUCT_CATEGORIES --backup-confirmed --maintenance-window
```

After apply, record the returned run ID; verify 788 unique IDs, 60 roots, maximum depth 3, status 722/66, unique routes, `.html` routes, inactive-category 404 behavior, remote PCMarket icons, empty product/filter state, and pending 162 attribute links. Restart all API/background workers and run the healthcheck. Do not attach products or apply pending attributes during category acceptance.

Rollback by run ID restores categories, routes, junctions, product `product_cat`, scoped voucher/promotion/banner/menu state, helper catalog configuration, and cache versions. It retains the imported category table and all backups for investigation:

```powershell
npm.cmd run import:legacy -- --source=pcmarket --entity=product-categories --rollback --run-id=<id> --expected-database=<name>
```

Never treat the MyISAM relation cleanup as transactional. If apply reports `apply_failed` after the table swap, keep maintenance mode active and invoke rollback for that run ID; do not manually delete its backup tables.

Local execution on `2026-07-13` produced safe-config run `1` and category run `2` in `it_tech_db`. Category rollback is:

```powershell
$env:ADMIN_WRITE_ENABLED='true'
npm.cmd run import:legacy -- --source=pcmarket --entity=product-categories --rollback --run-id=2 --expected-database=it_tech_db
```

## PCMarket product import

Run a fresh composite dry-run immediately before apply. The importer requires the 788-category run and an otherwise empty product/brand/attribute/config/combo catalog:

```powershell
npm.cmd run import:legacy -- --source=pcmarket --entity=products --dry-run --expected-database=it_tech_db
$env:ADMIN_WRITE_ENABLED='true'
npm.cmd run import:legacy -- --source=pcmarket --entity=products --apply --expected-database=it_tech_db --expected-hash=<fresh-composite-sha256> --confirm=IMPORT_PCMARKET_PRODUCTS --backup-confirmed --maintenance-window
```

Product run `3` used composite hash `5f1f22c6756c862131f9f46926d9d3f4c47835159a82ad4fb70891fa0bd74021`. Its verified pre-import backup is `D:\web-tech\tmp\db-backups\it_tech_db-pre-product-import-2026-07-13T09-17-52-684Z.json` with manifest SHA-256 `f632a4ea910ba8f20094f492ce6535192c77db185e8d6deb0587d87185486968`.

Rollback restores the prior catalog/search/MyISAM state and returns run 2 category-attribute records to pending:

```powershell
$env:ADMIN_WRITE_ENABLED='true'
npm.cmd run import:legacy -- --source=pcmarket --entity=products --rollback --run-id=3 --expected-database=it_tech_db
```

Do not delete run-scoped backup tables, raw snapshots, or logical backup artifacts before catalog acceptance. Product media is intentionally remote and must remain an absolute HTTPS PCMarket URL.

## PCMarket brand sync

Run a new brand dry-run immediately before apply. The source hash must be stable across both downloads and the target must still have a complete product/search state with no unexpected brand reference table:

```powershell
npm.cmd run import:legacy -- --source=pcmarket --entity=brands --dry-run --expected-database=it_tech_db
$env:ADMIN_WRITE_ENABLED='true'
npm.cmd run import:legacy -- --source=pcmarket --entity=brands --apply --expected-database=it_tech_db --expected-hash=<fresh-sha256> --confirm=SYNC_PCMARKET_BRANDS --backup-confirmed --maintenance-window
```

Applied run `5` uses SHA-256 `4ace3a4c0cc7ba7c2270e10463ce7f31e653d7c86915cdc2b13db6eeacf43eef`. The verified pre-sync backup is `D:\web-tech\tmp\db-backups\it_tech_db-pre-brand-sync-2026-07-13T10-20-37-337Z.json`, manifest `312b0ac3eef985d621120ccd71b8d1cd12c569038f31b70d301c26a4a174d09d`. Run `4` is rolled back and retained for audit after acceptance exposed an ambiguous denormalized product count.

Acceptance requires 89 brand/info rows, `utf8mb4_unicode_ci` on both, 1,209 brand-category rows, 4,712 search rows, 13 remote PCMarket logos, 91 run records, mappings `34 -> 25` and `57 -> 31`, and no alias reference in any whitelisted table. Rollback is:

```powershell
$env:ADMIN_WRITE_ENABLED='true'
npm.cmd run import:legacy -- --source=pcmarket --entity=brands --rollback --run-id=5 --expected-database=it_tech_db
```

The brand rollback restores the prior UTF-8/latin1 table definitions, MyISAM tables and InnoDB references. It is blocked while any later import run remains applied.

## PCMarket article-category import

The article-category entity is an initial import, not a merge with `hanoi23_db`. Dry-run fetches the PCMarket HTTPS endpoint twice, validates the strict paginated envelope and field limits, canonicalizes by source ID, requires equal SHA-256 hashes, and checks the identified target schema, engine, collation, `AUTO_INCREMENT`, routes, FK/triggers, and catalog invariants. Apply is blocked unless categories, articles, article links, article-category routes/registry, and article-category menu references are all empty.

```powershell
npm.cmd run import:legacy -- --source=pcmarket --entity=article-categories --dry-run --expected-database=it_tech_db
$env:ADMIN_WRITE_ENABLED='true'
npm.cmd run import:legacy -- --source=pcmarket --entity=article-categories --apply --expected-database=it_tech_db --expected-hash=<fresh-sha256> --confirm=IMPORT_ARTICLE_CATEGORIES --backup-confirmed --maintenance-window
```

Apply preserves source IDs and `.html` slugs, writes category/canonical-route/registry/import-record/map state transactionally under an advisory lock, and retains run-scoped backups. It never imports articles, synthesizes menus/SEO content, or downloads media. Any future source media must remain a validated absolute `https://pcmarket.vn/...` URL. Rollback requires the same write/database guard and restores the exact pre-run state while retaining the imported rows for investigation:

```powershell
$env:ADMIN_WRITE_ENABLED='true'
npm.cmd run import:legacy -- --source=pcmarket --entity=article-categories --rollback --run-id=<id> --expected-database=it_tech_db
```

Live run `6` applied snapshot `0a3d22d053ec9feb5f6eadf752b4191a240b5e0010515f671a84fd0a34204b04` after clone apply/verify/rollback. Acceptance matched 4 categories/routes/registry/maps/records, 0 articles/links/menu references, `AUTO_INCREMENT=76`, unchanged catalog/search/full-text/routine/trigger counts, correct UTF-8 API/storefront rendering, and 15/15 local health. The fresh rollback archive is recorded in `DATABASE_TRANSFER.md`; restore from it instead of hand-editing the live graph if run-scoped rollback cannot be used.

## PCMarket article import

The article entity requires the run-6 taxonomy, an empty article/content/junction/route/map target, a fresh two-pass source hash, and an explicit quarantine set:

```powershell
npm.cmd run import:legacy -- --source=pcmarket --entity=articles --dry-run --expected-database=it_tech_db
$env:ADMIN_WRITE_ENABLED='true'
npm.cmd run import:legacy -- --source=pcmarket --entity=articles --apply --expected-database=it_tech_db --expected-hash=<fresh-sha256> --expected-quarantined=83 --confirm=IMPORT_PCMARKET_ARTICLES --backup-confirmed --maintenance-window
```

Apply stages and verifies 705 deduplicated links before atomically swapping MyISAM `idv_article_category`, then transactionally writes 668 article/content/routes/registry/maps and 669 records. If the InnoDB transaction fails, the importer restores the original junction. Live run `7` used hash `0ef9d19c682182113ce43d70b9cb6eb21045a0fb7041287a288716c78b1fab13`; do not reuse it for a later source snapshot.

```powershell
$env:ADMIN_WRITE_ENABLED='true'
npm.cmd run import:legacy -- --source=pcmarket --entity=articles --rollback --run-id=7 --expected-database=it_tech_db --confirm=ROLLBACK_PCMARKET_ARTICLES
```

Rollback is blocked by a newer applied article run. It restores article/content/routes/registry/maps and the four pre-run category hashes transactionally, swaps back the original MyISAM junction, and retains imported/audit tables for investigation.

## Full database transfer

For exporting `it_tech_db`, verifying the archive, and importing it on another machine, follow `DATABASE_TRANSFER.md`. The verified path uses the MySQL command-line client, includes routines/triggers, records SHA-256, and restores into a disposable database before the artifact is accepted. phpMyAdmin is an optional convenience path, not the canonical backup workflow.

## Rollback principles

- Disable dependent UI/API behavior before removing any helper table; prefer forward-fix migrations.
- Do not drop search tables/functions/triggers without a replacement synchronization path.
- Do not delete uploaded files outside the verified `MEDIA_ROOT` path.
- Preserve legacy product image fields before disabling the helper-table reader/writer.
- Never attempt to roll back a transaction across MyISAM tables as though it were fully transactional.
