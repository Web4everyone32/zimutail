import { copyFile, mkdir } from 'node:fs/promises';

const dist = new URL('../dist/', import.meta.url);
await mkdir(new URL('server/', dist), { recursive: true });
await copyFile(new URL('zimutail_fit/index.js', dist), new URL('server/index.js', dist));
await copyFile(new URL('zimutail_fit/wrangler.json', dist), new URL('server/wrangler.json', dist));
