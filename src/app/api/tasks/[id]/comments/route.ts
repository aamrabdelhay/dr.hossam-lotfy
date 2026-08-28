import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { handle, json, readJson, user } from '@/lib/api';
import { logActivity } from '@/lib/activity';
import { notifyComment } from '@/lib/notifications';
import type { CommentVM } from '@/components/comment-section';

type Ctx = { params: Promise<{ id: string }> };

function toVM(c: {
  id: string;
  text: string;
  createdAt: Date;
  authorLawyer: { fullName: string; profilePhotoUrl: string | null } | null;
  authorUser: { name: string } | null;
  authorName: string | null;
  authorLawyerId: string | null;
  authorUserId: string | null;
}, session: Awaited<ReturnType<typeof user>>): CommentVM {
  const role = session?.role;
  const lawyerId = session?.role === 'lawyer' ? session.lawyerId : null;
  const adminId = session?.role === 'admin' ? session.userId : null;
  return {
    id: c.id,
    text: c.text,
    createdAt: c.createdAt.toISOString(),
    author: c.authorLawyer
      ? { name: c.authorLawyer.fullName, photo: c.authorLawyer.profilePhotoUrl }
      : c.authorUser
        ? { name: c.authorUser.name, photo: null }
        : c.authorName
          ? { name: c.authorName, photo: null }
          : null,
    authorRole: c.authorLawyer ? 'lawyer' : c.authorUser ? 'admin' : 'guest',
    isMine: (role === 'lawyer' && c.authorLawyerId === lawyerId) || (role === 'admin' && c.authorUserId === adminId),
    canDelete: (role === 'lawyer' && c.authorLawyerId === lawyerId) || (role === 'admin' && c.authorUserId === adminId),
  };
}

export async function GET(_req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const task = await prisma.task.findUnique({ where: { id } });
  if (!task) return json({ error: 'المهمة غير موجودة' }, { status: 404 });
  const comments = await prisma.comment.findMany({
    where: { taskId: id },
    include: {
      authorLawyer: { select: { fullName: true, profilePhotoUrl: true } },
      authorUser: { select: { name: true } },
    },
    orderBy: { createdAt: 'asc' },
  });
  const session = await user();
  return json({ comments: comments.map((c) => toVM(c as never, session)) });
}

const createSchema = z.object({
  text: z.string().min(1, 'نص التعليق مطلوب').max(2000),
});

/** Only an authenticated lawyer or admin may comment. */
export const POST = handle(async (req: Request, ctx: Ctx) => {
  const { id } = await ctx.params;
  const session = await user();
  if (!session) return json({ error: 'يجب تسجيل الدخول لإضافة تعليق.' }, { status: 401 });

  const data = await readJson(req as never, createSchema);

  const task = await prisma.task.findUnique({ where: { id }, include: { location: true } });
  if (!task) return json({ error: 'المهمة غير موجودة' }, { status: 404 });

  const authorName = session.name;

  const comment = await prisma.comment.create({
    data: {
      taskId: id,
      text: data.text.trim(),
      authorLawyerId: session.role === 'lawyer' ? session.lawyerId : null,
      authorUserId: session.role === 'admin' ? session.userId : null,
      authorName: null,
    },
  });

  await logActivity({
    action: 'COMMENTED',
    summary: `علّق على مهمة: ${task.description.slice(0, 60)}`,
    taskId: id,
    locationId: task.locationId,
    byLawyerId: session.role === 'lawyer' ? session.lawyerId : null,
    byUserId: session.role === 'admin' ? session.userId : null,
  });
  await notifyComment(id, comment.id, task.location.name, authorName, data.text.slice(0, 80));

  return json({ ok: true, commentId: comment.id }, { status: 201 });
});
