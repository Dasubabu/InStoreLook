import { build } from 'esbuild';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';

/** Bundle the CSS-importing SSR smoke test with CSS treated as an empty module. */
const folder = await mkdtemp(join(process.cwd(), '.tmp-component-test-'));
const outfile = join(folder, 'productGalleryComponents.test.cjs');
try {
  await build({
    entryPoints: ['src/components/customer/productGalleryComponents.test.tsx'],
    bundle: true,
    packages: 'external',
    absWorkingDir: process.cwd(),
    platform: 'node',
    format: 'cjs',
    define: { 'import.meta.env': '{}' },
    outfile,
    loader: { '.css': 'empty' },
    sourcemap: false,
  });
  const exitCode = await new Promise<number>((resolve, reject) => {
    const child = spawn(process.execPath, ['--test', outfile], { stdio: 'inherit', cwd: process.cwd() });
    child.once('error', reject);
    child.once('exit', code => resolve(code ?? 1));
  });
  if (exitCode !== 0) process.exitCode = exitCode;
} finally {
  await rm(folder, { recursive: true, force: true });
}
