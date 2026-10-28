export type ReportFormat = 'pdf' | 'excel' | 'word';
export type ReportLanguage = 'ar' | 'en' | 'fr';
export type ReportDataType = 'text' | 'number' | 'date' | 'boolean';
export type ReportCellValue = string | number | boolean | Date | null | undefined;
export type ReportColumn = {
  key: string;
  header: string;
  width?: number;
  dataType?: ReportDataType;
};
export type ReportRow = Record<string, ReportCellValue>;
export type ReportData = {
  title: string;
  columns: ReportColumn[];
  rows: ReportRow[];
  logoDataUrl?: string | null;
};
export type ExportReportOptions = ReportData & {
  format: ReportFormat;
  filename: string;
  language?: ReportLanguage;
  onPdfExport?: (filename: string) => void;
};

const MIME_XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
const MIME_DOCX = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

function localDateStamp(date = new Date()): string {
  const year = String(date.getFullYear());
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return year + '-' + month + '-' + day;
}

function safeBaseName(value: string): string {
  const cleaned = (value || 'report')
    .normalize('NFKC')
    .replace(/[\\u0000-\\u001f\\u007f\\\\/:*?"<>|]+/g, '-')
    .replace(/\\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/\\.(pdf|docx|xlsx)$/i, '')
    .replace(/-\\d{4}-\\d{2}-\\d{2}$/i, '')
    .replace(/^[.-]+|[.-]+$/g, '')
    .slice(0, 100);
  return cleaned || 'report';
}

function outputFilename(filename: string, extension: 'pdf' | 'docx' | 'xlsx'): string {
  return safeBaseName(filename) + '-' + localDateStamp() + '.' + extension;
}

function localeFor(language: ReportLanguage): string {
  if (language === 'en') return 'en-GB';
  if (language === 'fr') return 'fr-FR';
  return 'ar-EG';
}

function parseDate(value: string): Date | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const normalized = trimmed.replace(/[٠-٩]/g, (digit) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit)))
    .replace(/[۰-۹]/g, (digit) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(digit)));
  if (!/^\\d{4}-\\d{2}-\\d{2}(?:[T ].*)?$/.test(normalized)) return null;
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? null : date;
}

function numericValue(value: string): number | null {
  const normalized = value
    .replace(/[٠-٩]/g, (digit) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit)))
    .replace(/[۰-۹]/g, (digit) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(digit)))
    .replace(/[٬,\s]/g, '')
    .replace(/٫/g, '.')
    .trim();
  if (!normalized) return null;
  const number = Number(normalized);
  return Number.isFinite(number) ? number : null;
}

function normalizeExcelValue(value: ReportCellValue, column: ReportColumn): string | number | boolean | Date {
  if (value === null || value === undefined || value === '') return '';
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? '' : value;
  if (column.dataType === 'date' && typeof value === 'string') {
    return parseDate(value) ?? value;
  }
  if (column.dataType === 'number' && typeof value === 'string') {
    return numericValue(value) ?? value;
  }
  return value;
}

function wordCellText(value: ReportCellValue, column: ReportColumn, language: ReportLanguage): string {
  if (value === null || value === undefined || value === '') return '—';
  let date: Date | null = null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) date = value;
  else if (column.dataType === 'date' && typeof value === 'string') date = parseDate(value);
  if (date) return new Intl.DateTimeFormat(localeFor(language), { dateStyle: 'medium', timeStyle: 'short' }).format(date);
  if (typeof value === 'number') return new Intl.NumberFormat(localeFor(language), { maximumFractionDigits: 2 }).format(value);
  return String(value);
}

async function saveBlob(blob: Blob, filename: string): Promise<void> {
  const fileSaver = await import('file-saver');
  fileSaver.saveAs(blob, filename);
}

async function assertZipSignature(blob: Blob, label: string): Promise<void> {
  if (blob.size < 100) throw new Error('ملف ' + label + ' الناتج فارغ أو غير مكتمل.');
  const bytes = new Uint8Array(await blob.slice(0, 4).arrayBuffer());
  if (bytes[0] !== 0x50 || bytes[1] !== 0x4b || bytes[2] !== 0x03 || bytes[3] !== 0x04) {
    throw new Error('فشل التحقق من ملف ' + label + ': بصمة ZIP PK غير موجودة.');
  }
}

function parseImageDataUrl(value: string | null | undefined): { extension: 'png' | 'jpeg'; bytes: Uint8Array } | null {
  const match = value?.match(/^data:image\\/(png|jpe?g);base64,([A-Za-z0-9+/=\\s]+)$/i);
  if (!match) return null;
  const extension: 'png' | 'jpeg' = match[1].toLowerCase() === 'png' ? 'png' : 'jpeg';
  const decoded = atob(match[2].replace(/\\s/g, ''));
  const bytes = new Uint8Array(decoded.length);
  for (let index = 0; index < decoded.length; index++) bytes[index] = decoded.charCodeAt(index);
  return { extension, bytes };
}

