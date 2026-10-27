import { deflateRawSync, inflateRawSync } from 'node:zlib';

type ZipEntry = { name: string; data: Buffer };

function crc32(buffer: Buffer): number {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let i = 0; i < 8; i++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function zip(entries: ZipEntry[]): Buffer {
  const localParts: Buffer[] = [];
  const centralParts: Buffer[] = [];
  let offset = 0;
  for (const entry of entries) {
    const name = Buffer.from(entry.name, 'utf8');
    const raw = entry.data;
    const compressed = deflateRawSync(raw);
    const crc = crc32(raw);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0x0800, 6);
    local.writeUInt16LE(8, 8);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(compressed.length, 18);
    local.writeUInt32LE(raw.length, 22);
    local.writeUInt16LE(name.length, 26);
    local.writeUInt16LE(0, 28);
    localParts.push(local, name, compressed);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0x0800, 8);
    central.writeUInt16LE(8, 10);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(compressed.length, 20);
    central.writeUInt32LE(raw.length, 24);
    central.writeUInt16LE(name.length, 28);
    central.writeUInt16LE(0, 30);
    central.writeUInt16LE(0, 32);
    central.writeUInt16LE(0, 34);
    central.writeUInt16LE(0, 36);
    central.writeUInt32LE(0, 38);
    central.writeUInt32LE(offset, 42);
    centralParts.push(central, name);
    offset += local.length + name.length + compressed.length;
  }

  const centralSize = centralParts.reduce((sum, part) => sum + part.length, 0);
  const localSize = localParts.reduce((sum, part) => sum + part.length, 0);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(0, 4);
  end.writeUInt16LE(0, 6);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(centralSize, 12);
  end.writeUInt32LE(localSize, 16);
  end.writeUInt16LE(0, 20);
  return Buffer.concat([...localParts, ...centralParts, end]);
}

