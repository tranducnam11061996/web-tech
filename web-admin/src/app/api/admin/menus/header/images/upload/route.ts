import path from 'node:path';
import { access, mkdir, writeFile } from 'node:fs/promises';
import { constants } from 'node:fs';
import { AdminApiError, fail, ok, requireAdminWrite } from '@/lib/admin/common';
import { getMediaRoot, isPathInside } from '@/lib/admin/media-storage';

export const runtime = 'nodejs';

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_MIME = new Map([
  ['image/jpeg', '.jpg'],
  ['image/png', '.png'],
  ['image/webp', '.webp'],
  ['image/gif', '.gif'],
]);
const ALLOWED_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif']);

function dateFolder(date = new Date()) {
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const yyyy = String(date.getFullYear());
  return `${dd}${mm}${yyyy}`;
}

function sanitizeName(name: string, fallback: string) {
  const parsed = path.parse(name || fallback);
  const base = (parsed.name || fallback)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || fallback;
  return base.toLowerCase();
}

async function uniqueFilePath(folderPath: string, baseName: string, extension: string) {
  let counter = 0;
  while (counter < 1000) {
    const suffix = counter === 0 ? '' : `-${counter}`;
    const fileName = `${baseName}${suffix}${extension}`;
    const targetPath = path.resolve(/*turbopackIgnore: true*/ folderPath, fileName);
    try {
      await access(targetPath, constants.F_OK);
      counter += 1;
    } catch {
      return { fileName, targetPath };
    }
  }
  throw new AdminApiError(409, 'CONFLICT', 'Không thể tạo tên file không trùng');
}

function mediaUrl(relativePath: string) {
  return `/api/media/${relativePath.split('/').map(encodeURIComponent).join('/')}`;
}

export async function POST(request: Request) {
  try {
    await requireAdminWrite(request);
    const formData = await request.formData();
    const file = formData.get('file');
    if (typeof file !== 'object' || file === null || !('arrayBuffer' in file)) {
      throw new AdminApiError(400, 'BAD_REQUEST', 'Chưa chọn file ảnh');
    }
    if (file.size > MAX_FILE_SIZE) throw new AdminApiError(400, 'BAD_REQUEST', 'Dung lượng ảnh tối đa là 5MB');

    const mimeType = String(file.type || '').toLowerCase();
    const originalExt = path.extname(file.name || '').toLowerCase();
    const extension = originalExt === '.jpeg' ? '.jpg' : originalExt || ALLOWED_MIME.get(mimeType) || '';
    if (!ALLOWED_MIME.has(mimeType) || !ALLOWED_EXTENSIONS.has(extension)) {
      throw new AdminApiError(400, 'BAD_REQUEST', 'Chỉ hỗ trợ ảnh jpg, png, webp hoặc gif');
    }

    const mediaRoot = getMediaRoot();
    const dayFolder = dateFolder();
    const relativeFolder = `header-menu/${dayFolder}`;
    const folderPath = path.resolve(/*turbopackIgnore: true*/ mediaRoot, 'header-menu', dayFolder);
    if (!isPathInside(mediaRoot, folderPath)) throw new AdminApiError(400, 'BAD_REQUEST', 'Đường dẫn media không hợp lệ');
    await mkdir(folderPath, { recursive: true });

    const buffer = Buffer.from(await file.arrayBuffer());
    const baseName = sanitizeName(file.name, `circle-story-${Date.now()}`);
    const { fileName, targetPath } = await uniqueFilePath(folderPath, baseName, extension);
    if (!isPathInside(mediaRoot, targetPath)) throw new AdminApiError(400, 'BAD_REQUEST', 'Đường dẫn file không hợp lệ');
    await writeFile(targetPath, buffer);

    const relativePath = `${relativeFolder}/${fileName}`;
    return ok({ fileName, relativePath, url: mediaUrl(relativePath) }, 'Tải ảnh thành công');
  } catch (error) {
    return fail(error);
  }
}
