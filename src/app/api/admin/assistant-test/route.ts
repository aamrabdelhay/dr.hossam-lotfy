import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { isSeniorManagement } from '@/lib/office-workflow';
import { assistantChatUrl, getAssistantSettings } from '@/lib/assistant-settings';

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
    const r=await fetch(assistantChatUrl(s.baseUrl),{
      method:'POST',
      headers:{Authorization:'Bearer '+s.apiKey,'Content-Type':'application/json'},
      body:JSON.stringify({model:s.model,messages:[{role:'user',content:'Reply with exactly: الاتصال يعمل'}],temperature:0,max_tokens:32,stream:false}),
      cache:'no-store',
    });
    const d=await r.json().catch(()=>null);
    if(!r.ok)return NextResponse.json({ok:false,error:'فشل الاتصال بالـAPI (HTTP '+r.status+').',details:typeof d?.error?.message==='string'?d.error.message:undefined},{status:502});
    const response=d?.choices?.[0]?.message?.content;
    return NextResponse.json({ok:true,model:s.model,response:typeof response==='string'?response:'تم الاتصال بنجاح.'});
  }catch(e){
    console.error('[assistant-test]',e);
    return NextResponse.json({ok:false,error:'تعذر اختبار اتصال الـAPI.'},{status:500});
  }
}
