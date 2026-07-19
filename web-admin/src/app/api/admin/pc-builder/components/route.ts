import { AdminApiError, fail, ok, requireAdminWrite } from '@/lib/admin/common';
import { requireAdminPermission } from '@/lib/admin/auth';
import {
  getPcBuilderComponentConfiguration,
  pcBuilderComponentConfigurationSchema,
  savePcBuilderComponentConfiguration,
} from '@/lib/pcBuilder/configuration';

export async function GET(request: Request) {
  try {
    await requireAdminPermission(request, 'catalog.pc_builder.read');
    return ok(await getPcBuilderComponentConfiguration());
  } catch (error) { return fail(error); }
}

export async function PUT(request: Request) {
  try {
    await requireAdminWrite(request);
    const raw = await request.json().catch(() => null);
    const parsed = pcBuilderComponentConfigurationSchema.safeParse(raw);
    if (!parsed.success) {
      const fields = Object.fromEntries(parsed.error.issues.map((issue) => [issue.path.join('.'), issue.message]));
      const firstPath = parsed.error.issues[0]?.path.join('.') || '';
      const message = firstPath === 'version'
        ? 'Phiên bản cấu hình chưa được đồng bộ. Hãy tải lại dữ liệu trước khi lưu.'
        : firstPath.endsWith('.attributeId')
          ? 'Hãy chọn thuộc tính tham chiếu cho tất cả danh mục liên quan.'
          : firstPath.endsWith('.relatedComponentCode')
            ? 'Hãy chọn đầy đủ danh mục liên quan hoặc xóa dòng quan hệ đang để trống.'
            : `Cấu hình danh mục linh kiện không hợp lệ tại ${firstPath || 'payload'}.`;
      throw new AdminApiError(400, 'BAD_REQUEST', message, fields);
    }
    return ok(await savePcBuilderComponentConfiguration(parsed.data), 'Đã lưu cấu hình danh mục Build PC.');
  } catch (error) { return fail(error); }
}
