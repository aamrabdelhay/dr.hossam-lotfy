import Link from 'next/link';
import { Archive, UserRound } from 'lucide-react';
import { Card } from './ui';

export type LawyerStatusPost = {
  id: string;
  action: 'LAWYER_DEACTIVATED' | 'LAWYER_REACTIVATED';
  summary: string;
  createdAt: string;
  lawyer: { fullName: string; slug: string } | null;
};

export function LawyerStatusPosts({ posts }: { posts: LawyerStatusPost[] }) {
  if (posts.length === 0) return null;
  return (
    <div className="space-y-3">
      {posts.map((post) => (
        <Card key={post.id} className="overflow-hidden border-navy-100/80 bg-white shadow-card">
          <div className="flex items-start gap-3 p-4 sm:p-5">
            <span className="masthead flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-[var(--masthead-accent)] ring-1 ring-line">
              {post.action === 'LAWYER_DEACTIVATED' ? <Archive size={17} /> : <UserRound size={17} />}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center justify-between gap-2">
                {post.lawyer ? <Link href={`/lawyers/${post.lawyer.slug}`} className="text-[13px] font-extrabold text-navy-950 hover:underline">{post.lawyer.fullName}</Link> : <span className="text-[13px] font-extrabold text-navy-950">إدارة المكتب</span>}
                <span className="text-[10px] font-semibold text-navy-300">{new Date(post.createdAt).toLocaleString('ar-EG')}</span>
              </div>
              <p className="mt-2 text-[12.5px] font-semibold leading-6 text-navy-700">{post.summary}</p>
              <p className="mt-2 inline-flex rounded-full bg-navy-900/[0.05] px-2.5 py-1 text-[10px] font-bold text-navy-500">
                {post.action === 'LAWYER_DEACTIVATED' ? 'تم التعطيل' : 'تم الاسترجاع'}
              </p>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
