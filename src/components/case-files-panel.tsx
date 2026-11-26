'use client';

import * as React from 'react';
import { FileText, Loader2, Upload, Download, ExternalLink, AlertCircle } from 'lucide-react';
import { Card } from '@/components/ui';
import { FileDeletionRequestButton } from '@/components/file-deletion-request-button';
import { FileShareButton } from '@/components/file-share-button';

import { enhanceDocument } from '@/lib/doc-enhance';

type CaseFile = {
  id: string;
  name: string;
  kind: string;
  mime_type: string | null;
  size_bytes: number | null;
  url: string | null;
  created_at: string;
  doc_type?: string | null;
  tags?: string[];
  version_of?: string | null;
  version_no?: number;
  review_status?: string | null;
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
  // Court bundle (item 124): the order of clicking is the order in the bundle.
  const [picked, setPicked] = React.useState<string[]>([]);
  const [bundling, setBundling] = React.useState(false);
  const [watermark, setWatermark] = React.useState('');
  const togglePick = (id: string) => setPicked((cur) => cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]);
  const buildBundle = async () => {
    setBundling(true); setError(''); setNotice('');
    try {
      const res = await fetch('/api/cases/' + caseId + '/bundle', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ fileIds: picked, ...(watermark.trim() ? { watermark: watermark.trim() } : {}) }) });
      if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.error || 'تعذر تجهيز الحزمة'); }
      const skipped = Number(res.headers.get('X-Bundle-Skipped') || 0);
      const url = URL.createObjectURL(await res.blob()); const a = document.createElement('a'); a.href = url; a.download = 'court-bundle.pdf'; a.click(); URL.revokeObjectURL(url);
      setNotice(skipped ? 'تم تجهيز الحزمة. ' + skipped + ' ملف غير مدعوم مذكور في الفهرس ولم يُدمج.' : 'تم تجهيز حزمة المحكمة.');
    } catch (e) { setError(e instanceof Error ? e.message : 'تعذر تجهيز الحزمة'); } finally { setBundling(false); }
  };
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
    await uploadOne(file);
  };

  // Item 111: voice note after a session. Recorded in the browser, then uploaded through the same private upload path as any other file (type: voice note). Nothing is sent anywhere else and no transcription happens here.
  const [recording, setRecording] = React.useState(false);
  const recRef = React.useRef<MediaRecorder | null>(null);
  const startVoice = async () => {
    setError(''); setNotice('');
    try {
      if (typeof MediaRecorder === 'undefined' || !navigator.mediaDevices?.getUserMedia) throw new Error('المتصفح لا يدعم التسجيل الصوتي.');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream); const chunks: BlobPart[] = [];
      rec.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
      rec.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop()); setRecording(false);
        const mime = rec.mimeType || 'audio/webm';
        const ext = mime.includes('ogg') ? '.ogg' : '.webm';
        const blob = new Blob(chunks, { type: ext === '.ogg' ? 'audio/ogg' : 'video/webm' });
        await uploadOne(new File([blob], 'ملاحظة-صوتية-' + new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-') + ext, { type: blob.type }), { docType: 'ملاحظة صوتية' });
      };
      recRef.current = rec; rec.start(); setRecording(true);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'تعذر بدء التسجيل. تأكد من إذن الميكروفون.'); }
  };
  const stopVoice = () => recRef.current?.stop();
  // Item 158: send to review; only senior management can approve or reject (the server enforces it and audits).
  const setReviewStatus = async (fileId: string, reviewStatus: string) => {
    setError(''); setNotice('');
    const r = await fetch('/api/cases/' + encodeURIComponent(caseId) + '/files', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ fileId, reviewStatus }) });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) { setError(d.error || 'تعذر تحديث حالة المراجعة.'); return; }
    setNotice('تم تحديث حالة المراجعة.'); await loadFiles();
  };
  const REVIEW_LABEL: Record<string, string> = { IN_REVIEW: 'قيد المراجعة', APPROVED: 'معتمد', REJECTED: 'مرفوض', DRAFT: 'مسودة' };
  // Items 150/152: mark a file as the next version of another file of the same case.
  const makeVersion = async (fileId: string, versionOf: string) => {
    if (!versionOf) return;
    setError(''); setNotice('');
    const r = await fetch('/api/cases/' + encodeURIComponent(caseId) + '/files', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ fileId, versionOf }) });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) { setError(d.error || 'تعذر تسجيل الإصدار.'); return; }
    setNotice('تم تسجيل الملف كإصدار جديد.'); await loadFiles();
  };

  // Item 226: photograph a document with the phone camera, enhance it locally, then use the normal upload path (same case wall, audit and storage).
  const cameraRef = React.useRef<HTMLInputElement>(null);
  const onCamera = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; e.target.value = ''; if (!f) return;
    try {
      const bmp = await createImageBitmap(f); const scale = Math.min(1, 2400 / Math.max(bmp.width, bmp.height)); const c = document.createElement('canvas'); c.width = Math.round(bmp.width * scale); c.height = Math.round(bmp.height * scale);
      const g = c.getContext('2d')!; g.drawImage(bmp, 0, 0, c.width, c.height); const img = g.getImageData(0, 0, c.width, c.height); img.data.set(enhanceDocument(img.data)); g.putImageData(img, 0, 0);
      const blob = await new Promise<Blob>((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('blob'))), 'image/jpeg', 0.85));
      await uploadOne(new File([blob], 'scan-' + new Date().toISOString().slice(0, 10) + '.jpg', { type: 'image/jpeg' }), { docType: 'مستند مصور' });
    } catch { setError('تعذر تجهيز الصورة.'); }
  };

  const uploadOne = async (file: File, meta?: { docType?: string }) => {
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
        body: JSON.stringify({ name: file.name, mimeType: type.mime, size: file.size, url: signed.storedUrl, ...(meta?.docType ? { docType: meta.docType } : {}) }),
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
          <input ref={cameraRef} type="file" accept="image/*" capture="environment" aria-label="تصوير مستند بالكاميرا" className="hidden" onChange={(e) => void onCamera(e)} />
          <button type="button" disabled={uploading} onClick={() => cameraRef.current?.click()} className="me-2 rounded-xl border border-navy-200 px-4 py-2.5 text-xs font-extrabold text-navy-800 disabled:opacity-50">تصوير مستند</button>
          <input ref={inputRef} type="file" accept=".png,.jpg,.jpeg,.webp,.pdf,.doc,.docx,.mp4,.webm,.mp3,.wav,.ogg" className="hidden" onChange={onChooseFile} />
          <button type="button" disabled={uploading} onClick={() => inputRef.current?.click()} className="inline-flex items-center gap-2 rounded-xl bg-navy-950 px-4 py-2.5 text-xs font-extrabold text-white disabled:opacity-50">
            {uploading ? <Loader2 size={15} className="animate-spin" /> : <Upload size={15} />}
            {uploading ? 'جارٍ رفع الملف…' : 'رفع ملف للقضية'}
          </button>
          {recording
            ? <button type="button" onClick={stopVoice} className="ms-2 rounded-xl bg-red-700 px-4 py-2.5 text-xs font-extrabold text-white">إيقاف وحفظ الملاحظة الصوتية</button>
            : <button type="button" disabled={uploading} onClick={startVoice} className="ms-2 rounded-xl border border-navy-200 px-4 py-2.5 text-xs font-extrabold text-navy-800 disabled:opacity-50">تسجيل ملاحظة صوتية</button>}
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
          <div className="flex flex-wrap items-center justify-between gap-2 bg-ivory-50 px-5 py-3 text-[11px] text-navy-600">
            <span>اختر الملفات بالترتيب المطلوب لحزمة المحكمة (PDF وصور فقط تُدمج، والباقي يُذكر في الفهرس).</span>
            <input aria-label="نص العلامة المائية" maxLength={40} value={watermark} onChange={(e) => setWatermark(e.target.value)} placeholder="علامة مائية (اختياري)" className="rounded border border-navy-200 px-2 py-1 text-[10px]" />
            <button type="button" data-testid="bundle-build" disabled={!picked.length || bundling} onClick={buildBundle} className="rounded-lg bg-navy-950 px-3 py-2 text-[10px] font-extrabold text-white disabled:opacity-40">{bundling ? 'جارٍ التجهيز…' : 'تجهيز حزمة المحكمة (' + picked.length + ')'}</button>
          </div>
          {files.map((file) => (
            <div key={file.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
              <div className="flex min-w-0 items-center gap-3">
                <label className="flex items-center gap-1 text-[10px] text-navy-500"><input type="checkbox" data-testid={'bundle-pick-' + file.id} checked={picked.includes(file.id)} onChange={() => togglePick(file.id)} />{picked.includes(file.id) ? picked.indexOf(file.id) + 1 : ''}</label>
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-ivory-50 text-gold-700"><FileText size={17} /></span>
                <div className="min-w-0">
                  <p className="break-words text-xs font-extrabold text-navy-800">{file.name}</p>
                  <p className="mt-1 text-[10px] text-navy-400">{file.kind}{file.size_bytes ? ' · ' + readableSize(Number(file.size_bytes)) : ''}{file.doc_type ? ' · ' + file.doc_type : ''}{(file.version_no ?? 1) > 1 ? ' · إصدار ' + file.version_no : ''}{file.tags?.length ? ' · ' + file.tags.join('، ') : ''}</p>
                  <p className="mt-1 flex flex-wrap items-center gap-1 text-[10px]" aria-label={'مراجعة: ' + file.name}><span className="font-bold text-navy-600">{REVIEW_LABEL[file.review_status ?? 'DRAFT'] ?? 'مسودة'}</span>{(file.review_status ?? 'DRAFT') !== 'IN_REVIEW' && file.review_status !== 'APPROVED' && <button type="button" onClick={() => void setReviewStatus(file.id, 'IN_REVIEW')} className="rounded border border-navy-200 px-1.5 py-0.5">إرسال للمراجعة</button>}{file.review_status === 'IN_REVIEW' && <><button type="button" onClick={() => void setReviewStatus(file.id, 'APPROVED')} className="rounded border border-navy-200 px-1.5 py-0.5">اعتماد (الإدارة العليا)</button><button type="button" onClick={() => void setReviewStatus(file.id, 'REJECTED')} className="rounded border border-navy-200 px-1.5 py-0.5">رفض (الإدارة العليا)</button></>}</p>
                  {!file.version_of && <select aria-label={'جعل الملف إصدارًا من ملف آخر: ' + file.name} value="" onChange={(e) => void makeVersion(file.id, e.target.value)} className="mt-1 rounded border border-navy-100 p-0.5 text-[10px]"><option value="">إصدار جديد من…</option>{files.filter((o) => o.id !== file.id && !o.version_of).map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}</select>}
                </div>
              </div>
              {file.url && <div className="flex shrink-0 items-center gap-2">
                <FileDeletionRequestButton fileType="case" resourceId={caseId} fileId={file.id} />
                <FileShareButton resourceType="case" resourceId={caseId} fileId={file.id} />
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
