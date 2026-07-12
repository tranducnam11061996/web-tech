import crypto from 'crypto';
import { NextResponse } from 'next/server';

export function jsonWithEtag(request: Request, body: unknown, init: { status?: number; headers?: Record<string, string> } = {}) {
  const json = JSON.stringify(body);
  const etag = `W/\"${crypto.createHash('sha1').update(json).digest('base64url')}\"`;
  const headers = { 'Content-Type': 'application/json; charset=utf-8', ETag: etag, ...init.headers };
  if (request.headers.get('if-none-match') === etag) return new NextResponse(null, { status: 304, headers });
  return new NextResponse(json, { status: init.status || 200, headers });
}
