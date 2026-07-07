import path from 'node:path';
import { unlink } from 'node:fs/promises';

export function getMediaRoot() {
  return path.resolve(/*turbopackIgnore: true*/ process.env.MEDIA_ROOT || 'D:\\web-tech\\media');
}

export function isPathInside(parent: string, child: string) {
  const relative = path.relative(parent, child);
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
}

export async function deleteMediaFile(relativePath: string) {
  const mediaRoot = getMediaRoot();
  const targetPath = path.resolve(/*turbopackIgnore: true*/ mediaRoot, relativePath);
  if (isPathInside(mediaRoot, targetPath)) {
    await unlink(targetPath).catch(() => undefined);
  }
}
