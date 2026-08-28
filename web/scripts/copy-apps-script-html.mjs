import { copyFile, mkdir } from 'node:fs/promises';

const backendBuild = new URL('../../backend/build/', import.meta.url);
await mkdir(backendBuild, { recursive: true });
await copyFile(
  new URL('../dist/index.html', import.meta.url),
  new URL('CockpitWeb.html', backendBuild)
);
