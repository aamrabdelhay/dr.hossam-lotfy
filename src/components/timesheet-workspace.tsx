"use client";

import * as React from "react";
import { Plus, Save, Send, Check, RotateCcw, Pencil, BriefcaseBusiness, AlertCircle } from "lucide-react";

type CaseOption = { id: string; name: string; number: string };
type Entry = {
  id: string; workDate: string; minutes: number; description: string; billable: boolean;
  status: "DRAFT" | "SUBMITTED" | "APPROVED" | "REJECTED";
  reviewNote?: string | null; ownerName?: string | null;
  caseId?: string | null; caseName?: string | null; caseNumber?: string | null; isMine: boolean;
};

const STATUS: Record<Entry["status"], { label: string; style: string }> = {
  DRAFT: { label: "مسودة", style: "bg-slate-100 text-slate-600" },
  SUBMITTED: { label: "قيد المراجعة", style: "bg-amber-50 text-amber-800" },
  APPROVED: { label: "معتمد", style: "bg-emerald-50 text-emerald-700" },
  REJECTED: { label: "يحتاج تعديل", style: "bg-rose-50 text-rose-700" },
};

function durationLabel(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours) return String(hours) + " س" + (rest ? " و" + String(rest) + " د" : "");
  return String(rest) + " دقيقة";
}

