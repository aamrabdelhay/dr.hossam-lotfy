# دليل نشر الإنتاج — DR. HOSSAM LOTFY LAW FIRM

تم إعداد المشروع وتهيئته للنشر بنجاح على **Vercel** مع دعم **@vercel/blob** و**Prisma 7** و**PostgreSQL (Neon)**.

---

## 1. التعديلات المنجزة في الكود
- تم تثبيت حزمة `@vercel/blob` في `package.json`.
- تم تعديل `src/lib/upload.ts` ليعتمد تلقائياً على `@vercel/blob` عند وجود المتغير `BLOB_READ_WRITE_TOKEN` في الإنتاج، مع الإبقاء على التخزين المحلي التلقائي في بيئة التطوير/الساندبوكس عند غيابه.
- المسار `/uploads/[file]` يعمل بشكل طبيعي للملفات المحلية.
- جميع اختبارات النظام (10/10) تم التحقق منها بنجاح.

---

## 2. إعداد قاعدة البيانات (Neon)
1. من لوحة تحكم Vercel: توجه إلى **Storage** -> **Create Database** -> اختر **Neon** (أو أنشئ مشروعاً على Neon مباشرة).
2. انسخ رابط الاتصال المجمّع **Pooled Connection String** (الذي يستخدم البورت `6500` ومعامل `?sslmode=require&pgbouncer=true`).

---

## 3. متغيرات البيئة في Vercel (Environment Variables)
أضف المتغيرات التالية في:
**Vercel Dashboard -> Project Settings -> Environment Variables**:

| المتغير | القيمة | ملاحظات |
| :--- | :--- | :--- |
| `DATABASE_URL` | `postgresql://...:6500/...` | رابط Neon المجمّع (pooler) |
| `SESSION_SECRET` | سلسلة عشوائية قوية (+48 حرف) | لتوقيع كوكيز الجلسات |
| `ADMIN_PASSWORD` | `Loutfy@Admin2026` | كلمة مرور دخول لوحة الإدارة |
| `ADMIN_NAME` | `DR. Hossam Lotfy` | اسم المسؤول الرئيسي |
| `ADMIN_EMAIL` | `admin@loutfilawfirm.net` | بريد المسؤول الرئيسي |
| `BLOB_READ_WRITE_TOKEN` | من Vercel Blob Store | لرفع الصور إلى Vercel Blob |
| `NEXT_PUBLIC_BASE_URL` | `https://dr.hossam-lotfy.com` | رابط الدومين الرسمي |

> **ملاحظة بخصوص Vercel Blob**:
> من لوحة Vercel -> اختر **Storage** -> **Create Database** -> **Blob** -> اربطه بهذا المشروع (`Connect to Project`). سيقوم Vercel بإضافة `BLOB_READ_WRITE_TOKEN` تلقائياً.

---

## 4. تطبيق الـ Migrations والبيانات الأولية (Seed)
شغّل الأمرين التاليين مرة واحدة مع تمرير `DATABASE_URL` لقاعدة بيانات الإنتاج:

```bash
DATABASE_URL="<NEON_POOLED_CONNECTION_STRING>" node scripts/apply-migrations.mjs
DATABASE_URL="<NEON_POOLED_CONNECTION_STRING>" npx tsx prisma/seed.ts
```

> سكربت `apply-migrations.mjs` آمن ومتطابق (idempotent) ويسجل الترحيل في جدول `_prisma_migrations`.
> سكربت `seed.ts` يقوم بتهيئة حساب المسؤول والمحامين الـ 8 والأماكن الـ 12 والقضايا والمهام التجريبية.

---

## 5. ربط الدومين (dr.hossam-lotfy.com)
1. في Vercel Dashboard -> المشروع -> **Settings** -> **Domains**.
2. أضف `dr.hossam-lotfy.com`.
3. في لوحة تحكم مسجل الدومين (Domain Registrar / DNS):
   - أنشئ سجل **CNAME**:
     - **Name**: `dr` (أو `@` إذا كان Root Domain مع Alias/ANAME)
     - **Target**: `cname.vercel-dns.com`
4. انتظر بضع دقائق ليقوم Vercel بإصدار شهادة SSL التلقائية والتحقق من الـ DNS.

---

## 6. التحقق النهائي من معايير القبول (10/10)
تم التحقق بنجاح من كافة الوظائف:
1. ✅ **الصفحة الرئيسية**: استجابة 200 + اتجاه RTL عربي + الشريط الجانبي بأقسامه الـ 5 + شريط تنبيه الأسبوعين.
2. ✅ **لوحة الإدارة**: تسجيل الدخول بكلمة المرور عبر `/admin/login` وعرض الإحصائيات الحية `/api/admin/stats`.
3. ✅ **مهام متعددة المحامين**: إنشاء مهمة وتعيين حتى 7 محامين (أو أكثر حتى 20) مع إنشاء سجل assignment مستقل لكل محامٍ.
4. ✅ **الروابط السحرية (Magic Links)**: توليد رابط الدخول الفردي `/access/[token]`، وتأكيد عمل الجلسة، ورفض الرابط تلقائياً عند المحاولة الثانية (One-time use).
5. ✅ **تنفيذ المهام والصلاحيات**: المحامي المعين فقط يستطيع إكمال مهمته وتتحول إلى `COMPLETED`، وأي محامٍ غير مسند إليه يتلقى `403 Forbidden`.
6. ✅ **تعليقات الزوار والإدارة**: الزائر يستطيع التعليق باسمه، وظهور التعليق فوراً، وإمكانية حذفه بواسطة المسؤول.
7. ✅ **رفع الصور**: دعم `@vercel/blob` للإنتاج والتخزين المحلي للـ dev، وظهور الصورة في صفحة المحامي والـ Avatar فوراً.
8. ✅ **البحث المتقدم**: البحث عن كلمة "محكمة" يعيد المحاكم والجلسات المرتبطة بدقة.
9. ✅ **ترتيب المحامين**: ظهور د. حسام لطفي دائماً في صدارة قائمة المحامين بصفته المحامي الرئيسي.
10. ✅ **صفحة الخطأ 404**: صفحة 404 عربية مخصصة ومتناسقة مع الهوية القانونية للمكتب.
