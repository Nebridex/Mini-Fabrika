import { createReadStream } from 'node:fs';
import { open, stat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { inspect3mf, inspectZip } from './zip-security.js';

export const ACCEPTED_EXTENSIONS = new Set(['.stl', '.3mf', '.obj', '.zip']);

export function safeFileName(input) {
  return String(input || 'model')
    .normalize('NFKC')
    .replace(/[\r\n"\\/]/g, '_')
    .replace(/[^\p{L}\p{N}._ ()-]/gu, '_')
    .slice(0, 180);
}

export function extensionOf(name) {
  const safe = safeFileName(name);
  const index = safe.lastIndexOf('.');
  return index > 0 ? safe.slice(index).toLowerCase() : '';
}

async function prefix(path, length = 65536) {
  const handle = await open(path, 'r');
  try {
    const buffer = Buffer.alloc(length);
    const { bytesRead } = await handle.read(buffer, 0, length, 0);
    return buffer.subarray(0, bytesRead);
  } finally {
    await handle.close();
  }
}

function isZip(buffer) {
  return buffer.length >= 4 && buffer[0] === 0x50 && buffer[1] === 0x4b && [0x03, 0x05, 0x07].includes(buffer[2]);
}

function isStl(buffer, size) {
  if (buffer.length >= 84) {
    const triangles = buffer.readUInt32LE(80);
    if (84 + triangles * 50 === size) return true;
  }
  const text = buffer.toString('utf8').trimStart().toLowerCase();
  return text.startsWith('solid') && text.includes('facet');
}

function isObj(buffer) {
  if (buffer.includes(0)) return false;
  const text = buffer.toString('utf8');
  return /(^|\n)\s*(v|vn|vt|f|o|g|mtllib|usemtl)\s+/m.test(text);
}

export async function validateUpload(path, originalName) {
  const extension = extensionOf(originalName);
  if (!ACCEPTED_EXTENSIONS.has(extension)) throw new Error('Yalnızca STL, 3MF, OBJ veya ZIP yükleyebilirsiniz.');
  const fileStat = await stat(path);
  if (!fileStat.size) throw new Error('Boş dosya kabul edilmiyor.');
  const head = await prefix(path);

  if (extension === '.zip') {
    if (!isZip(head)) throw new Error('Dosya uzantısı ZIP olsa da içerik geçerli bir ZIP değil.');
    await inspectZip(path);
  } else if (extension === '.3mf') {
    if (!isZip(head)) throw new Error('Geçerli bir 3MF dosyası yükleyin.');
    await inspect3mf(path);
  } else if (extension === '.stl' && !isStl(head, fileStat.size)) {
    throw new Error('Geçerli bir STL dosyası yükleyin.');
  } else if (extension === '.obj' && !isObj(head)) {
    throw new Error('Geçerli bir OBJ dosyası yükleyin.');
  }

  const hash = createHash('sha256');
  for await (const chunk of createReadStream(path)) hash.update(chunk);
  const contentTypes = {
    '.stl': 'model/stl', '.3mf': 'model/3mf', '.obj': 'model/obj', '.zip': 'application/zip'
  };
  return {
    name: safeFileName(originalName),
    extension,
    size: fileStat.size,
    sha256: hash.digest('hex'),
    contentType: contentTypes[extension]
  };
}
