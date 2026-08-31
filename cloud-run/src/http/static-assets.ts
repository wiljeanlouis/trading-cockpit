import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize, relative, sep } from 'node:path';
import type { CloudRunHttpResponse } from '../app';

export interface StaticAssetServer {
  serve(request: { method: string; pathname: string }): Promise<CloudRunHttpResponse | null>;
}

export function createStaticAssetServer(dependencies: { webDistPath: string }): StaticAssetServer {
  const root = normalize(dependencies.webDistPath);

  return {
    async serve({ method, pathname }) {
      if (pathname === '/health' || pathname.startsWith('/api/')) return null;
      if (!['GET', 'HEAD'].includes(method)) return null;

      const assetPath = pathname === '/' ? '/index.html' : pathname;
      const direct = await readAsset(root, assetPath, method);
      if (direct) return direct;

      if (isSpaRoute(pathname)) {
        return readAsset(root, '/index.html', method);
      }

      return null;
    }
  };
}

async function readAsset(
  root: string,
  assetPath: string,
  method: string
): Promise<CloudRunHttpResponse | null> {
  const resolved = normalize(join(root, assetPath));
  if (!isInsideRoot(root, resolved)) return null;

  try {
    const fileStat = await stat(resolved);
    if (!fileStat.isFile()) return null;
    const body = await readFile(resolved);
    return {
      statusCode: 200,
      headers: {
        'Content-Type': contentTypeForPath(resolved),
        'Cache-Control': cacheControlForPath(resolved)
      },
      body: method === 'HEAD' ? null : body
    };
  } catch {
    return null;
  }
}

function isSpaRoute(pathname: string): boolean {
  return !extname(pathname);
}

function isInsideRoot(root: string, resolved: string): boolean {
  const path = relative(root, resolved);
  return Boolean(path) && !path.startsWith('..') && !path.includes(`..${sep}`);
}

function contentTypeForPath(pathname: string): string {
  switch (extname(pathname)) {
    case '.html':
      return 'text/html; charset=utf-8';
    case '.js':
      return 'text/javascript; charset=utf-8';
    case '.css':
      return 'text/css; charset=utf-8';
    case '.svg':
      return 'image/svg+xml';
    case '.json':
      return 'application/json; charset=utf-8';
    case '.png':
      return 'image/png';
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg';
    case '.ico':
      return 'image/x-icon';
    default:
      return 'application/octet-stream';
  }
}

function cacheControlForPath(pathname: string): string {
  return pathname.endsWith('index.html') ? 'no-cache' : 'public, max-age=31536000, immutable';
}
