import zlib from "node:zlib";

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function u16(value) { const buffer = Buffer.alloc(2); buffer.writeUInt16LE(value, 0); return buffer; }
function u32(value) { const buffer = Buffer.alloc(4); buffer.writeUInt32LE(value >>> 0, 0); return buffer; }

export function createQualityIndexZip(entries) {
  const localParts = [];
  const centralParts = [];
  let offset = 0;
  for (const entry of entries) {
    const name = Buffer.from(entry.name.replaceAll("\\", "/"), "utf8");
    const source = Buffer.isBuffer(entry.data) ? entry.data : Buffer.from(entry.data);
    const compressed = zlib.deflateRawSync(source);
    const checksum = crc32(source);
    const local = Buffer.concat([Buffer.from([0x50, 0x4b, 0x03, 0x04]), u16(20), u16(0x800), u16(8), u16(0), u16(0), u32(checksum), u32(compressed.length), u32(source.length), u16(name.length), u16(0), name, compressed]);
    localParts.push(local);
    const central = Buffer.concat([Buffer.from([0x50, 0x4b, 0x01, 0x02]), u16(20), u16(20), u16(0x800), u16(8), u16(0), u16(0), u32(checksum), u32(compressed.length), u32(source.length), u16(name.length), u16(0), u16(0), u16(0), u16(0), u32(0), u32(offset), name]);
    centralParts.push(central);
    offset += local.length;
  }
  const central = Buffer.concat(centralParts);
  const locals = Buffer.concat(localParts);
  const end = Buffer.concat([Buffer.from([0x50, 0x4b, 0x05, 0x06]), u16(0), u16(0), u16(entries.length), u16(entries.length), u32(central.length), u32(locals.length), u16(0)]);
  return Buffer.concat([locals, central, end]);
}

export function qualityIndexZipEntryNames(buffer) {
  const end = buffer.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
  if (end < 0) throw new Error("ZIP invalide: end of central directory absent.");
  const count = buffer.readUInt16LE(end + 10);
  const centralOffset = buffer.readUInt32LE(end + 16);
  const names = [];
  let cursor = centralOffset;
  for (let index = 0; index < count; index += 1) {
    if (buffer.readUInt32LE(cursor) !== 0x02014b50) throw new Error("ZIP invalide: entrée centrale absente.");
    const nameLength = buffer.readUInt16LE(cursor + 28);
    names.push(buffer.subarray(cursor + 46, cursor + 46 + nameLength).toString("utf8"));
    cursor += 46 + nameLength + buffer.readUInt16LE(cursor + 30) + buffer.readUInt16LE(cursor + 32);
  }
  return names;
}
