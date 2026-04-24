import type { EpubFileEntry } from './kindleEpubEngine';

function strToU8(str: string): Uint8Array {
  return new TextEncoder().encode(str);
}

function u16le(n: number): Uint8Array {
  return new Uint8Array([n & 0xff, (n >> 8) & 0xff]);
}

function u32le(n: number): Uint8Array {
  return new Uint8Array([n & 0xff, (n >> 8) & 0xff, (n >> 16) & 0xff, (n >> 24) & 0xff]);
}

function concat(...arrays: Uint8Array[]): Uint8Array {
  const total = arrays.reduce((s, a) => s + a.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const a of arrays) {
    out.set(a, offset);
    offset += a.length;
  }
  return out;
}

function crc32(data: Uint8Array): number {
  const table = crc32Table();
  let crc = 0xffffffff;
  for (let i = 0; i < data.length; i++) {
    crc = (crc >>> 8) ^ table[(crc ^ data[i]) & 0xff];
  }
  return (crc ^ 0xffffffff) >>> 0;
}

let _crc32Table: Uint32Array | null = null;
function crc32Table(): Uint32Array {
  if (_crc32Table) return _crc32Table;
  _crc32Table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) {
      c = c & 1 ? (0xedb88320 ^ (c >>> 1)) : c >>> 1;
    }
    _crc32Table[i] = c >>> 0;
  }
  return _crc32Table;
}


interface LocalFileHeader {
  localHeader: Uint8Array;
  data: Uint8Array;
  centralHeader: Uint8Array;
  offset: number;
}

async function compressEntry(
  pathStr: string,
  content: string,
  offset: number,
  compress: boolean
): Promise<LocalFileHeader> {
  const nameBytes = strToU8(pathStr);
  const rawData = strToU8(content);
  const crc = crc32(rawData);

  let fileData = rawData;
  let method = 0;
  let compressedSize = rawData.length;

  if (compress && typeof CompressionStream !== 'undefined') {
    try {
      const cs = new CompressionStream('deflate-raw');
      const writer = cs.writable.getWriter();
      writer.write(rawData.buffer.slice(rawData.byteOffset, rawData.byteOffset + rawData.byteLength) as ArrayBuffer);
      writer.close();
      const reader = cs.readable.getReader();
      const chunks: Uint8Array[] = [];
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
      }
      const compressed = concat(...chunks);
      if (compressed.length < rawData.length) {
        fileData = compressed;
        method = 8;
        compressedSize = compressed.length;
      }
    } catch {
      // fall through — store uncompressed
    }
  }

  const modDate = 0;
  const modTime = 0;

  const localHeader = concat(
    new Uint8Array([0x50, 0x4b, 0x03, 0x04]),
    u16le(20),
    u16le(0),
    u16le(method),
    u16le(modTime),
    u16le(modDate),
    u32le(crc),
    u32le(compressedSize),
    u32le(rawData.length),
    u16le(nameBytes.length),
    u16le(0),
    nameBytes
  );

  const centralHeader = concat(
    new Uint8Array([0x50, 0x4b, 0x01, 0x02]),
    u16le(20),
    u16le(20),
    u16le(0),
    u16le(method),
    u16le(modTime),
    u16le(modDate),
    u32le(crc),
    u32le(compressedSize),
    u32le(rawData.length),
    u16le(nameBytes.length),
    u16le(0),
    u16le(0),
    u16le(0),
    u16le(0),
    u32le(0),
    u32le(offset),
    nameBytes
  );

  return { localHeader, data: fileData, centralHeader, offset };
}

export async function buildEpubBlob(entries: EpubFileEntry[]): Promise<Blob> {
  const localParts: Uint8Array[] = [];
  const centralHeaders: Uint8Array[] = [];
  let currentOffset = 0;

  for (const entry of entries) {
    const isMimetype = entry.path === 'mimetype';
    const compress = !isMimetype;

    const { localHeader, data, centralHeader } = await compressEntry(
      entry.path,
      entry.content,
      currentOffset,
      compress
    );

    localParts.push(localHeader, data);
    centralHeaders.push(centralHeader);
    currentOffset += localHeader.length + data.length;
  }

  const centralDirOffset = currentOffset;
  const centralDir = concat(...centralHeaders);
  const centralDirSize = centralDir.length;

  const eocd = concat(
    new Uint8Array([0x50, 0x4b, 0x05, 0x06]),
    u16le(0),
    u16le(0),
    u16le(entries.length),
    u16le(entries.length),
    u32le(centralDirSize),
    u32le(centralDirOffset),
    u16le(0)
  );

  const allParts = [...localParts, centralDir, eocd];
  const totalSize = allParts.reduce((s, a) => s + a.length, 0);
  const output = new Uint8Array(totalSize);
  let pos = 0;
  for (const part of allParts) {
    output.set(part, pos);
    pos += part.length;
  }

  return new Blob([output], { type: 'application/epub+zip' });
}