function escapeXml(value: unknown): string {
  return String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

function columnName(index: number): string {
  let n = index + 1;
  let result = '';
  while (n > 0) {
    const rem = (n - 1) % 26;
    result = String.fromCharCode(65 + rem) + result;
    n = Math.floor((n - 1) / 26);
  }
  return result;
}

export function createXlsx(headers: string[], dataRows: unknown[][], sheetName = 'Clients'): Buffer {
  const allRows: unknown[][] = [headers, ...dataRows];
  const worksheetRows = allRows.map((row, rowIndex) => {
    const cells = row.map((value, colIndex) => {
      const ref = columnName(colIndex) + (rowIndex + 1);
      const style = rowIndex === 0 ? 1 : 2;
      return '<c r="' + ref + '" s="' + style + '" t="inlineStr"><is><t xml:space="preserve">' + escapeXml(value) + '</t></is></c>';
    }).join('');
    return '<row r="' + (rowIndex + 1) + '"' + (rowIndex === 0 ? ' ht="30" customHeight="1"' : ' ht="24" customHeight="1"') + '>' + cells + '</row>';
  }).join('');
  const safeSheetName = (sheetName || 'Data').replace(/[\[\]\*\?:\/]/g, ' ').slice(0, 31) || 'Data';
  const xmlHeader = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
  const contentTypes = xmlHeader + '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>';
  const rootRels = xmlHeader + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>';
  const workbook = xmlHeader + '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="' + escapeXml(safeSheetName) + '" sheetId="1" r:id="rId1"/></sheets></workbook>';
  const workbookRels = xmlHeader + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>';
  const lastColumn = columnName(Math.max(headers.length - 1, 0));
  const lastRow = Math.max(allRows.length, 1);
  const columnWidths = headers.map((header, index) => {
    const width = Math.min(42, Math.max(16, String(header ?? '').length + 6));
    return '<col min="' + (index + 1) + '" max="' + (index + 1) + '" width="' + width + '" customWidth="1"/>';
  }).join('');
  const worksheet = xmlHeader + '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView rightToLeft="1" workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomRight" state="frozen"/></sheetView></sheetViews><cols>' + columnWidths + '</cols><sheetFormatPr defaultRowHeight="22"/><sheetData>' + worksheetRows + '</sheetData><autoFilter ref="A1:' + lastColumn + lastRow + '"/></worksheet>';
  const styles = xmlHeader + '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="3"><font><sz val="11"/><name val="Arial"/></font><font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Arial"/></font><font><sz val="10"/><name val="Arial"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF18263A"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border><border><left style="thin"><color rgb="FFD7DCE2"/></left><right style="thin"><color rgb="FFD7DCE2"/></right><top style="thin"><color rgb="FFD7DCE2"/></top><bottom style="thin"><color rgb="FFD7DCE2"/></bottom><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="3"><xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf><xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf><xf numFmtId="0" fontId="2" fillId="0" borderId="1" xfId="0" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>';
  return zip([
    { name: '[Content_Types].xml', data: Buffer.from(contentTypes, 'utf8') },
    { name: '_rels/.rels', data: Buffer.from(rootRels, 'utf8') },
    { name: 'xl/workbook.xml', data: Buffer.from(workbook, 'utf8') },
    { name: 'xl/_rels/workbook.xml.rels', data: Buffer.from(workbookRels, 'utf8') },
    { name: 'xl/worksheets/sheet1.xml', data: Buffer.from(worksheet, 'utf8') },
    { name: 'xl/styles.xml', data: Buffer.from(styles, 'utf8') },
  ]);
}

function unzip(buffer: Buffer): Map<string, Buffer> {
  const signature = Buffer.from([0x50, 0x4b, 0x05, 0x06]);
  const eocd = buffer.lastIndexOf(signature);
  if (eocd < 0 || eocd + 22 > buffer.length) throw new Error('ملف Excel غير صالح أو غير مدعوم.');
  const count = buffer.readUInt16LE(eocd + 10);
  let cursor = buffer.readUInt32LE(eocd + 16);
  const result = new Map<string, Buffer>();
  for (let i = 0; i < count; i++) {
    if (buffer.readUInt32LE(cursor) !== 0x02014b50) throw new Error('تعذر قراءة بنية ملف Excel.');
    const method = buffer.readUInt16LE(cursor + 10);
    const compressedSize = buffer.readUInt32LE(cursor + 20);
    const nameLength = buffer.readUInt16LE(cursor + 28);
    const extraLength = buffer.readUInt16LE(cursor + 30);
    const commentLength = buffer.readUInt16LE(cursor + 32);
    const localOffset = buffer.readUInt32LE(cursor + 42);
    const name = buffer.toString('utf8', cursor + 46, cursor + 46 + nameLength);
    const localNameLength = buffer.readUInt16LE(localOffset + 26);
    const localExtraLength = buffer.readUInt16LE(localOffset + 28);
    const dataStart = localOffset + 30 + localNameLength + localExtraLength;
    const compressed = buffer.subarray(dataStart, dataStart + compressedSize);
    let data: Buffer;
    if (method === 0) data = Buffer.from(compressed);
    else if (method === 8) data = inflateRawSync(compressed);
    else throw new Error('طريقة ضغط ملف Excel غير مدعومة.');
    result.set(name, data);
    cursor += 46 + nameLength + extraLength + commentLength;
  }
  return result;
}

function decodeXml(value: string): string {
  return value
    .replace(/&#x([0-9a-f]+);/gi, (_all, hex: string) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#([0-9]+);/g, (_all, num: string) => String.fromCodePoint(parseInt(num, 10)))
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&');
}

function attr(tag: string, name: string): string | null {
  const match = tag.match(new RegExp('(?:^|\\s)' + name + '="([^"]*)"'));
  return match ? decodeXml(match[1]) : null;
}

function textNodes(xml: string): string {
  return [...xml.matchAll(/<(?:[A-Za-z0-9_]+:)?t(?:\s[^>]*)?>([\s\S]*?)<\/(?:[A-Za-z0-9_]+:)?t>/g)]
    .map((match) => decodeXml(match[1]))
    .join('');
}

function excelColumnIndex(reference: string): number {
  const letters = (reference.match(/^[A-Z]+/i)?.[0] ?? 'A').toUpperCase();
  let value = 0;
  for (const letter of letters) value = value * 26 + letter.charCodeAt(0) - 64;
  return value - 1;
}

export function parseCsv(buffer: Buffer): string[][] {
  const text = buffer.toString('utf8').replace(/^\uFEFF/, '');
  const firstLine = text.split(/\r?\n/, 1)[0] ?? '';
  const candidates = [',', ';', '\t'];
  const delimiter = candidates.sort((a, b) => firstLine.split(b).length - firstLine.split(a).length)[0];
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '"') {
      if (quoted && text[i + 1] === '"') { cell += '"'; i++; }
      else quoted = !quoted;
    } else if (ch === delimiter && !quoted) {
      row.push(cell); cell = '';
    } else if ((ch === '\n' || ch === '\r') && !quoted) {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(cell); cell = '';
      if (row.some((v) => v.trim())) rows.push(row);
      row = [];
    } else cell += ch;
  }
  row.push(cell);
  if (row.some((v) => v.trim())) rows.push(row);
  return rows;
}

