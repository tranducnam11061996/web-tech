# Admin CRUD Migration Guide

Verified implementation date: `2026-07-06`

## Purpose

Admin write APIs use two small helper tables:

- `web_admin_sequence`: allocates new product ids safely inside transactions.
- `web_admin_entity_registry`: records entities created by the new Admin API, so permanent delete is never allowed for legacy data by default.

## Run

Set a real development database URL and explicitly enable writes:

```powershell
$env:DATABASE_URL="mysql://user:password@127.0.0.1:3306/hanoi23_db"
$env:ADMIN_WRITE_ENABLED="true"
cd D:\web-tech\web-admin
npm.cmd run admin:migrate
```

The migration is idempotent and seeds `web_admin_sequence.product` from `MAX(idv_sell_product_store.id) + 1`.

## Safety Rules

- Do not run against production before authentication and authorization exist.
- Keep `ADMIN_WRITE_ENABLED` unset or different from `true` in production.
- Permanent delete is allowed only when the entity exists in `web_admin_entity_registry` and dependency checks pass.
- Legacy entities should be hidden/restored, not permanently deleted.

