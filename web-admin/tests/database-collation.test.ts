import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildCollationDdl,
  buildCollationPlanHash,
  collationMigrationPriority,
  repairUtf8BytesStoredAsLatin1,
  sortCollationTables,
} from '../src/lib/databaseCollationMigration';

test('builds convert and default-only DDL without changing unrelated tables', () => {
  assert.deepEqual(buildCollationDdl({ tableName: 'legacy_table', tableCollation: 'latin1_swedish_ci', latin1Columns: 2, utf8mb3Columns: 0 }), {
    mode: 'convert',
    ddl: 'ALTER TABLE `legacy_table` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci',
  });
  assert.deepEqual(buildCollationDdl({ tableName: 'numeric_table', tableCollation: 'latin1_swedish_ci', latin1Columns: 0, utf8mb3Columns: 0 }), {
    mode: 'default-only',
    ddl: 'ALTER TABLE `numeric_table` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci',
  });
  assert.throws(() => buildCollationDdl({ tableName: 'bad`name', tableCollation: 'latin1_swedish_ci', latin1Columns: 1, utf8mb3Columns: 0 }), /Unsafe SQL identifier/);
});

test('repairs valid UTF-8 bytes stored in a latin1 column', () => {
  const repaired = repairUtf8BytesStoredAsLatin1({
    id: 3,
    currentText: 'Banner bÃªn pháº£i',
    originalHex: Buffer.from('Banner bên phải', 'utf8').toString('hex'),
  });
  assert.equal(repaired.repairedText, 'Banner bên phải');
  assert.equal(repaired.changed, true);
  assert.throws(() => repairUtf8BytesStoredAsLatin1({ id: 1, currentText: '', originalHex: 'FF' }), /not a valid UTF-8/);
});

test('produces stable plan hashes and deterministic risk ordering', () => {
  assert.equal(buildCollationPlanHash({ b: 2, a: 1 }), buildCollationPlanHash({ a: 1, b: 2 }));
  const defaultPriority = collationMigrationPriority({ name: 'a', engine: 'InnoDB', rowCount: 10, mode: 'default-only', uniqueIndexCount: 0, fulltextIndexCount: 0, latin1Columns: 0 });
  const populatedPriority = collationMigrationPriority({ name: 'b', engine: 'InnoDB', rowCount: 10, mode: 'convert', uniqueIndexCount: 0, fulltextIndexCount: 0, latin1Columns: 1 });
  const sorted = sortCollationTables([
    { name: 'b', priority: populatedPriority, dataLength: 10, indexLength: 0 },
    { name: 'a', priority: defaultPriority, dataLength: 10, indexLength: 0 },
  ]);
  assert.deepEqual(sorted.map((item) => item.name), ['a', 'b']);
});
