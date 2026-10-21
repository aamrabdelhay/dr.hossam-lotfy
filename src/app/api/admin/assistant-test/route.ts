import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { isSeniorManagement } from '@/lib/office-workflow';
import { assistantChatUrl, fetchAssistantChat, getAssistantSettings, saveAssistantSettings } from '@/lib/assistant-settings';

async function authorized(){const session=await getCurrentUser();if(!session)return false;return session.role==='admin'||await isSeniorManagement(session);}
export async function GET(){
  if(!(await authorized()))return NextResponse.json({error:'غير مصرح'},{status:403});
  const s=await getAssistantSettings();
  return NextResponse.json({configured:s.configured,model:s.model,baseUrl:s.baseUrl});
}
export async function POST(){
  try{
    if(!(await authorized()))return NextResponse.json({ok:false,error:'غير مصرح'},{status:403});
    const s=await getAssistantSettings();
    if(!s.apiKey)return NextResponse.json({ok:false,error:'مفتاح API غير مضبوط.'},{status:503});
    const result=await fetchAssistantChat(s,{
      messages:[{role:'user',content:'Reply with exactly: AI_OK'}],
      temperature:0,max_tokens:32,stream:false,
    },AbortSignal.timeout(15000));
    const r=result.response;
    const d=await r.json().catch(()=>null);
    if(!r.ok) {
      const endpoint=new URL(assistantChatUrl(s.baseUrl));
      const errorData=Array.isArray(d)?d[0]:d;
      const details=typeof errorData?.error?.message==='string'?errorData.error.message:typeof errorData?.message==='string'?errorData.message:'الخدمة لم تُرجع تفاصيل. راجع عنوان API والموديل.';
      return NextResponse.json({ok:false,error:'فشل الاتصال بالـAPI (HTTP '+r.status+').',details,endpoint:endpoint.origin+endpoint.pathname,model:result.model},{status:502});
    }
    const response=d?.choices?.[0]?.message?.content;
    if(result.usedFallbackModel) await saveAssistantSettings({baseUrl:s.baseUrl,model:result.model});
    return NextResponse.json({ok:true,model:result.model,response:typeof response==='string'?response:'تم الاتصال بنجاح.',note:result.usedFallbackModel?'تم التحويل إلى الموديل البديل العامل وحفظ الإعدادات.':undefined});
  }catch(e){
    console.error('[assistant-test]',e);
    return NextResponse.json({ok:false,error:'تعذر اختبار اتصال الـAPI.'},{status:500});
  }
}
