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

export function matchesImageSignature(buffer: Buffer, mimeType: string) {
  if (mimeType === 'image/jpeg') return buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  if (mimeType === 'image/png') return buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a]));
  if (mimeType === 'image/gif') return buffer.length >= 6 && ['GIF87a','GIF89a'].includes(buffer.toString('ascii',0,6));
  if (mimeType === 'image/webp') return buffer.length >= 12 && buffer.toString('ascii',0,4) === 'RIFF' && buffer.toString('ascii',8,12) === 'WEBP';
  return false;
}
