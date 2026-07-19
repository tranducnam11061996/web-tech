import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    { success: false, error: { code: "PC_BUILDER_AUTO_DISABLED", message: "Gaming Auto và release gate đang tạm dừng trong giai đoạn catalog-live." } },
    { status: 503 },
  );
}
