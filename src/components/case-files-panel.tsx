'use client';

import * as React from 'react';
import { FileText, Loader2, Upload, Download, ExternalLink, AlertCircle } from 'lucide-react';
import { Card } from '@/components/ui';

type CaseFile = {
  id: string;
  name: string;
  kind: string;
  mime_type: string | null;
  size_bytes: number | null;
  url: string | null;
  created_at: string;
};

type FileType = { mime: string; kind: string };
const MAX_BYTES = 100 * 1024 * 1024;
const FILE_TYPES: Record<string, FileType> = {
  '.png': { mime: 'image/png', kind: 'image' },
  '.jpg': { mime: 'image/jpeg', kind: 'image' },
  '.jpeg': { mime: 'image/jpeg', kind: 'image' },
  '.webp': { mime: 'image/webp', kind: 'image' },
  '.pdf': { mime: 'application/pdf', kind: 'pdf' },
  '.doc': { mime: 'application/msword', kind: 'word' },
  '.docx': { mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', kind: 'word' },
  '.mp4': { mime: 'video/mp4', kind: 'video' },
  '.webm': { mime: 'video/webm', kind: 'video' },
  '.mp3': { mime: 'audio/mpeg', kind: 'audio' },
  '.wav': { mime: 'audio/wav', kind: 'audio' },
  '.ogg': { mime: 'audio/ogg', kind: 'audio' },
};

function safeFilename(name: string) {
  return name
    .replace(/[\/\\]/g, '_')
    .replace(/[^\w.\-\u0600-\u06ff ]/g, '_')
    .slice(0, 180) || 'case-file';
}

function readableSize(value: number | null) {
  if (!value || value <= 0) return '';
  return value >= 1024 * 1024
    ? (value / (1024 * 1024)).toFixed(1) + ' ميجابايت'
    : Math.max(1, Math.round(value / 1024)) + ' ك.ب';
}

export function CaseFilesPanel({ caseId }: { caseId: string }) {
  const [files, setFiles] = React.useState<CaseFile[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [uploading, setUploading] = React.useState(false);
  const [error, setError] = React.useState('');
  const [notice, setNotice] = React.useState('');
  const inputRef = React.useRef<HTMLInputElement>(null);

  const loadFiles = React.useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/cases/' + encodeURIComponent(caseId) + '/files', { cache: 'no-store' });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'تعذر تحميل ملفات القضية.');
      setFiles(Array.isArray(data.files) ? data.files : []);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'تعذر تحميل ملفات القضية.');
    } finally {
      setLoading(false);
    }
  }, [caseId]);

  React.useEffect(() => { void loadFiles(); }, [loadFiles]);

  const onChooseFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setError('');
    setNotice('');
    if (file.size <= 0) {
      setError('الملف فارغ.');
      return;
    }
    if (file.size > MAX_BYTES) {
      setError('حجم الملف أكبر من الحد المسموح به. الحد الأقصى 100 ميجابايت.');
      return;
    }

    const extension = file.name.toLowerCase().match(/\.[^.]+$/)?.[0] || '';
    const type = FILE_TYPES[extension];
    if (!type) {
      setError('نوع الملف غير مدعوم. استخدم صورة أو PDF أو Word أو ملف صوت أو فيديو.');
      return;
    }
    if (file.type && file.type !== type.mime) {
      setError('نوع الملف لا يتوافق مع امتداده. اختر الملف الأصلي وحاول مرة أخرى.');
      return;
    }

    setUploading(true);
    try {
      const pathname = 'cases/' + caseId + '/' + crypto.randomUUID() + '-' + safeFilename(file.name);
      const signingResponse = await fetch('/api/cases/' + encodeURIComponent(caseId) + '/files/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pathname, contentType: type.mime, size: file.size }),
      });
      const signed = await signingResponse.json().catch(() => ({}));
      if (!signingResponse.ok) throw new Error(signed.error || 'تعذر تجهيز رفع الملف إلى التخزين الخاص.');

      const form = new FormData();
      for (const [key, value] of Object.entries(signed.fields as Record<string, string>)) form.append(key, value);
      form.append('file', file);
      const storageResponse = await fetch(String(signed.uploadUrl), { method: 'POST', body: form });
      if (!storageResponse.ok) {
        throw new Error('رفض مخزن الملفات رفع الملف (HTTP ' + storageResponse.status + '). تحقق من إعدادات التخزين ثم أعد المحاولة.');
      }

      const saveResponse = await fetch('/api/cases/' + encodeURIComponent(caseId) + '/files', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: file.name, mimeType: type.mime, size: file.size, url: signed.storedUrl }),
      });
      const saved = await saveResponse.json().catch(() => ({}));
      if (!saveResponse.ok) throw new Error(saved.error || 'تم رفع الملف لكن تعذر تسجيله داخل ملف القضية.');
      setFiles((current) => [saved.file as CaseFile, ...current]);
      setNotice('تم رفع الملف وإضافته إلى ملف القضية.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'تعذر رفع ملف القضية.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <Card className="mt-5 overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-navy-100 px-5 py-4">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-black text-navy-950"><FileText size={17} className="text-gold-600" /> ملفات القضية</h2>
          <p className="mt-1 text-[10px] text-navy-400">ملفات خاصة بهذه القضية، مستقلة عن مرفقات العميل.</p>
        </div>
        <div>
          <input ref={inputRef} type="file" accept=".png,.jpg,.jpeg,.webp,.pdf,.doc,.docx,.mp4,.webm,.mp3,.wav,.ogg" className="hidden" onChange={onChooseFile} />
          <button type="button" disabled={uploading} onClick={() => inputRef.current?.click()} className="inline-flex items-center gap-2 rounded-xl bg-navy-950 px-4 py-2.5 text-xs font-extrabold text-white disabled:opacity-50">
            {uploading ? <Loader2 size={15} className="animate-spin" /> : <Upload size={15} />}
            {uploading ? 'جارٍ رفع الملف…' : 'رفع ملف للقضية'}
          </button>
        </div>
      </div>

      {error && <div role="alert" className="flex items-start gap-2 border-b border-red-100 bg-red-50 px-5 py-3 text-xs leading-6 text-red-800"><AlertCircle size={15} className="mt-1 shrink-0" />{error}</div>}
      {notice && <div role="status" className="border-b border-emerald-100 bg-emerald-50 px-5 py-3 text-xs text-emerald-800">{notice}</div>}

      {loading ? (
        <div className="flex items-center justify-center gap-2 p-8 text-xs text-navy-400"><Loader2 size={15} className="animate-spin" />جارٍ تحميل الملفات…</div>
      ) : files.length === 0 ? (
        <div className="p-7 text-center text-xs leading-6 text-navy-400">لا توجد ملفات مرفوعة لهذه القضية حتى الآن.</div>
      ) : (
        <div className="divide-y divide-navy-100">
          {files.map((file) => (
            <div key={file.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-ivory-50 text-gold-700"><FileText size={17} /></span>
                <div className="min-w-0">
                  <p className="break-words text-xs font-extrabold text-navy-800">{file.name}</p>
                  <p className="mt-1 text-[10px] text-navy-400">{file.kind}{file.size_bytes ? ' · ' + readableSize(Number(file.size_bytes)) : ''}</p>
                </div>
              </div>
              {file.url && <div className="flex shrink-0 items-center gap-2">
                <a href={file.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-lg border border-navy-200 bg-white px-3 py-2 text-[10px] font-bold text-navy-700"><ExternalLink size={13} /> فتح</a>
                <a href={file.url + '?download=1'} className="inline-flex items-center gap-1.5 rounded-lg border border-navy-200 bg-white px-3 py-2 text-[10px] font-bold text-navy-700"><Download size={13} /> تحميل</a>
              </div>}
            </div>
          ))}
        </div>
      )}
      <p className="border-t border-navy-100 px-5 py-3 text-[10px] text-navy-400">الحد الأقصى لحجم الملف 100 ميجابايت. الوصول إلى الملفات يخضع لصلاحيات القضية.</p>
    </Card>
  );
}