export function parseXlsx(buffer: Buffer): string[][] {
  const entries = unzip(buffer);
  const sharedXml = entries.get('xl/sharedStrings.xml')?.toString('utf8') ?? '';
  const shared = [...sharedXml.matchAll(/<si\b[^>]*>([\s\S]*?)<\/si>/g)].map((match) => textNodes(match[1]));
  let sheetPath = 'xl/worksheets/sheet1.xml';
  const workbook = entries.get('xl/workbook.xml')?.toString('utf8') ?? '';
  const firstSheet = workbook.match(/<sheet\b[^>]*\br:id="([^"]+)"[^>]*\/?\s*>/);
  if (firstSheet) {
    const rels = entries.get('xl/_rels/workbook.xml.rels')?.toString('utf8') ?? '';
    const relationship = [...rels.matchAll(/<Relationship\b[^>]*\/?\s*>/g)].find((match) => attr(match[0], 'Id') === firstSheet[1]);
    const target = relationship ? attr(relationship[0], 'Target') : null;
    if (target) sheetPath = target.startsWith('/') ? target.slice(1) : (target.startsWith('xl/') ? target : 'xl/' + target.replace(/^\.\//, ''));
  }
  const sheet = entries.get(sheetPath);
  if (!sheet) throw new Error('لم يتم العثور على ورقة البيانات الأولى في ملف Excel.');
  const xml = sheet.toString('utf8');
  const rows: string[][] = [];
  for (const rowMatch of xml.matchAll(/<row\b[^>]*>([\s\S]*?)<\/row>/g)) {
    const cells: string[] = [];
    for (const cellMatch of rowMatch[1].matchAll(/<c\b[^>]*>([\s\S]*?)<\/c>/g)) {
      const tagEnd = cellMatch[0].indexOf('>');
      const tag = cellMatch[0].slice(0, tagEnd + 1);
      const reference = attr(tag, 'r') ?? 'A1';
      const type = attr(tag, 't');
      let value = '';
      if (type === 'inlineStr') value = textNodes(cellMatch[1]);
      else {
        const raw = cellMatch[1].match(/<v>([\s\S]*?)<\/v>/)?.[1] ?? '';
        value = type === 's' ? (shared[Number(raw)] ?? '') : decodeXml(raw);
      }
      cells[excelColumnIndex(reference)] = value;
    }
    rows.push(cells.map((cell) => cell ?? ''));
  }
  return rows;
}

export function parseSpreadsheet(buffer: Buffer, filename: string): string[][] {
  if (filename.toLowerCase().endsWith('.csv') || !buffer.subarray(0, 2).equals(Buffer.from([0x50, 0x4b]))) return parseCsv(buffer);
  return parseXlsx(buffer);
}
