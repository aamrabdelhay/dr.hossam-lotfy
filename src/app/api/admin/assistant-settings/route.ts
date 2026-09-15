import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { handle, json, readJson, requireAdmin } from '@/lib/api';
const schema=z.object({apiKey:z.string().trim().min(1).max(500)});
export const GET=handle(async()=>{await requireAdmin();const row=await prisma.adminSetting.findUnique({where:{key:'assistant_api_key'}});const env=process.env.OPENROUTER_API_KEY||'';const key=row?.value||env;return json({configured:Boolean(key),source:row?.value?'admin':'environment',masked:key?`${key.slice(0,6)}••••••${key.slice(-4)}`:''});});
export const POST=handle(async(req:Request)=>{await requireAdmin();const {apiKey}=await readJson(req as never,schema);await prisma.adminSetting.upsert({where:{key:'assistant_api_key'},create:{key:'assistant_api_key',value:apiKey},update:{value:apiKey}});return json({ok:true,configured:true,masked:`${apiKey.slice(0,6)}••••••${apiKey.slice(-4)}`});});
export const DELETE=handle(async()=>{await requireAdmin();await prisma.adminSetting.delete({where:{key:'assistant_api_key'}}).catch(()=>undefined);return json({ok:true});});
