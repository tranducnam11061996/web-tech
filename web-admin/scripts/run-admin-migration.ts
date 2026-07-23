import pool from '../src/lib/db';
import { ensureAdminTables } from '../src/lib/admin/common';
import { ensureProductImageTable } from '../src/lib/admin/images';
import { ensureHeaderMenuSeeded } from '../src/lib/admin/menus';
import { ensureBannerLocationInfrastructure, ensureBannerMetaTable } from '../src/lib/admin/banners';
import { ensureProductCardAttributeRulesTable } from '../src/lib/productCardAttributes';
import { ensureCategoryFeatureBoxTable } from '../src/lib/categoryFeatureBoxes';
import { ensureVoucherTables } from '../src/lib/vouchers';
import { ensureStorefrontOrderTables } from '../src/lib/storefrontOrders';
import { ensureCustomerAccountTables } from '../src/lib/customerAccounts';
import { ensureCustomerFavoriteTable } from '../src/lib/customerFavorites';
import { ensureAdminAccessTables } from '../src/lib/admin/auth';
import { ensurePerformanceInfrastructure } from '../src/lib/performanceInfrastructure';
import { ensureBuyingGuideTables } from '../src/lib/buyingGuides';
import { ensureComboIndexes } from '../src/lib/comboSets';
import { ensureComboSetCategoryTable } from '../src/lib/comboSetScopes';
import { ensureProductGroupIndexes, removeProductGroupValueVisualColumns } from '../src/lib/productGroups';
import { ensureProductPromotionTables } from '../src/lib/productPromotions';
import { ensureLegacyImportTables } from '../src/lib/legacyImport/tables';
import { ensureArticleCategoryMetadataTable } from '../src/lib/articleCategoryMetadata';
import { ensurePageViewInfrastructure } from '../src/lib/pageViews';
import { ensurePcBuilderTables } from '../src/lib/pcBuilder/infrastructure';

async function main() {
  if (process.env.ADMIN_WRITE_ENABLED !== 'true') throw new Error('ADMIN_WRITE_ENABLED must be true to run admin migrations.');
  await ensureAdminTables();
  await ensureAdminAccessTables();
  await ensureProductImageTable();
  await ensureHeaderMenuSeeded();
  await ensureBannerMetaTable();
  await ensureBannerLocationInfrastructure();
  await ensureProductCardAttributeRulesTable();
  await ensureCategoryFeatureBoxTable();
  await ensureArticleCategoryMetadataTable();
  await ensurePageViewInfrastructure();
  await ensureVoucherTables();
  await ensureStorefrontOrderTables();
  await ensurePerformanceInfrastructure();
  await ensurePcBuilderTables();
  await ensureCustomerAccountTables();
  await ensureCustomerFavoriteTable();
  await ensureBuyingGuideTables();
  await ensureComboIndexes();
  await ensureComboSetCategoryTable();
  await ensureProductGroupIndexes();
  await removeProductGroupValueVisualColumns();
  await ensureProductPromotionTables();
  await ensureLegacyImportTables();
  console.log('Admin migration completed.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
