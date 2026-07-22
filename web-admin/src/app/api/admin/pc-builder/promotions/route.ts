import { AdminApiError, fail, ok, requireAdminWrite } from "@/lib/admin/common";
import { requireAdminPermission, writeAdminAudit } from "@/lib/admin/auth";
import {
  getPcBuilderPromotionConfiguration,
  pcBuilderPromotionConfigurationSchema,
  savePcBuilderPromotionConfiguration,
} from "@/lib/pcBuilder/promotions";

export async function GET(request: Request) {
  try {
    await requireAdminPermission(request, "catalog.pc_builder.read");
    return ok(await getPcBuilderPromotionConfiguration());
  } catch (error) { return fail(error); }
}

export async function PUT(request: Request) {
  try {
    const actor = await requireAdminWrite(request);
    const raw = await request.json().catch(() => null);
    const parsed = pcBuilderPromotionConfigurationSchema.safeParse(raw);
    if (!parsed.success) {
      const fields = Object.fromEntries(parsed.error.issues.map((issue) => [issue.path.join("."), issue.message]));
      throw new AdminApiError(400, "BAD_REQUEST", parsed.error.issues[0]?.message || "Cấu hình khuyến mãi không hợp lệ.", fields);
    }
    const data = await savePcBuilderPromotionConfiguration(parsed.data);
    await writeAdminAudit({ actorUserId: actor.id, action: "pc_builder.promotions_updated", resource: "catalog.pc_builder", request,
      metadata: { promotionCount: data.promotions.length, version: data.version } });
    return ok(data, "Đã lưu khuyến mãi Build PC.");
  } catch (error) { return fail(error); }
}
