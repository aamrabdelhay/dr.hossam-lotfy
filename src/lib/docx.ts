import { deflateRawSync } from 'node:zlib';

type ZipEntry = { name: string; data: Buffer };
export type DocxOptions = {
  title: string;
  language: 'ar' | 'en' | 'fr';
  logoDataUrl?: string | null;
  headers: string[];
  rows: string[][];
};

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

function xml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function paragraph(value: unknown, language: 'ar' | 'en' | 'fr', bold = false): string {
  const direction = language === 'ar'
    ? '<w:bidi/><w:jc w:val="right"/>'
    : '<w:jc w:val="left"/>';
  const runProps = bold ? '<w:rPr><w:b/><w:sz w:val="22"/></w:rPr>' : '<w:rPr><w:sz w:val="20"/></w:rPr>';
  return '<w:p><w:pPr>' + direction + '</w:pPr><w:r>' + runProps + '<w:t xml:space="preserve">' + xml(value) + '</w:t></w:r></w:p>';
}

function logoParagraph(extension: string, relationshipId: string): string {
  return '<w:p><w:pPr><w:jc w:val="right"/></w:pPr><w:r><w:drawing>' +
    '<wp:inline distT="0" distB="0" distL="0" distR="0">' +
    '<wp:extent cx="1371600" cy="457200"/><wp:effectExtent l="0" t="0" r="0" b="0"/>' +
    '<wp:docPr id="1" name="Loutfi Law Firm Logo"/>' +
    '<wp:cNvGraphicFramePr><a:graphicFrameLocks noChangeAspect="1"/></wp:cNvGraphicFramePr>' +
    '<a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">' +
    '<pic:pic><pic:nvPicPr><pic:cNvPr id="0" name="Loutfi logo.' + extension + '"/><pic:cNvPicPr/></pic:nvPicPr>' +
    '<pic:blipFill><a:blip r:embed="' + relationshipId + '"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill>' +
    '<pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="1371600" cy="457200"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr>' +
    '</pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r></w:p>';
}

function tableCell(value: unknown, language: 'ar' | 'en' | 'fr', isHeader: boolean, width: number): string {
  const shade = isHeader ? '<w:shd w:fill="18263A"/>' : '';
  const color = isHeader ? '<w:color w:val="FFFFFF"/>' : '<w:color w:val="18263A"/>';
  const direction = language === 'ar' ? '<w:bidi/><w:jc w:val="right"/>' : '<w:jc w:val="left"/>';
  const props = '<w:tcPr><w:tcW w:w="' + width + '" w:type="dxa"/>' + shade +
    '<w:tcBorders><w:top w:val="single" w:sz="4" w:color="D7DCE2"/><w:left w:val="single" w:sz="4" w:color="D7DCE2"/><w:bottom w:val="single" w:sz="4" w:color="D7DCE2"/><w:right w:val="single" w:sz="4" w:color="D7DCE2"/></w:tcBorders></w:tcPr>';
  const run = '<w:r><w:rPr>' + (isHeader ? '<w:b/>' : '') + color + '<w:sz w:val="18"/></w:rPr><w:t xml:space="preserve">' + xml(value) + '</w:t></w:r>';
  return '<w:tc>' + props + '<w:p><w:pPr>' + direction + '</w:pPr>' + run + '</w:p></w:tc>';
}

function table(headers: string[], rows: string[][], language: 'ar' | 'en' | 'fr'): string {
  const columnWidth = Math.max(900, Math.floor(9300 / Math.max(1, headers.length)));
  const makeRow = (cells: unknown[], header: boolean) => {
    const trPr = header ? '<w:trPr><w:tblHeader/></w:trPr>' : '';
    const cellXml = cells.map((cell) => tableCell(cell, language, header, columnWidth)).join('');
    return '<w:tr>' + trPr + cellXml + '</w:tr>';
  };
  const bidi = language === 'ar' ? '<w:bidiVisual/>' : '';
  const tblPr = '<w:tblPr><w:tblW w:w="0" w:type="auto"/><w:tblLayout w:type="fixed"/>' + bidi +
    '<w:tblBorders><w:top w:val="single" w:sz="4" w:color="D7DCE2"/><w:left w:val="single" w:sz="4" w:color="D7DCE2"/><w:bottom w:val="single" w:sz="4" w:color="D7DCE2"/><w:right w:val="single" w:sz="4" w:color="D7DCE2"/><w:insideH w:val="single" w:sz="4" w:color="D7DCE2"/><w:insideV w:val="single" w:sz="4" w:color="D7DCE2"/></w:tblBorders></w:tblPr>';
  const grid = '<w:tblGrid>' + headers.map(() => '<w:gridCol w:w="' + columnWidth + '"/>').join('') + '</w:tblGrid>';
  const bodyRows = rows.map((row, index) => makeRow(row, false)).join('');
  return '<w:tbl>' + tblPr + grid + makeRow(headers, true) + bodyRows + '</w:tbl>';
}

