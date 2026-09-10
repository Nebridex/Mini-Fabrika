import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../', import.meta.url));

test('quote form uses the backend and advertises every accepted format', async () => {
  const html = await readFile(`${root}/teklif.html`, 'utf8');
  assert.match(html, /data-backend-form/);
  assert.match(html, /accept="\.stl,\.3mf,\.obj,\.zip"/);
  assert.doesNotMatch(html, /formsubmit\.co/i);
});

test('legacy FormSubmit endpoint is absent from form sources', async () => {
  const files = ['sorular.html', 'kurumsal/index.html', 'assets/js/tracking.js'];
  for (const file of files) {
    const source = await readFile(`${root}/${file}`, 'utf8');
    assert.doesNotMatch(source, /formsubmit\.co/i, file);
  }
});
