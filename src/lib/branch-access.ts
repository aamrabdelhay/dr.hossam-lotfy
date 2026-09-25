import 'server-only';
import { prisma } from '@/lib/prisma';
import type { SessionUser } from '@/lib/auth';

export type BranchRow={id:string;code:string;name_ar:string;name_en:string|null;address:string;is_main:boolean;active:boolean};
export type BranchScope={allBranches:boolean;branchIds:string[];officeManagerBranchIds:string[];financeManagerBranchIds:string[];officeManager:boolean;financeManager:boolean};

export async function getAllBranches():Promise<BranchRow[]>{
  return prisma.$queryRawUnsafe<BranchRow[]>(`SELECT "id","code","name_ar","name_en","address","is_main","active" FROM "office_branches" WHERE "active"=true ORDER BY "is_main" DESC,"name_ar" ASC`);
}
export async function getBranchScope(session:SessionUser|null):Promise<BranchScope>{
  if(!session)return{allBranches:false,branchIds:[],officeManagerBranchIds:[],financeManagerBranchIds:[],officeManager:false,financeManager:false};
  const senior=session.role==='admin'&&(session.userRole==='ADMIN'||session.userRole==='SUPER_ADMIN');
  if(senior)return{allBranches:true,branchIds:[],officeManagerBranchIds:[],financeManagerBranchIds:[],officeManager:false,financeManager:false};
  const userId=session.role==='admin'?session.userId:null;
  const lawyerId=session.role==='lawyer'?session.lawyerId:null;
  const rows=await prisma.$queryRawUnsafe<Array<{branch_id:string;manager_type:string}>>(
    `SELECT "branch_id","manager_type" FROM "office_branch_managers" WHERE (("user_id"=$1 AND $1 IS NOT NULL) OR ("lawyer_id"=$2 AND $2 IS NOT NULL))`,userId,lawyerId).catch(()=>[]);
  const officeManagerBranchIds=rows.filter(r=>r.manager_type==='OFFICE_MANAGER').map(r=>r.branch_id);
  const financeManagerBranchIds=rows.filter(r=>r.manager_type==='FINANCE_MANAGER').map(r=>r.branch_id);
  const branchIds=Array.from(new Set([...officeManagerBranchIds,...financeManagerBranchIds]));
  return{allBranches:false,branchIds,officeManagerBranchIds,financeManagerBranchIds,officeManager:officeManagerBranchIds.length>0,financeManager:financeManagerBranchIds.length>0};
}
export async function hasBranchAccess(session:SessionUser|null,branchId:string,kind:'office'|'finance'='office'){
  const scope=await getBranchScope(session);if(scope.allBranches)return true;
  return(kind==='finance'?scope.financeManagerBranchIds:scope.officeManagerBranchIds).includes(branchId);
}
export async function branchForWrite(session:SessionUser|null,requestedBranchId?:string|null){
  const scope=await getBranchScope(session);if(scope.allBranches)return requestedBranchId||'branch_main';
  if(scope.officeManagerBranchIds.length===1)return scope.officeManagerBranchIds[0];
  if(scope.financeManagerBranchIds.length===1)return scope.financeManagerBranchIds[0];
  return null;
}
export async function visibleBranchIds(session:SessionUser|null,kind:'office'|'finance'='office'){
  const scope=await getBranchScope(session);if(scope.allBranches)return(await getAllBranches()).map(b=>b.id);
  return kind==='finance'?scope.financeManagerBranchIds:scope.officeManagerBranchIds;
}
export async function branchSummary(branchId:string){
  const branch=(await prisma.$queryRawUnsafe<BranchRow[]>(`SELECT "id","code","name_ar","name_en","address","is_main","active" FROM "office_branches" WHERE "id"=$1 LIMIT 1`,branchId))[0]??null;
  if(!branch)return null;
  const[lawyers,cases,clients]=await Promise.all([
    prisma.$queryRawUnsafe<any[]>(`SELECT l."id",l."fullName",l."title",l."active",l."email",l."googleEmail" FROM "office_branch_lawyers" bl JOIN "lawyers" l ON l."id"=bl."lawyer_id" WHERE bl."branch_id"=$1 ORDER BY l."fullName"`,branchId),
    prisma.$queryRawUnsafe<any[]>(`SELECT "id","name","number","clientName","archived_at" FROM "case_records" WHERE COALESCE("branch_id",$1)=$1 ORDER BY "id" DESC LIMIT 500`,branchId),
    prisma.$queryRawUnsafe<any[]>(`SELECT "id","name","phone","email","assignedLawyerId","status" FROM "clients" WHERE COALESCE("branch_id",$1)=$1 AND COALESCE("status",'MAIN')<>'DELETED' ORDER BY lower("name") LIMIT 500`,branchId)
  ]);
  return{branch,lawyers,cases,clients};
}
