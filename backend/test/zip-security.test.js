import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createWriteStream } from 'node:fs';
import yazl from 'yazl';
import { inspect3mf, inspectZip, UnsafeZipError } from '../src/zip-security.js';

async function makeZip(path, entries) {
  const zip = new yazl.ZipFile();
  for (const [name, content] of entries) zip.addBuffer(Buffer.from(content), name);
  zip.end();
  await new Promise((resolve, reject) => {
    const output = createWriteStream(path);
    zip.outputStream.pipe(output).on('close', resolve).on('error', reject);
  });
}

test('accepts production model bundles without extracting them', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'mf-zip-'));
  const path = join(dir, 'safe.zip');
  try {
    await makeZip(path, [['parts/model.obj', 'v 0 0 0\nf 1 1 1'], ['parts/model.mtl', 'newmtl test']]);
    const result = await inspectZip(path);
    assert.equal(result.entries, 2);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

for (const dangerous of ['run.exe', 'install.ps1', 'script.js', 'payload.bat', 'nested/archive.zip']) {
  test(`rejects ${dangerous} inside ZIP`, async () => {
    const dir = await mkdtemp(join(tmpdir(), 'mf-zip-'));
    const path = join(dir, 'unsafe.zip');
    try {
      await makeZip(path, [[dangerous, 'not actually executable']]);
      await assert.rejects(inspectZip(path), UnsafeZipError);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
}

test('accepts a structurally valid 3MF package', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'mf-3mf-'));
  const path = join(dir, 'model.3mf');
  try {
    await makeZip(path, [['[Content_Types].xml', '<Types/>'], ['3D/model.model', '<model/>']]);
    const result = await inspect3mf(path);
    assert.equal(result.entries, 2);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('rejects an executable disguised inside a 3MF package', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'mf-3mf-'));
  const path = join(dir, 'unsafe.3mf');
  try {
    await makeZip(path, [['[Content_Types].xml', '<Types/>'], ['3D/model.model', '<model/>'], ['3D/run.exe', 'x']]);
    await assert.rejects(inspect3mf(path), UnsafeZipError);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
