import { NextResponse } from 'next/server';
import { z } from 'zod';
import { assistantChatUrl, getAssistantSettings } from '@/lib/assistant-settings';
import { prisma } from '@/lib/prisma';
import { logActivity } from '@/lib/activity';
import { notifyTaskAssigned } from '@/lib/notifications';
import { user } from '@/lib/api';
import { createOfficeRequest, isSeniorManagement, notifySenior, officeId } from '@/lib/office-workflow';
import { branchForWrite, getBranchScope } from '@/lib/branch-access';
import { escapeTelegramHtml, sendTelegramGroupNotification } from '@/lib/telegram';
import { appOrigin } from '@/lib/google-oauth';
const bodySchema=z.object({
  message:z.string().trim().min(1).max(4000),
  branchId:z.string().trim().min(1).max(128).optional(),
  history:z.array(z.object({role:z.enum(['user','assistant']),content:z.string().trim().min(1).max(2000)})).max(12).optional(),
  confirm:z.boolean().optional(),
  action:z.record(z.string(),z.unknown()).optional()
});
const MODEL='gemini-2.5-flash';
function event(x:unknown){return `data: ${JSON.stringify(x)}\n\n`;}
function today(){return new Intl.DateTimeFormat('en-CA',{timeZone:'Africa/Cairo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());}
async function context(branchId?:string){const taskIds=branchId?await prisma.$queryRawUnsafe<string[]>(`SELECT "id" FROM "tasks" WHERE COALESCE("branch_id",'branch_main')=$1`,branchId):undefined;const [tasks,cases,lawyers,locations,clients]=await Promise.all([prisma.task.findMany({where:{...(taskIds?{id:{in:taskIds}}:{}),status:{notIn:['COMPLETED','CANCELLED']}},orderBy:{scheduledDate:'asc'},take:60,include:{location:{select:{name:true}},caseRecord:{select:{name:true,number:true,clientName:true}},assignees:{select:{lawyer:{select:{fullName:true}}}}}}),branchId?prisma.$queryRawUnsafe<any[]>(`SELECT "id","name","number","clientName" FROM "case_records" WHERE COALESCE("branch_id",'branch_main')=$1 ORDER BY "id" DESC LIMIT 100`,branchId):prisma.caseRecord.findMany({take:100,select:{id:true,name:true,number:true,clientName:true}}),branchId?prisma.$queryRawUnsafe<any[]>(`SELECT l."id",l."fullName" FROM "lawyers" l INNER JOIN "office_branch_lawyers" bl ON bl."lawyer_id"=l."id" WHERE bl."branch_id"=$1 AND l."active"=true ORDER BY l."fullName" LIMIT 100`,branchId):prisma.lawyer.findMany({where:{active:true},take:100,select:{id:true,fullName:true}}),prisma.location.findMany({take:250,select:{id:true,name:true,nameEn:true}}),prisma.$queryRawUnsafe<any[]>(branchId?`SELECT "id","name","phone","email","status" FROM "clients" WHERE COALESCE("status",'MAIN') NOT IN ('REJECTED','DELETED') AND COALESCE("branch_id",'branch_main')=$1 ORDER BY "name" LIMIT 200`:`SELECT "id","name","phone","email","status" FROM "clients" WHERE COALESCE("status",'MAIN') NOT IN ('REJECTED','DELETED') ORDER BY "name" LIMIT 200`,...(branchId?[branchId]:[]))]);return{tasks:tasks.map(t=>({id:t.id,description:t.description,date:t.scheduledDate?.toISOString().slice(0,10)||null,time:t.scheduledTime,location:t.location?.name||null,case:t.caseRecord?.name||null,caseNumber:t.caseRecord?.number||null,client:t.caseRecord?.clientName||null,lawyers:t.assignees.map(a=>a.lawyer.fullName)})),cases,lawyers,locations,clients};}
function localAnswer(message:string,c:any): string | null {
  const raw=message.trim();
  const q=raw.toLocaleLowerCase('ar-EG');
  const normalize=(v:string)=>v.toLocaleLowerCase('ar-EG').replace(/[\u064B-\u065F]/g,'').replace(/[أإآ]/g,'ا').replace(/ة/g,'ه').replace(/ى/g,'ي');
  const nq=normalize(q);
  const has=(...words:string[])=>words.some(w=>nq.includes(normalize(w)));
  const list=(items:any[],key:string)=>items.slice(0,12).map(x=>String(x?.[key]??'')).filter(Boolean).join('، ');
  if(has('عدد العملاء','عدد العميل','كم عميل','clients')) return `عدد العملاء المسجلين: ${c.clients.length}.`;
  if(has('المحامين','المحاميين','المحامين الموجودين','lawyers')) return c.lawyers.length ? `المحامون: ${list(c.lawyers,'fullName')}.` : 'لا توجد بيانات لمحامين نشطين حاليًا.';
  if(has('القضايا','القضيه','القضايا الحالية','cases')) return c.cases.length ? `القضايا المسجلة: ${c.cases.slice(0,12).map((x:any)=>`${x.name}${x.number?' — '+x.number:''}${x.clientName?' — '+x.clientName:''}`).join('؛ ')}.` : 'لا توجد قضايا مسجلة في البيانات الحالية.';
  if(has('المهام','التكليفات','المهام القادمة','tasks')) return c.tasks.length ? `المهام القادمة: ${c.tasks.slice(0,10).map((x:any)=>`${x.description}${x.date?' — '+x.date:''}${x.time?' — '+x.time:''}`).join('؛ ')}.` : 'لا توجد مهام مفتوحة مسجلة حاليًا.';
  if(has('المواقع','المحاكم','الاماكن','locations')) return c.locations.length ? `الأماكن المسجلة: ${list(c.locations,'name')}.` : 'لا توجد أماكن مسجلة حاليًا.';
  const lawyer=c.lawyers.find((x:any)=>typeof x?.fullName==='string' && normalize(x.fullName)===nq);
  if(lawyer)return `المحامي: ${lawyer.fullName}.`;
  const location=c.locations.find((x:any)=>[x?.name,x?.nameEn].some((v:any)=>typeof v==='string'&&normalize(v).includes(nq)));
  if(location)return `المكان: ${location.name}${location.nameEn?' — '+location.nameEn:''}.`;
  const kase=c.cases.find((x:any)=>[x?.name,x?.number,x?.clientName].some((v:any)=>typeof v==='string'&&normalize(v).includes(nq)));
  if(kase)return `القضية: ${kase.name}${kase.number?' — رقم '+kase.number:''}${kase.clientName?' — العميل: '+kase.clientName:''}.`;
  const task=c.tasks.find((x:any)=>[x?.description,x?.location,x?.case,x?.caseNumber,x?.client].some((v:any)=>typeof v==='string'&&normalize(v).includes(nq)));
  if(task)return `المهمة: ${task.description}${task.date?' — '+task.date:''}${task.time?' — '+task.time:''}${task.location?' — '+task.location:''}.`;
  if(has('صباح الخير','مساء الخير','مرحبا','اهلا','hello','hi','bonjour')) return 'مرحبًا. يمكنني مساعدتك في البحث داخل بيانات المكتب عن العملاء والقضايا والمحامين والمهام والمواقع.';
  return null;
}
async function geminiStream(message:string, c:any, history:Array<{role:'user'|'assistant';content:string}> = [], signal?:AbortSignal){
  const settings=await getAssistantSettings();
  if(!settings.apiKey)throw new Error('ASSISTANT_API_KEY_MISSING');
  const system=[
    'أنت مساعد المكتب الذكي لمكتب لوتفي للمحاماة.',
    'افهم العربية المصرية والعامية والاختصارات والأخطاء الإملائية وتبديل الحروف والأخطاء الناتجة عن الكتابة السريعة. استنتج المعنى المقصود من السياق ولا ترفض السؤال لمجرد أن صياغته غير دقيقة.',
    'أجب بالعربية الواضحة، وكن ودودًا ومباشرًا. لا تصحح لغة المستخدم ولا تطلب منه إعادة كتابة السؤال ما دام المقصود مفهومًا.',
    'تعامل مع الرسائل المتتابعة كمحادثة واحدة واستعمل سجل الحوار السابق عند فهم الضمائر والمتابعات مثل: طيب، كام، هو مين، طب وبعد كده؟',
    'إذا كان السؤال عامًا فأجب من معرفتك العامة. إذا كان عن بيانات المكتب أو عملائه أو قضاياه أو موظفيه أو مواعيده، فاستخدم فقط بيانات المكتب المرفقة ولا تخترع أسماء أو أرقامًا أو مواعيد. إذا لم تكفِ البيانات فقل ذلك بوضوح.',
    'لا تدّعِ أنك أنشأت مهمة أو جلسة أو غيّرت بيانات؛ عمليات التنفيذ يجب تأكيدها من نموذج التنفيذ داخل التطبيق.',
    'إذا كان الطلب ملتبسًا لدرجة تمنع إجابة موثوقة، اسأل سؤال توضيح واحدًا قصيرًا.',
    'بيانات المكتب الحالية (JSON):',
    JSON.stringify(c)
  ].join('\n');
  const r=await fetch(assistantChatUrl(settings.baseUrl),{
    method:'POST',
    headers:{Authorization:'Bearer '+settings.apiKey,'Content-Type':'application/json'},
    body:JSON.stringify({model:settings.model,messages:[{role:'system',content:system},...history.slice(-12),{role:'user',content:message}],temperature:.3,max_tokens:4096,stream:true}),
    signal,cache:'no-store'
  });
  if(!r.ok){const detail=await r.text().catch(()=> '');throw new Error('ASSISTANT_'+r.status+':'+detail.slice(0,400))}
  if(!r.body)throw new Error('ASSISTANT_NO_STREAM');
  return r.body;
}
async function executeAction(session:any,a:any){const senior=await isSeniorManagement(session);if(!senior&&session.role==='lawyer'){const rid=await createOfficeRequest({type:a.type==='create_session'?'TASK_CREATE_SESSION':'TASK_CREATE',title:a.type==='create_session'?'طلب إضافة جلسة':'طلب إضافة تكليف',reason:String(a.description||''),payload:a,targetEntityType:'task',session});await notifySenior('طلب تنفيذ جديد',String(a.description||'طلب جديد'),'/admin/office').catch(()=>undefined);return{ok:true,requiresApproval:true,requestId:rid,reply:'تم إرسال الطلب للإدارة العليا للموافقة.'};}const description=String(a.description||'مهمة جديدة').trim();const locationId=a.locationId?String(a.locationId):null;const date=a.scheduledDate?String(a.scheduledDate):null;const time=a.scheduledTime?String(a.scheduledTime):null;const lawyerIds=Array.isArray(a.lawyerIds)?a.lawyerIds.map(String):[];const branchId=await branchForWrite(session,typeof a.branchId==='string'?a.branchId:null);if(!branchId)return{error:'لا يوجد فرع محدد لهذا الحساب'};if(a.type==='create_session'&&(!locationId||!date||!time||!lawyerIds.length))return{error:'بيانات الجلسة ناقصة'};if(!locationId)return{error:'مكان العمل مطلوب'};const caseId=typeof a.caseId==='string'&&a.caseId.trim()?a.caseId.trim():null;if(caseId){const caseRows=await prisma.$queryRawUnsafe<Array<{id:string}>>(`SELECT "id" FROM "case_records" WHERE "id"=$1 AND COALESCE("branch_id",'branch_main')=$2 LIMIT 1`,caseId,branchId);if(!caseRows.length)return{error:'القضية المحددة غير موجودة في هذا الفرع'};}const id=officeId('task');await prisma.$executeRawUnsafe(`INSERT INTO "tasks" ("id","locationId","caseId","description","notes","scheduledDate","scheduledTime","status","createdById","authorId","branch_id","createdAt","updatedAt") VALUES ($1,$2,$3,$4,$5,$6::date,$7,'PENDING',$8,$9,$10,NOW(),NOW())`,id,locationId,caseId,description,a.notes?String(a.notes):null,date,time,session.role==='admin'?session.userId:null,session.role==='lawyer'?session.lawyerId:null,branchId);for(const lid of lawyerIds)await prisma.$executeRawUnsafe(`INSERT INTO "task_assignments" ("id","taskId","lawyerId","createdAt") VALUES ($1,$2,$3,NOW()) ON CONFLICT ("taskId","lawyerId") DO NOTHING`,officeId('assign'),id,lid);await logActivity({action:'CREATED',summary:`أنشأ ${a.type==='create_session'?'جلسة':'مهمة'}: ${description}`,taskId:id,locationId,byUserId:session.role==='admin'?session.userId:undefined,byLawyerId:session.role==='lawyer'?session.lawyerId:undefined}).catch(()=>undefined);if(lawyerIds.length)await notifyTaskAssigned(lawyerIds,description,date?(date+(time?` — ${time}`:'')):'بالتنسيق',`/sessions/${id}`).catch(()=>undefined);let branchName='المقر الرئيسي';try{const rows=await prisma.$queryRawUnsafe<Array<{name_ar:string}>>(`SELECT "name_ar" FROM "office_branches" WHERE "id"=$1 LIMIT 1`,branchId);branchName=rows[0]?.name_ar||branchName;}catch{}const location=locationId?await prisma.location.findUnique({where:{id:locationId},select:{name:true}}):null;const assignedLawyers=lawyerIds.length?await prisma.lawyer.findMany({where:{id:{in:lawyerIds}},select:{id:true,fullName:true}}):[];const lawyerNames=lawyerIds.map((lid)=>assignedLawyers.find((l)=>l.id===lid)?.fullName).filter(Boolean) as string[];const caseName=String(a.caseName||'').trim();const caseNumber=String(a.caseNumber||'').trim();const caseLabel=caseName&&caseNumber&&!caseName.includes(caseNumber)?caseName+' — '+caseNumber:(caseName||caseNumber);const telegramMessage=[a.type==='create_session'?'📅 جلسة جديدة':'📌 تكليف جديد','', 'التكليف: '+description,a.taskType?'النوع: '+String(a.taskType):null,location?.name?'المكان: '+location.name:null,caseLabel?'القضية: '+caseLabel:null,a.clientName?'العميل: '+String(a.clientName):null,date?'التاريخ: '+date:null,time?'الوقت: '+time:null,lawyerNames.length?'المحامي / المحامون: '+lawyerNames.join('، '):null,'الفرع: '+branchName,'أنشأه: '+session.name,'','فتح التكليف: '+appOrigin()+'/sessions/'+id].filter(Boolean).join('\\n');await sendTelegramGroupNotification(escapeTelegramHtml(telegramMessage)).catch((error)=>{console.error('Assistant Telegram notification failed:',error)});return{ok:true,success:true,reply:a.type==='create_session'?'تمت إضافة الجلسة بنجاح.':'تم إنشاء المهمة بنجاح.',navigation:{path:`/sessions/${id}`,label:a.type==='create_session'?'فتح الجلسة':'فتح المهمة'}};}
export async function GET(){const session=await user();if(!session)return NextResponse.json({error:'يجب تسجيل الدخول'},{status:401});const settings=await getAssistantSettings();return NextResponse.json({configured:Boolean(settings.apiKey),model:settings.model,provider:settings.baseUrl,apiKeyConfigured:Boolean(settings.apiKey)});}
export async function POST(req:Request){const session=await user();if(!session)return NextResponse.json({error:'يجب تسجيل الدخول'},{status:401});let body;try{body=bodySchema.parse(await req.json())}catch{return NextResponse.json({error:'طلب غير صالح'},{status:400})}const urlBranchId=new URL(req.url).searchParams.get('branchId')?.trim()||undefined;
const actionBranchId=typeof body.action?.branchId==='string'?body.action.branchId.trim():undefined;
const requestedBranchId=urlBranchId||body.branchId||actionBranchId||undefined;
const scope=await getBranchScope(session);
if(requestedBranchId&&!scope.allBranches&&!scope.branchIds.includes(requestedBranchId))return NextResponse.json({error:'لا تملك صلاحية هذا الفرع'},{status:403});
if(!requestedBranchId&&!scope.allBranches&&scope.branchIds.length!==1)return NextResponse.json({error:'حدد فرع المكتب أولًا حتى أستخدم بيانات الفرع الصحيح.'},{status:400});
const effectiveBranchId=requestedBranchId||(!scope.allBranches&&scope.branchIds.length===1?scope.branchIds[0]:undefined);
const c=await context(effectiveBranchId);if(body.confirm&&body.action){const result=await executeAction(session,body.action);if(result.error)return NextResponse.json({ok:false,error:result.error,action:body.action});return NextResponse.json(result);}const history=(body.history||[]).filter((item)=>item.content.trim()).slice(-12);try{const upstream=await geminiStream(body.message,c,history,AbortSignal.timeout(45000));const reader=upstream.getReader();const decoder=new TextDecoder();const encoder=new TextEncoder();let buffer='';return new Response(new ReadableStream({async start(controller){try{for(;;){const{value,done}=await reader.read();if(done)break;buffer+=decoder.decode(value,{stream:true});const blocks=buffer.split(/\r?\n\r?\n/);buffer=blocks.pop()||'';for(const block of blocks){for(const line of block.split('\n')){if(!line.startsWith('data:'))continue;const raw=line.slice(5).trim();if(!raw||raw==='[DONE]')continue;try{const j=JSON.parse(raw);const text=j.choices?.[0]?.delta?.content||j.choices?.[0]?.message?.content||'';if(text)controller.enqueue(encoder.encode(event({type:'token',text})));}catch{}}}}controller.enqueue(encoder.encode(event({type:'done',configured:true})));controller.close();}catch(e){console.error('[assistant]',e);controller.enqueue(encoder.encode(event({type:'error',error:'تعذر الاتصال بخدمة المساعد حالياً.'})));controller.close();}}}),{headers:{'Content-Type':'text/event-stream; charset=utf-8','Cache-Control':'no-cache, no-transform','X-Accel-Buffering':'no'}});}catch(e){
  console.error('[assistant]',e);
  const settings=await getAssistantSettings().catch(()=>null);
  const configured=Boolean(settings?.apiKey);
  const backup=localAnswer(body.message,c);
  const reason=!configured?'مفتاح API غير مضبوط أو غير قابل للقراءة. افتح إعدادات النظام واختبر الاتصال.':'تعذر الوصول إلى خدمة الذكاء الاصطناعي. افتح إعدادات النظام واختبر الاتصال.';
  return NextResponse.json({
    reply:backup?reason+'\n\nإجابة احتياطية من بيانات المكتب: '+backup:reason+' ثم أعد المحاولة.',
    provider:'local-fallback',
    configured,
    aiAvailable:false
  },{status:200});
}}