export function TimesheetWorkspace({ canReview, today }: { canReview: boolean; today: string }) {
  const [entries, setEntries] = React.useState<Entry[]>([]);
  const [cases, setCases] = React.useState<CaseOption[]>([]);
  const [workDate, setWorkDate] = React.useState(today);
  const [minutes, setMinutes] = React.useState("60");
  const [description, setDescription] = React.useState("");
  const [caseId, setCaseId] = React.useState("");
  const [billable, setBillable] = React.useState(true);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");
  const [notice, setNotice] = React.useState("");

  const load = React.useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const results = await Promise.all([
        fetch(canReview ? "/api/timesheets?scope=team" : "/api/timesheets", { cache: "no-store" }),
        fetch("/api/cases", { cache: "no-store" }),
      ]);
      const timeData = await results[0].json();
      if (!results[0].ok) throw new Error(timeData.error || "تعذر تحميل سجل الساعات");
      const caseData = results[1].ok ? await results[1].json() : { cases: [] };
      setEntries(Array.isArray(timeData.entries) ? timeData.entries : []);
      setCases(Array.isArray(caseData.cases) ? caseData.cases.map((item: any) => ({
        id: item.id, name: item.name, number: item.number,
      })) : []);
    } catch (error) {
      setError(error instanceof Error ? error.message : "حدث خطأ أثناء تحميل البيانات");
    } finally {
      setLoading(false);
    }
  }, [canReview]);

  React.useEffect(() => { void load(); }, [load]);

  const totalMinutes = entries.filter((entry) => entry.status === "APPROVED")
    .reduce((sum, entry) => sum + entry.minutes, 0);
  const billableMinutes = entries.filter((entry) => entry.status === "APPROVED" && entry.billable)
    .reduce((sum, entry) => sum + entry.minutes, 0);
  const pendingCount = entries.filter((entry) => entry.status === "SUBMITTED").length;

  function resetForm() {
    setWorkDate(today); setMinutes("60"); setDescription(""); setCaseId("");
    setBillable(true); setEditingId(null);
  }

  function editEntry(entry: Entry) {
    setEditingId(entry.id); setWorkDate(entry.workDate); setMinutes(String(entry.minutes));
    setDescription(entry.description); setCaseId(entry.caseId || ""); setBillable(entry.billable);
    setNotice("عدّل السجل ثم احفظه كمسودة أو أرسله للمراجعة.");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function request(method: string, payload: unknown) {
    const response = await fetch("/api/timesheets", {
      method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || "تعذر تنفيذ العملية");
    return data;
  }

  async function saveEntry(submitNow: boolean) {
    const duration = Number(minutes);
    if (!workDate || !Number.isInteger(duration) || duration < 1 || duration > 1440
      || description.trim().length < 3) {
      setError("أدخل تاريخًا صحيحًا ومدة بين دقيقة و24 ساعة ووصفًا لا يقل عن 3 أحرف.");
      return;
    }

    setBusy(true); setError(""); setNotice("");
    try {
      if (editingId) {
        await request("PATCH", {
          id: editingId, action: "save", workDate, minutes: duration,
          description: description.trim(), caseId: caseId || null, billable,
        });
        if (submitNow) await request("PATCH", { id: editingId, action: "submit" });
      } else {
        await request("POST", {
          workDate, minutes: duration, description: description.trim(),
          caseId: caseId || null, billable, submit: submitNow,
        });
      }
      resetForm();
      setNotice(submitNow ? "تم إرسال سجل الساعات للمراجعة." : "تم حفظ سجل الساعات كمسودة.");
      await load();
    } catch (error) {
      setError(error instanceof Error ? error.message : "تعذر حفظ سجل الساعات");
    } finally {
      setBusy(false);
    }
  }

  async function act(entry: Entry, action: "submit" | "approve" | "reject") {
    const reviewNote = action === "reject" ? window.prompt("اكتب سبب إرجاع السجل للتعديل:") : undefined;
    if (action === "reject" && !reviewNote?.trim()) return;
    if (action === "approve" && !window.confirm("اعتماد سجل الساعات هذا؟")) return;
    setBusy(true); setError("");
    try {
      await request("PATCH", { id: entry.id, action, reviewNote });
      setNotice(action === "approve" ? "تم اعتماد السجل."
        : action === "reject" ? "تم إرجاع السجل للتعديل." : "تم إرسال السجل للمراجعة.");
      await load();
    } catch (error) {
      setError(error instanceof Error ? error.message : "تعذر تنفيذ العملية");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5" dir="rtl">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-navy-100 bg-white p-4">
          <p className="text-xs font-bold text-navy-500">إجمالي الوقت المعتمد</p>
          <strong className="mt-2 block text-2xl font-black text-navy-950">{durationLabel(totalMinutes)}</strong>
        </div>
        <div className="rounded-2xl border border-navy-100 bg-white p-4">
          <p className="text-xs font-bold text-navy-500">الساعات القابلة للفوترة</p>
          <strong className="mt-2 block text-2xl font-black text-navy-950">{durationLabel(billableMinutes)}</strong>
        </div>
        <div className="rounded-2xl border border-navy-100 bg-white p-4">
          <p className="text-xs font-bold text-navy-500">في انتظار المراجعة</p>
          <strong className="mt-2 block text-2xl font-black text-navy-950">{pendingCount}</strong>
        </div>
      </div>

      <section className="rounded-2xl border border-navy-100 bg-white p-4 shadow-sm sm:p-5">
        <div className="mb-4 flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gold-500/10 text-gold-700"><Plus size={18} /></span>
          <div>
            <h2 className="text-base font-extrabold text-navy-950">{editingId ? "تعديل سجل ساعات" : "تسجيل وقت عمل جديد"}</h2>
            <p className="text-[11px] font-semibold text-navy-400">سجّل الوقت الفعلي الذي تم إنفاقه على المهمة أو القضية</p>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="text-xs font-bold text-navy-600">تاريخ العمل
            <input type="date" value={workDate} onChange={(event) => setWorkDate(event.target.value)}
              className="mt-1.5 h-11 w-full rounded-xl border border-navy-200 px-3 text-sm outline-none focus:border-gold-500" />
          </label>
          <label className="text-xs font-bold text-navy-600">المدة بالدقائق
            <input type="number" min="1" max="1440" step="1" value={minutes} onChange={(event) => setMinutes(event.target.value)}
              className="mt-1.5 h-11 w-full rounded-xl border border-navy-200 px-3 text-sm outline-none focus:border-gold-500" />
          </label>
          <label className="text-xs font-bold text-navy-600 sm:col-span-2">القضية المرتبطة
            <select value={caseId} onChange={(event) => setCaseId(event.target.value)}
              className="mt-1.5 h-11 w-full rounded-xl border border-navy-200 bg-white px-3 text-sm outline-none focus:border-gold-500">
              <option value="">عمل عام / غير مرتبط بقضية</option>
              {cases.map((item) => <option key={item.id} value={item.id}>{item.name}{item.number ? " — " + item.number : ""}</option>)}
            </select>
          </label>
          <label className="text-xs font-bold text-navy-600 sm:col-span-2 lg:col-span-3">وصف النشاط
            <input value={description} onChange={(event) => setDescription(event.target.value)} maxLength={500}
              placeholder="مثال: مراجعة مستندات القضية وإعداد مذكرة..."
              className="mt-1.5 h-11 w-full rounded-xl border border-navy-200 px-3 text-sm outline-none focus:border-gold-500" />
          </label>
          <label className="flex items-center gap-2 self-end rounded-xl border border-navy-100 bg-ivory-50 px-3 py-3 text-xs font-bold text-navy-700 sm:col-span-2 lg:col-span-1">
            <input type="checkbox" checked={billable} onChange={(event) => setBillable(event.target.checked)} className="h-4 w-4 accent-amber-700" />
            وقت قابل للفوترة
          </label>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" disabled={busy} onClick={() => void saveEntry(false)}
            className="inline-flex items-center gap-2 rounded-xl border border-navy-200 px-4 py-2.5 text-xs font-extrabold text-navy-700 disabled:opacity-50">
            <Save size={15} /> حفظ كمسودة
          </button>
          <button type="button" disabled={busy} onClick={() => void saveEntry(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-navy-950 px-4 py-2.5 text-xs font-extrabold text-white disabled:opacity-50">
            <Send size={15} /> حفظ وإرسال للمراجعة
          </button>
          {editingId && <button type="button" disabled={busy} onClick={resetForm}
            className="rounded-xl px-3 py-2.5 text-xs font-bold text-navy-500">إلغاء التعديل</button>}
        </div>
      </section>

      {error && <div role="alert" className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-bold text-rose-700">
        <AlertCircle size={15} className="mt-0.5 shrink-0" />{error}
      </div>}
      {notice && <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-bold text-emerald-700">{notice}</div>}

      <section className="overflow-hidden rounded-2xl border border-navy-100 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-navy-100 px-4 py-4">
          <div className="flex items-center gap-2"><BriefcaseBusiness size={17} className="text-gold-700" />
            <h2 className="text-base font-extrabold text-navy-950">{canReview ? "سجلات الساعات والمراجعة" : "سجل ساعات العمل الخاص بي"}</h2>
          </div>
          <button type="button" onClick={() => void load()} className="inline-flex items-center gap-1 rounded-lg border border-navy-200 px-3 py-2 text-[11px] font-bold text-navy-600">
            <RotateCcw size={13} /> تحديث
          </button>
        </div>
        {loading ? <p className="p-6 text-center text-sm font-semibold text-navy-400">جارٍ تحميل سجلات الساعات...</p>
          : entries.length === 0 ? <p className="p-8 text-center text-sm font-semibold text-navy-400">لا توجد سجلات حتى الآن. ابدأ بإضافة أول سجل لوقت العمل.</p>
          : <div className="divide-y divide-navy-100">
            {entries.map((entry) => <article key={entry.id} className="p-4 sm:p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={"rounded-full px-2.5 py-1 text-[10px] font-extrabold " + STATUS[entry.status].style}>{STATUS[entry.status].label}</span>
                    <span className="text-[11px] font-bold text-navy-400">{entry.workDate}</span>
                    <span className="text-[11px] font-extrabold text-gold-700">{durationLabel(entry.minutes)}</span>
                    {entry.billable && <span className="rounded-full bg-blue-50 px-2 py-1 text-[10px] font-bold text-blue-700">قابل للفوترة</span>}
                  </div>
                  <h3 className="mt-2 text-sm font-extrabold leading-6 text-navy-950">{entry.description}</h3>
                  {canReview && !entry.isMine && <p className="mt-1 text-xs font-bold text-navy-500">الموظف: {entry.ownerName || "غير معروف"}</p>}
                  {entry.caseName && <p className="mt-1 text-xs font-semibold text-navy-500">القضية: {entry.caseName}{entry.caseNumber ? " — " + entry.caseNumber : ""}</p>}
                  {entry.reviewNote && <p className="mt-2 rounded-lg bg-rose-50 p-2 text-[11px] font-semibold text-rose-700">ملاحظة المراجعة: {entry.reviewNote}</p>}
                </div>
                <div className="flex flex-wrap gap-2">
                  {entry.isMine && ["DRAFT", "REJECTED"].includes(entry.status) && <button type="button" disabled={busy}
                    onClick={() => editEntry(entry)} className="inline-flex items-center gap-1 rounded-lg border border-navy-200 px-3 py-2 text-[11px] font-bold text-navy-700">
                    <Pencil size={13} /> تعديل
                  </button>}
                  {entry.isMine && entry.status === "DRAFT" && <button type="button" disabled={busy}
                    onClick={() => void act(entry, "submit")} className="inline-flex items-center gap-1 rounded-lg bg-navy-950 px-3 py-2 text-[11px] font-bold text-white">
                    <Send size={13} /> إرسال
                  </button>}
                  {canReview && !entry.isMine && entry.status === "SUBMITTED" && <>
                    <button type="button" disabled={busy} onClick={() => void act(entry, "approve")}
                      className="inline-flex items-center gap-1 rounded-lg bg-emerald-700 px-3 py-2 text-[11px] font-bold text-white">
                      <Check size={13} /> اعتماد
                    </button>
                    <button type="button" disabled={busy} onClick={() => void act(entry, "reject")}
                      className="inline-flex items-center gap-1 rounded-lg border border-rose-200 px-3 py-2 text-[11px] font-bold text-rose-700">
                      إرجاع للتعديل
                    </button>
                  </>}
                </div>
              </div>
            </article>)}
          </div>}
      </section>
    </div>
  );
}
