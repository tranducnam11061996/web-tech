import type { RowDataPacket } from 'mysql2/promise';
import pool from '@/lib/db';
import { fail, ok, requireAdminWrite } from '@/lib/admin/common';
import { assertSameOrigin, requireAdminPermission, writeAdminAudit } from '@/lib/admin/auth';
import { extractPcBuilderProfiles } from '@/lib/pcBuilder/admin';

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const body = await request.json().catch(() => ({}));
    const apply = body?.apply === true;
    let actor = await requireAdminPermission(request, 'catalog.pc_builder.update');
    if (apply) {
      actor = await requireAdminWrite(request);
      const [dbRows] = await pool.query<RowDataPacket[]>('SELECT DATABASE() database_name');
      const actualDatabase = String(dbRows[0]?.database_name || '');
      if (body.database !== actualDatabase || actualDatabase !== 'it_tech_db') throw new Error('Database đích không đúng it_tech_db.');
      if (!/^[a-f0-9]{64}$/i.test(String(body.backupHash || ''))) throw new Error('Thiếu SHA-256 của backup đã restore-verify.');
      const expected = process.env.PC_BUILDER_CONFIRMATION_TOKEN || '';
      if (!expected || String(body.confirmationToken || '') !== expected) throw new Error('Confirmation token không hợp lệ.');
    }
    const data = await extractPcBuilderProfiles({ limit: body.limit, offset: body.offset, apply });
    await writeAdminAudit({ actorUserId: actor.id, action: apply ? 'pc_builder.extract_apply' : 'pc_builder.extract_dry_run', resource: 'catalog.pc_builder', request, metadata: { count: data.count, parserVersion: data.parserVersion } });
    return ok(data);
  } catch (error) { return fail(error); }
}