function columnLetter(index: number): string {
  let n = index + 1;
  let result = '';
  while (n > 0) {
    const remainder = (n - 1) % 26;
    result = String.fromCharCode(65 + remainder) + result;
    n = Math.floor((n - 1) / 26);
  }
  return result;
}

async function exportExcel(options: ExportReportOptions): Promise<void> {
  const ExcelJS = await import('exceljs');
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Loutfi Law Firm';
  workbook.created = new Date();
  workbook.modified = new Date();

  const language = options.language ?? 'ar';
  const rtl = language === 'ar';
  const worksheet = workbook.addWorksheet(rtl ? 'التقرير' : language === 'fr' ? 'Rapport' : 'Report', {
    views: [{ state: 'frozen', ySplit: 2, rightToLeft: rtl }],
    properties: { defaultRowHeight: 22 },
  });
  worksheet.columns = options.columns.map((column) => ({
    key: column.key,
    width: Math.min(52, Math.max(12, column.width ?? Math.min(40, column.header.length + 8))),
  }));

  const titleRow = worksheet.addRow([options.title]);
  titleRow.height = 34;
  titleRow.getCell(1).font = { name: 'Arial', size: 15, bold: true, color: { argb: 'FF18263A' } };
  titleRow.getCell(1).alignment = { vertical: 'middle', horizontal: rtl ? 'right' : 'left' };

  if (options.logoDataUrl) {
    const image = parseImageDataUrl(options.logoDataUrl);
    if (image) {
      const imageId = workbook.addImage({
        base64: options.logoDataUrl,
        extension: image.extension,
      });
      worksheet.addImage(imageId, {
        tl: { col: Math.max(options.columns.length - 1, 0), row: 0 },
        ext: { width: 100, height: 34 },
      });
    }
  }

  const headerRow = worksheet.addRow(options.columns.map((column) => column.header));
  headerRow.height = 30;
  headerRow.eachCell((cell) => {
    cell.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF18263A' } };
    cell.alignment = { vertical: 'middle', horizontal: rtl ? 'right' : 'left', wrapText: true };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FFD7DCE2' } },
      bottom: { style: 'thin', color: { argb: 'FFD7DCE2' } },
      left: { style: 'thin', color: { argb: 'FFD7DCE2' } },
      right: { style: 'thin', color: { argb: 'FFD7DCE2' } },
    };
  });

  for (const sourceRow of options.rows) {
    const values: Record<string, string | number | boolean | Date> = {};
    for (const column of options.columns) {
      values[column.key] = normalizeExcelValue(sourceRow[column.key], column);
    }
    const row = worksheet.addRow(values);
    row.height = 25;
    options.columns.forEach((column, index) => {
      const cell = row.getCell(index + 1);
      cell.font = { name: 'Arial', size: 10, color: { argb: 'FF18263A' } };
      cell.alignment = { vertical: 'top', horizontal: rtl ? 'right' : 'left', wrapText: true };
      cell.border = {
        bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        left: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        right: { style: 'thin', color: { argb: 'FFE5E7EB' } },
      };
      if (column.dataType === 'date' && cell.value instanceof Date) cell.numFmt = 'dd/mm/yyyy hh:mm';
      if (column.dataType === 'number' && typeof cell.value === 'number') cell.numFmt = '#,##0.##';
    });
  }

  worksheet.autoFilter = {
    from: { row: 2, column: 1 },
    to: { row: worksheet.rowCount, column: options.columns.length },
  };
  const buffer = await workbook.xlsx.writeBuffer();
  const bytes = new Uint8Array(buffer);
  const stableBuffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
  const blob = new Blob([stableBuffer], { type: MIME_XLSX });
  await assertZipSignature(blob, 'Excel');
  await saveBlob(blob, outputFilename(options.filename, 'xlsx'));
}

