import yauzl from 'yauzl';

const ALLOWED_EXTENSIONS = new Set([
  '.stl', '.3mf', '.obj', '.mtl',
  '.png', '.jpg', '.jpeg', '.webp', '.tif', '.tiff', '.bmp',
  '.txt', '.pdf'
]);
const ALLOWED_3MF_EXTENSIONS = new Set(['.model', '.rels', '.xml', '.png', '.jpg', '.jpeg', '.webp']);
const MAX_ENTRIES = 250;
const MAX_UNCOMPRESSED_BYTES = 500 * 1024 * 1024;
const MAX_COMPRESSION_RATIO = 100;

export class UnsafeZipError extends Error {
  constructor(message) {
    super(message);
    this.name = 'UnsafeZipError';
  }
}

function extensionOf(name) {
  const base = name.split('/').pop() || '';
  const index = base.lastIndexOf('.');
  return index > 0 ? base.slice(index).toLowerCase() : '';
}

function inspectArchive(zipPath, allowedExtensions, require3mfStructure = false) {
  return new Promise((resolve, reject) => {
    yauzl.open(zipPath, { lazyEntries: true, decodeStrings: true, validateEntrySizes: true }, (openError, zip) => {
      if (openError) return reject(new UnsafeZipError('ZIP dosyası okunamıyor veya bozuk.'));
      let entries = 0;
      let uncompressed = 0;
      let settled = false;
      let hasContentTypes = false;
      let hasModel = false;

      const fail = (message) => {
        if (settled) return;
        settled = true;
        zip.close();
        reject(new UnsafeZipError(message));
      };

      zip.on('error', () => fail('ZIP dosyası güvenli biçimde doğrulanamadı.'));
      zip.on('entry', (entry) => {
        const name = entry.fileName.replaceAll('\\', '/');
        const isDirectory = name.endsWith('/');
        entries += 1;
        uncompressed += entry.uncompressedSize;

        if (entries > MAX_ENTRIES) return fail('ZIP çok fazla dosya içeriyor.');
        if (uncompressed > MAX_UNCOMPRESSED_BYTES) return fail('ZIP açılmış boyutu güvenlik sınırını aşıyor.');
        if (name.startsWith('/') || /^[a-zA-Z]:\//.test(name) || name.split('/').includes('..')) {
          return fail('ZIP güvenli olmayan bir dosya yolu içeriyor.');
        }
        if ((entry.generalPurposeBitFlag & 0x1) !== 0) return fail('Şifreli ZIP dosyaları kabul edilmiyor.');
        const unixMode = (entry.externalFileAttributes >>> 16) & 0xffff;
        if ((unixMode & 0o170000) === 0o120000) return fail('ZIP sembolik bağlantı içeremez.');
        const lowerName = name.toLowerCase();
        if (lowerName === '[content_types].xml') hasContentTypes = true;
        if (lowerName.startsWith('3d/') && lowerName.endsWith('.model')) hasModel = true;
        if (!isDirectory && !allowedExtensions.has(extensionOf(name))) {
          return fail(`ZIP içinde izin verilmeyen dosya türü var: ${name.split('/').pop()}`);
        }
        if (entry.compressedSize > 0 && entry.uncompressedSize / entry.compressedSize > MAX_COMPRESSION_RATIO) {
          return fail('ZIP olağandışı sıkıştırma oranına sahip bir dosya içeriyor.');
        }
        zip.readEntry();
      });
      zip.on('end', () => {
        if (settled) return;
        settled = true;
        if (entries === 0) return reject(new UnsafeZipError('Boş ZIP dosyası kabul edilmiyor.'));
        if (require3mfStructure && (!hasContentTypes || !hasModel)) {
          return reject(new UnsafeZipError('3MF paketi zorunlu model yapısını içermiyor.'));
        }
        resolve({ entries, uncompressedBytes: uncompressed });
      });
      zip.readEntry();
    });
  });
}

export function inspectZip(zipPath) {
  return inspectArchive(zipPath, ALLOWED_EXTENSIONS, false);
}

export function inspect3mf(zipPath) {
  return inspectArchive(zipPath, ALLOWED_3MF_EXTENSIONS, true);
}
