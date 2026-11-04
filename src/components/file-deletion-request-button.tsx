'use client';

import * as React from 'react';
import { Loader2, Trash2 } from 'lucide-react';

type Props = { fileType:'client'|'case'; resourceId:string; fileId:string };

export function FileDeletionRequestButton({fileType,resourceId,fileId}:Props) {
  const [loading,setLoading] = React.useState(false);
  const [message,setMessage] = React.useState('');
  const request = async () => {
    const reason = window.prompt('اكتب سبب طلب حذف هذا الملف. لن يُحذف الملف إلا بعد موافقة الإدارة العليا.');
    if (!reason?.trim()) return;
    setLoading(true);
    setMessage('');
    try {
      const endpoint = fileType === 'case'
        ? '/api/cases/' + encodeURIComponent(resourceId) + '/files/' + encodeURIComponent(fileId)
        : '/api/clients/' + encodeURIComponent(resourceId) + '/files/' + encodeURIComponent(fileId);
      const response = await fetch(endpoint,{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({reason:reason.trim()})});
      const data = await response.json().catch(()=>({}));
      if (!response.ok) throw new Error(data.error || 'تعذر إرسال طلب حذف الملف.');
      setMessage(data.duplicate ? 'يوجد طلب حذف معلّق بالفعل.' : 'تم إرسال الطلب للإدارة العليا.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'تعذر إرسال الطلب.');
    } finally {
      setLoading(false);
    }
  };
  return <span className="inline-flex items-center gap-1.5">
    <button type="button" disabled={loading || !!message} onClick={request}
      className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-2.5 py-2 text-[10px] font-extrabold text-red-700 disabled:opacity-50">
      {loading ? <Loader2 size={12} className="animate-spin"/> : <Trash2 size={12}/>} طلب حذف
    </button>
    {message && <span role="status" className="max-w-36 text-[10px] font-bold text-navy-500">{message}</span>}
  </span>;
}