async function exportWord(options: ExportReportOptions): Promise<void> {
  const docx = await import('docx');
  const language = options.language ?? 'ar';
  const rtl = language === 'ar';
  const locale = localeFor(language);
  const borders = {
    top: { style: docx.BorderStyle.SINGLE, size: 1, color: 'C7CED7' },
    bottom: { style: docx.BorderStyle.SINGLE, size: 1, color: 'C7CED7' },
    left: { style: docx.BorderStyle.SINGLE, size: 1, color: 'C7CED7' },
    right: { style: docx.BorderStyle.SINGLE, size: 1, color: 'C7CED7' },
    insideHorizontal: { style: docx.BorderStyle.SINGLE, size: 1, color: 'D7DCE2' },
    insideVertical: { style: docx.BorderStyle.SINGLE, size: 1, color: 'D7DCE2' },
  };
  const paragraphs: InstanceType<typeof docx.Paragraph>[] = [];
  const logo = parseImageDataUrl(options.logoDataUrl);
  if (logo) {
    paragraphs.push(new docx.Paragraph({
      alignment: docx.AlignmentType.RIGHT,
      bidirectional: rtl,
      children: [new docx.ImageRun({
        data: logo.bytes,
        transformation: { width: 105, height: 34 },
        type: logo.extension === 'jpeg' ? 'jpg' : 'png',
      })],
    }));
  }
  paragraphs.push(new docx.Paragraph({
    alignment: docx.AlignmentType.CENTER,
    bidirectional: rtl,
    spacing: { after: 180 },
    children: [new docx.TextRun({ text: options.title, bold: true, size: 32, font: 'Arial', rightToLeft: rtl })],
  }));
  const dateLabel = language === 'fr' ? 'Date d’exportation : ' : language === 'en' ? 'Export date: ' : 'تاريخ التصدير: ';
  paragraphs.push(new docx.Paragraph({
    alignment: rtl ? docx.AlignmentType.RIGHT : docx.AlignmentType.LEFT,
    bidirectional: rtl,
    spacing: { after: 260 },
    children: [new docx.TextRun({
      text: dateLabel + new Intl.DateTimeFormat(locale, { dateStyle: 'long', timeStyle: 'short' }).format(new Date()),
      size: 20,
      font: 'Arial',
      rightToLeft: rtl,
    })],
  }));

  const makeCell = (value: string, header: boolean, width: number) => new docx.TableCell({
    width: { size: width, type: docx.WidthType.PERCENTAGE },
    margins: { top: 90, bottom: 90, left: 100, right: 100 },
    borders,
    ...(header ? { shading: { fill: '18263A', color: 'FFFFFF', type: docx.ShadingType.SOLID } } : {}),
    children: [new docx.Paragraph({
      alignment: rtl ? docx.AlignmentType.RIGHT : docx.AlignmentType.LEFT,
      bidirectional: rtl,
      children: [new docx.TextRun({
        text: value,
        bold: header,
        size: header ? 18 : 17,
        font: 'Arial',
        color: header ? 'FFFFFF' : '18263A',
        rightToLeft: rtl,
      })],
    })],
  });
  const widthForColumn = (index: number) => {
    const base = Math.floor(100 / options.columns.length);
    return index === options.columns.length - 1 ? 100 - base * (options.columns.length - 1) : base;
  };
  const headerRow = new docx.TableRow({
    tableHeader: true,
    children: options.columns.map((column, index) => makeCell(column.header, true, widthForColumn(index))),
  });
  const dataRows = options.rows.map((row) => new docx.TableRow({
    children: options.columns.map((column, index) =>
      makeCell(wordCellText(row[column.key], column, language), false, widthForColumn(index)),
    ),
  }));
  const table = new docx.Table({
    width: { size: 100, type: docx.WidthType.PERCENTAGE },
    columnWidths: options.columns.map((column) => Math.max(600, Math.floor(9000 / options.columns.length))),
    visuallyRightToLeft: rtl,
    borders,
    rows: [headerRow, ...dataRows],
  });
  const document = new docx.Document({
    sections: [{
      properties: { page: { margin: { top: 720, bottom: 720, left: 720, right: 720 } } },
      children: [...paragraphs, table],
    }],
  });
  const sourceBlob = await docx.Packer.toBlob(document);
  const content = await sourceBlob.arrayBuffer();
  const blob = new Blob([content], { type: MIME_DOCX });
  await assertZipSignature(blob, 'Word');
  await saveBlob(blob, outputFilename(options.filename, 'docx'));
}

async function exportPdf(options: ExportReportOptions): Promise<void> {
  if (!options.onPdfExport) throw new Error('مسار طباعة PDF غير متاح في هذه الصفحة.');
  options.onPdfExport(outputFilename(options.filename, 'pdf'));
}

export async function exportReport(options: ExportReportOptions): Promise<void> {
  if (!options.columns.length) throw new Error('أضف عمودًا واحدًا على الأقل للتقرير.');
  if (!options.rows.length) throw new Error('لا توجد بيانات للتصدير في هذا التقرير.');
  switch (options.format) {
    case 'pdf':
      await exportPdf(options);
      return;
    case 'excel':
      await exportExcel(options);
      return;
    case 'word':
      await exportWord(options);
      return;
    default:
      throw new Error('صيغة تصدير غير مدعومة: ' + String(options.format));
  }
}
