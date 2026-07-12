import pool from "../src/lib/db";
import { syncVietnamLocations } from "../src/lib/vietnamLocations";

syncVietnamLocations(true)
  .then(async (result) => {
    const [samples] = await pool.query(
      `SELECT code,name FROM web_admin_vn_provinces
       WHERE is_active=1 AND (name LIKE '%Đồng Nai' OR name LIKE '%Đắk Lắk' OR name='Thành phố Hồ Chí Minh') ORDER BY code`,
    );
    console.log(
      `Vietnam locations synced: ${result.provinces} provinces, ${result.wards} wards.`,
    );
    console.log("UTF-8 samples:", samples);
  })
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
