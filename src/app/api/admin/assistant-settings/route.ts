import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { isSeniorManagement } from '@/lib/office-workflow';
import { getAssistantSettings, saveAssistantSettings } from '@/lib/assistant-settings';

async function authorized() {
  const session = await getCurrentUser();
  if (!session) return null;
  if (session.role === 'admin') return session;
  if (await isSeniorManagement(session)) return session;
  return null;
}
export async function GET() {
  try {
    if (!(await authorized())) return NextResponse.json({error:'غير مصرح'},{status:403});
    const s=await getAssistantSettings();
    return NextResponse.json({
      configured:s.configured,
      source:s.source,
      baseUrl:s.baseUrl,
      model:s.model,
      keyConfigured:Boolean(s.apiKey),
      keyHint:s.apiKey ? '••••••••' : '',
    });
  } catch (e) {
    return NextResponse.json({error:e instanceof Error?e.message:'تعذر تحميل إعدادات المساعد.'},{status:500});
  }
}
export async function POST(req:Request) {
  try {
    if (!(await authorized())) return NextResponse.json({error:'غير مصرح'},{status:403});
    const body=await req.json();
    const baseUrl=String(body.baseUrl||'').trim();
    const model=String(body.model||'').trim();
    const apiKey=body.apiKey==null?undefined:String(body.apiKey).trim();
    if(!baseUrl||!model)return NextResponse.json({error:'عنوان API واسم الموديل مطلوبان.'},{status:400});
    const s=await saveAssistantSettings({baseUrl,model,apiKey});
    return NextResponse.json({ok:true,configured:s.configured,source:s.source,baseUrl:s.baseUrl,model:s.model,keyConfigured:Boolean(s.apiKey)});
  } catch(e) {
    return NextResponse.json({error:e instanceof Error?e.message:'تعذر حفظ إعدادات المساعد.'},{status:400});
  }
}