export function createDocx(options: DocxOptions): Buffer {
  const { title, language, headers, rows } = options;
  const logoMatch = options.logoDataUrl?.match(/^data:image\/(png|jpe?g);base64,([A-Za-z0-9+/=\s]+)$/i);
  let logoData: Buffer | null = null;
  let logoExtension = 'png';
  let logoMime = 'image/png';
  if (logoMatch) {
    logoExtension = logoMatch[1].toLowerCase() === 'png' ? 'png' : 'jpeg';
    logoMime = logoExtension === 'png' ? 'image/png' : 'image/jpeg';
    logoData = Buffer.from(logoMatch[2].replace(/\s/g, ''), 'base64');
    if (!logoData.length || logoData.length > 1_500_000) logoData = null;
  }

  const xmlHeader = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
  const contentTypes = xmlHeader +
    '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
    '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
    '<Default Extension="xml" ContentType="application/xml"/>' +
    (logoData ? '<Default Extension="' + logoExtension + '" ContentType="' + logoMime + '"/>' : '') +
    '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>' +
    '<Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>' +
    '</Types>';
  const rootRels = xmlHeader +
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
    '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>' +
    '</Relationships>';
  const rels = xmlHeader +
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
    '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>' +
    (logoData ? '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/loutfi-logo.' + logoExtension + '"/>' : '') +
    '</Relationships>';
  const documentParagraphs = [
    logoData ? logoParagraph(logoExtension, 'rId2') : paragraph('LOUTFI LAW FIRM · EST. 1949', language, true),
    paragraph(title, language, true),
    paragraph((language === 'ar' ? 'تاريخ إعداد التقرير: ' : language === 'fr' ? 'Date du rapport : ' : 'Report date: ') + new Date().toLocaleDateString(language === 'ar' ? 'ar-EG' : language === 'fr' ? 'fr-FR' : 'en-GB'), language, false),
    '<w:p/>',
    table(headers, rows, language),
    '<w:p/>',
    paragraph('LOUTFI LAW FIRM · EST. 1949', language, true),
  ].join('');
  const document = xmlHeader +
    '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">' +
    '<w:body>' + documentParagraphs +
    '<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="850" w:right="850" w:bottom="850" w:left="850" w:header="425" w:footer="425" w:gutter="0"/></w:sectPr>' +
    '</w:body></w:document>';
  const styles = xmlHeader +
    '<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">' +
    '<w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:eastAsia="Arial" w:cs="Arial"/><w:sz w:val="20"/></w:rPr></w:rPrDefault>' +
    '<w:pPrDefault><w:pPr><w:spacing w:after="100" w:line="260" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults>' +
    '<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial"/></w:rPr></w:style>' +
    '</w:styles>';

  const entries: ZipEntry[] = [
    { name: '[Content_Types].xml', data: Buffer.from(contentTypes, 'utf8') },
    { name: '_rels/.rels', data: Buffer.from(rootRels, 'utf8') },
    { name: 'word/document.xml', data: Buffer.from(document, 'utf8') },
    { name: 'word/styles.xml', data: Buffer.from(styles, 'utf8') },
    { name: 'word/_rels/document.xml.rels', data: Buffer.from(rels, 'utf8') },
  ];
  if (logoData) entries.push({ name: 'word/media/loutfi-logo.' + logoExtension, data: logoData });
  return zip(entries);
}
