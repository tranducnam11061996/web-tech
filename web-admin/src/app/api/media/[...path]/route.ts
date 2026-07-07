import path from 'node:path';
import { readFile, stat } from 'node:fs/promises';
import { NextResponse } from 'next/server';
import { getMediaRoot, isPathInside } from '@/lib/admin/media-storage';

export const runtime = 'nodejs';

const MIME_BY_EXTENSION: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
};

export async function GET(_request: Request, context: RouteContext<'/api/media/[...path]'>) {
  try {
    const params = await context.params;
    const parts = Array.isArray(params.path) ? params.path : [];
    const mediaRoot = getMediaRoot();
    const targetPath = path.resolve(/*turbopackIgnore: true*/ mediaRoot, ...parts);
    if (!isPathInside(mediaRoot, targetPath)) {
      return NextResponse.json({ success: false, message: 'Invalid media path' }, { status: 400 });
    }

    const fileStat = await stat(targetPath);
    if (!fileStat.isFile()) {
      return NextResponse.json({ success: false, message: 'Media not found' }, { status: 404 });
    }

    const file = await readFile(targetPath);
    const contentType = MIME_BY_EXTENSION[path.extname(targetPath).toLowerCase()] || 'application/octet-stream';
    return new Response(new Uint8Array(file), {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch {
    return NextResponse.json({ success: false, message: 'Media not found' }, { status: 404 });
  }
}
