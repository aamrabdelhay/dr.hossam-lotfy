import { prisma } from '@/lib/prisma';
import { handle, json, user } from '@/lib/api';
import { can } from '@/lib/rbac';
import { logActivity } from '@/lib/activity';
import { notifyTaskCompleted } from '@/lib/notifications';
import { createOfficeRequest, isSeniorManagement, notifySenior } from '@/lib/office-workflow';
import { escapeTelegramHtml, sendTelegramGroupNotification } from '@/lib/telegram';
import { appOrigin } from '@/lib/google-oauth';
type Ctx={params:Promise<{id:string}>};
export const POST=handle(async(_req:Request,ctx:Ctx)=>{const{id}=await ctx.params;const session=await user();if(!session)return json({error:'يجب تسجيل الدخول لإتمام هذا الإجراء'},{status:401});const task=await prisma.task.findUnique({where:{id},include:{assignees:{include:{lawyer:true}},location:true,author:true}});if(!task)return json({error:'المهمة غير موجودة'},{status:404});if(task.status==='CANCELLED')return json({error:'المهمة ملغاة'},{status:409});const now=new Date();if(session.role==='admin'){if(!can(session.userRole,'writeTasks'))return json({error:'لا تملك صلاحية تسجيل تنفيذ المهمة'},{status:403});if(task.status==='COMPLETED')return json({error:'هذه المهمة مسجلة كمكتملة بالفعل'},{status:409});const remaining=task.assignees.filter(a=>!a.completedAt);if(remaining.length===0)return json({error:'لا توجد إسنادات معلقة لهذه المهمة'},{status:409});for(const assignment of remaining){const existing=await prisma.notification.findFirst({where:{lawyerId:assignment.lawyerId,type:'TASK_COMPLETION_REQUEST',link:`/sessions/${id}`,readAt:null}});if(!existing)await prisma.notification.create({data:{lawyerId:assignment.lawyerId,type:'TASK_COMPLETION_REQUEST',title:'طلب إنهاء تكليف نيابةً عنك',body:`الإدارة تطلب تسجيل تنفيذ التكليف: ${task.description.slice(0,120)}`,link:`/sessions/${id}`}});}await logActivity({action:'COMPLETION_REQUESTED',summary:`طلبت الإدارة موافقة المحامين على إنهاء التكليف: ${task.description.slice(0,70)}`,taskId:id,locationId:task.locationId,byUserId:session.userId});return json({ok:true,requested:true});}
if(session.role!=='lawyer')return json({error:'لا يمكنك تنفيذ هذه المهمة'},{status:403});const mine=task.assignees.find(a=>a.lawyerId===session.lawyerId);if(!mine){const senior=await isSeniorManagement(session);void senior;const rid=await createOfficeRequest({type:'TASK_COMPLETE_FOR_COLLEAGUE',title:'طلب تنفيذ تكليف زميل',reason:`طلب تنفيذ مهمة مسندة إلى زميل: ${task.description}`,payload:{taskId:id,requestedLawyerId:session.lawyerId},targetEntityType:'task',targetEntityId:id,session});await notifySenior('طلب تنفيذ تكليف زميل',`طلب ${session.name} تنفيذ مهمة ليست مسندة إليه: ${task.description.slice(0,100)}`,`/sessions/${id}`).catch(()=>undefined);return json({ok:true,requiresApproval:true,requestId:rid,message:'تم إرسال الطلب للإدارة العليا للموافقة'});}if(mine.completedAt)return json({error:'هذه المهمة مسجلة كمكتملة بالفعل'},{status:409});await prisma.taskAssignment.update({where:{id:mine.id},data:{completedAt:now,completedById:session.lawyerId}});const remaining=await prisma.taskAssignment.count({where:{taskId:id,completedAt:null}});if(remaining===0)await prisma.task.update({where:{id},data:{status:'COMPLETED',completedAt:now}});else await prisma.task.update({where:{id},data:{status:'IN_PROGRESS'}});await logActivity({action:'COMPLETED',summary:`أنجز مهمة: ${task.description.slice(0,70)}`,taskId:id,lawyerId:session.lawyerId,locationId:task.locationId,byLawyerId:session.lawyerId});await notifyTaskCompleted(id,session.name,task.description.slice(0,70),task.location.name);
await sendTelegramGroupNotification([
  '<b>✅ تم تنفيذ تكليف</b>',
  '',
  '<b>المحامي:</b> '+escapeTelegramHtml(session.name),
  '<b>التكليف:</b> '+escapeTelegramHtml(task.description),
  '<b>المكان:</b> '+escapeTelegramHtml(task.location.name),
  '<b>حالة التكليف:</b> '+(remaining===0?'اكتمل تنفيذ جميع الإسنادات':'تم تسجيل التنفيذ للمحامي، وباقي إسنادات معلقة'),
  '',
  '<a href="'+appOrigin()+'/sessions/'+id+'">عرض التكليف</a>',
].join('\\n')).catch((error)=>console.error('Task completion Telegram notification failed:',error));
return json({ok:true,completed:remaining===0});});

export const DELETE = handle(async (_req: Request, ctx: Ctx) => {
  const { id } = await ctx.params;
  const session = await user();
  if (!session) return json({ error: 'يجب تسجيل الدخول لإلغاء تسجيل التنفيذ' }, { status: 401 });
  const task = await prisma.task.findUnique({ where: { id }, include: { assignees: true, location: true } });
  if (!task) return json({ error: 'المهمة غير موجودة' }, { status: 404 });
  if (task.status === 'CANCELLED') return json({ error: 'المهمة ملغاة' }, { status: 409 });

  if (session.role === 'admin') {
    if (!can(session.userRole, 'writeTasks')) return json({ error: 'لا تملك صلاحية تعديل التنفيذ' }, { status: 403 });
    await prisma.taskAssignment.updateMany({ where: { taskId: id }, data: { completedAt: null, completedById: null } });
    await prisma.task.update({ where: { id }, data: { status: 'PENDING', completedAt: null } });
    await logActivity({ action: 'COMPLETION_REVERTED', summary: 'ألغت الإدارة تسجيل تنفيذ التكليف: ' + task.description.slice(0, 70), taskId: id, locationId: task.locationId, byUserId: session.userId });
    return json({ ok: true, completed: false });
  }

  if (session.role !== 'lawyer') return json({ error: 'لا يمكنك تعديل تنفيذ هذه المهمة' }, { status: 403 });
  const mine = task.assignees.find((assignment) => assignment.lawyerId === session.lawyerId);
  if (!mine) return json({ error: 'المهمة ليست مسندة إليك' }, { status: 403 });
  if (!mine.completedAt) return json({ error: 'المهمة غير مسجلة كمكتملة لديك' }, { status: 409 });
  await prisma.taskAssignment.update({ where: { id: mine.id }, data: { completedAt: null, completedById: null } });
  const remaining = await prisma.taskAssignment.count({ where: { taskId: id, completedAt: null } });
  await prisma.task.update({ where: { id }, data: { status: remaining > 0 ? 'IN_PROGRESS' : 'COMPLETED', completedAt: remaining > 0 ? null : task.completedAt } });
  await logActivity({ action: 'COMPLETION_REVERTED', summary: 'تراجع ' + session.name + ' عن تسجيل تنفيذ التكليف: ' + task.description.slice(0, 70), taskId: id, lawyerId: session.lawyerId, locationId: task.locationId, byLawyerId: session.lawyerId });
  return json({ ok: true, completed: false });
});
