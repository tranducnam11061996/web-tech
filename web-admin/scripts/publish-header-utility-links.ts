import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { loadEnvConfig } from '@next/env';
import type { RowDataPacket } from 'mysql2/promise';

loadEnvConfig(process.cwd());

const SNAPSHOT_ROOT = path.join(process.cwd(), 'var', 'migrations', 'header-menu-utility-links');
const LOCK_NAME = 'web_admin_header_utility_links_publish';

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .filter(([key]) => key !== 'id')
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, nested]) => [key, canonicalize(nested)]),
  );
}

function sha256(value: unknown) {
  return createHash('sha256').update(JSON.stringify(canonicalize(value))).digest('hex');
}

function protectedMenuState(menu: Record<string, unknown>, settings: unknown) {
  const { utilityLinks: _utilityLinks, ...protectedAreas } = menu;
  return { settings, menu: protectedAreas };
}

async function main() {
  if (process.env.ADMIN_WRITE_ENABLED !== 'true') {
    throw new Error('ADMIN_WRITE_ENABLED=true is required to publish header utility links.');
  }

  const [{ default: pool }, menuService, utilityContract] = await Promise.all([
    import('../src/lib/db'),
    import('../src/lib/admin/menus'),
    import('../src/lib/headerMenuUtilities'),
  ]);
  const connection = await pool.getConnection();
  let lockAcquired = false;
  let draftChanged = false;
  let published = false;
  let originalState: Awaited<ReturnType<typeof menuService.getHeaderMenuAdmin>> | null = null;

  try {
    const [databaseRows] = await connection.query<RowDataPacket[]>('SELECT DATABASE() AS databaseName');
    const databaseName = String(databaseRows[0]?.databaseName || '');
    if (databaseName !== 'it_tech_db') throw new Error(`Expected database it_tech_db, received ${databaseName || '(none)'}.`);

    const [lockRows] = await connection.query<RowDataPacket[]>('SELECT GET_LOCK(?, 10) AS acquired', [LOCK_NAME]);
    lockAcquired = Number(lockRows[0]?.acquired || 0) === 1;
    if (!lockAcquired) throw new Error('Could not acquire the header utility publish lock.');

    originalState = await menuService.getHeaderMenuAdmin();
    const protectedHash = sha256(protectedMenuState(originalState.menu, originalState.settings));
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const snapshotPath = path.join(SNAPSHOT_ROOT, `${timestamp}.json`);
    await mkdir(SNAPSHOT_ROOT, { recursive: true });
    await writeFile(snapshotPath, JSON.stringify({
      capturedAt: new Date().toISOString(),
      databaseName,
      protectedHash,
      draft: originalState.draft,
      published: originalState.published,
      settings: originalState.settings,
      menu: originalState.menu,
    }, null, 2), 'utf8');

    const utilityLinks = utilityContract.HEADER_UTILITY_DEFINITIONS.map((item, ordering) => ({
      nodeType: 'link' as const,
      label: item.label,
      iconKey: item.iconKey,
      badgeText: '',
      suffixText: '',
      backgroundColor: '',
      imageUrl: '',
      subText: '',
      linkMode: 'system' as const,
      customUrl: item.systemKey,
      urlOverride: '',
      ordering,
      isActive: true,
      desktopVisible: true,
      mobileVisible: true,
      children: [],
    }));
    const nextMenu = { ...originalState.menu, utilityLinks };

    await menuService.saveHeaderMenuDraft(nextMenu, originalState.settings);
    draftChanged = true;
    const savedState = await menuService.getHeaderMenuAdmin();
    const savedProtectedHash = sha256(protectedMenuState(savedState.menu, savedState.settings));
    if (savedProtectedHash !== protectedHash) throw new Error('Protected header menu areas changed while replacing utility links.');

    const savedUtilities = savedState.menu.utilityLinks.map((item) => ({
      label: item.label,
      iconKey: item.iconKey,
      systemKey: item.customUrl,
      desktopVisible: item.desktopVisible,
      mobileVisible: item.mobileVisible,
    }));
    const expectedUtilities = utilityContract.HEADER_UTILITY_DEFINITIONS.map((item) => ({
      label: item.label,
      iconKey: item.iconKey,
      systemKey: item.systemKey,
      desktopVisible: true,
      mobileVisible: true,
    }));
    if (JSON.stringify(savedUtilities) !== JSON.stringify(expectedUtilities)) throw new Error('Saved utility link draft does not match the required contract.');

    const publishResult = await menuService.publishHeaderMenuDraft();
    published = true;
    const publicMenu = await menuService.getPublishedHeaderMenu() as Record<string, unknown>;
    const publicUtilities = (publicMenu.utilityLinks as Array<Record<string, unknown>>).map((item) => ({
      label: item.label,
      iconKey: item.iconKey,
      systemKey: item.systemKey,
      url: item.url,
      desktopVisible: item.desktopVisible,
      mobileVisible: item.mobileVisible,
    }));
    const expectedPublic = utilityContract.HEADER_UTILITY_DEFINITIONS.map((item) => ({
      label: item.label,
      iconKey: item.iconKey,
      systemKey: item.systemKey,
      url: item.url,
      desktopVisible: true,
      mobileVisible: true,
    }));
    if (JSON.stringify(publicUtilities) !== JSON.stringify(expectedPublic)) throw new Error('Published public utility links do not match the required contract.');
    if (new Set(publicUtilities.map((item) => item.systemKey)).size !== publicUtilities.length) throw new Error('Published utility links contain duplicate system keys.');

    console.log(JSON.stringify({
      ok: true,
      databaseName,
      snapshotPath,
      protectedHash,
      publishedId: publishResult.id,
      utilityLinks: publicUtilities,
    }, null, 2));
  } catch (error) {
    if (originalState && draftChanged) {
      try {
        await menuService.saveHeaderMenuDraft(originalState.menu, originalState.settings);
        if (published) await menuService.publishHeaderMenuDraft();
        console.error('Header menu state was restored after the publish failure.');
      } catch (restoreError) {
        console.error('Failed to restore the original header menu state:', restoreError);
      }
    }
    throw error;
  } finally {
    if (lockAcquired) await connection.query('SELECT RELEASE_LOCK(?)', [LOCK_NAME]);
    connection.release();
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
