# دليل نشر الإنتاج — DR. HOSSAM LOTFY LAW FIRM

المنصة: **Next.js 15.5 + Prisma 7 + PostgreSQL (Neon) على Vercel**.
هذا الملف هو المرجع الوحيد لخطوات النشر — نفّذها بالترتيب.

---

## 1. قاعدة البيانات (Neon)

1. من لوحة Vercel: **Storage → Create Database → Neon** (أو أنشئ مشروعاً على [neon.tech](https://neon.tech) مباشرة).
2. انسخ رابط الاتصال **Pooled** (يحتوي على `-pooler` و `?sslmode=require`).
   مثال:
   `postgresql://user:pass@ep-xxx-pooler.eu-central-1.aws.neon.tech/neondb?sslmode=require`

> استخدم دائماً الرابط الـ **pooled** مع Vercel (serverless) لتفادي استنفاد الاتصالات.

---

## 2. متغيّرات البيئة (Environment Variables)

**Vercel Dashboard → Project → Settings → Environment Variables** — أضفها للبيئات الثلاث (Production / Preview / Development):

| المتغيّر | القيمة | إلزامي |
| :--- | :--- | :--- |
| `DATABASE_URL` | رابط Neon الـ pooled | ✅ |
| `SESSION_SECRET` | سلسلة عشوائية طويلة (48 بايت) | ✅ |
| `NEXT_PUBLIC_SITE_URL` | `https://dr-hossam-lotfy-hw88-aamrabdelhays-projects.vercel.app` أو الدومين النهائي | ✅ |
| `ADMIN_NAME` | `DR. Hossam Lotfy` | للـ seed فقط |
| `ADMIN_EMAIL` | `admin@loutfilawfirm.net` | للـ seed فقط |
| `ADMIN_PASSWORD` | كلمة مرور قوية | للـ seed فقط |
| `BLOB_READ_WRITE_TOKEN` | من Vercel Blob Store | اختياري (رفع الصور) |

توليد `SESSION_SECRET`:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

> ⚠️ لا تضع `DEMO=1` في الإنتاج — هذا المتغيّر يزرع بيانات تجريبية.

---

## 3. أمر البناء (Build Command)

**Settings → General → Build & Development Settings → Build Command → Override**:

```
npm run vercel-build
```

سكربت `scripts/vercel-build.mjs` يقوم بالتالي بالترتيب:
1. تطبيق كل الـ SQL migrations على `DATABASE_URL` (يظهر في اللوج كسطور `[migrate] …`).
2. `prisma generate`.
3. `next build`.

فشل خطوة الـ migration لا يُسقط الـ deploy (يُسجَّل تحذير فقط) حتى لا يتعطّل الموقع بسبب عطل مؤقت في قاعدة البيانات.

---

## 4. أول نشر

1. **Deployments → Redeploy** مع إلغاء تفعيل خيار **Use existing Build Cache**.
2. افتح **Build Logs** وتأكد من ظهور:
   ```
   [migrate] applying init …
   [migrate] applying extend_location …
   [migrate] done
   ```
3. إذا ظهر `DATABASE_URL is not set — SKIPPING migrations` فالمتغيّر لم يُضَف للبيئة الصحيحة.

---

## 5. زرع البيانات (مرة واحدة فقط)

من جهازك المحلي بعد نجاح النشر:

```bash
DATABASE_URL="<NEON_POOLED_URL>" \
ADMIN_NAME="DR. Hossam Lotfy" \
ADMIN_EMAIL="admin@loutfilawfirm.net" \
ADMIN_PASSWORD="<كلمة مرور قوية>" \
npm run db:seed
```

النتيجة المتوقعة:

```
👤 staff account created: admin@loutfilawfirm.net (SUPER_ADMIN)
📍 Seeding 119 courts + 15 legal destinations…
✅ 134 locations seeded (119 محكمة).
✅ Seed complete.
```

السكربت **idempotent** — تشغيله مرة أخرى لا يكرّر البيانات. **بدون** `DEMO=1` لا تُزرع أي بيانات تجريبية.

---

## 6. الحسابات والصلاحيات

- الدخول من `/admin/login` — البريد الإلكتروني **اختياري**؛ لو تُرك فارغاً يُستخدم أول حساب فريق (المدير العام).
- محاولات الدخول محدودة: 5 محاولات كل 15 دقيقة لكل (IP + بريد).
- بعد الدخول: تبويب **«المستخدمون»** (يظهر للمدير العام فقط) لإضافة حسابات الفريق وتحديد أدوارهم:

| الدور | الصلاحية |
| :--- | :--- |
| `SUPER_ADMIN` | كل شيء + إدارة الحسابات |
| `OFFICE_MANAGER` | كل شيء عدا إدارة الحسابات |
| `SECRETARY` | الجلسات والمهام والأماكن والتعليقات (بدون إدارة المحامين) |
| `LAWYER` | الجلسات والمهام والتعليقات |
| `VIEWER` | قراءة فقط |

الصلاحيات مُطبَّقة على السيرفر في `src/lib/rbac.ts` وكل مسار API يستدعي `requirePermission()` / `requireAdmin()`.
تغيير دور أو كلمة مرور مستخدم يُنهي كل جلساته فوراً.

---

## 7. ربط الدومين

1. **Settings → Domains** → أضف الدومين.
2. في مسجّل الدومين: سجل **CNAME** باسم النطاق الفرعي إلى `cname.vercel-dns.com` (أو سجلات A للـ root حسب تعليمات Vercel).
3. بعد نجاح الربط: حدّث `NEXT_PUBLIC_SITE_URL` بالدومين الجديد ثم **Redeploy** (يستخدمه `robots.txt` و `sitemap.xml`).

---

## 8. قائمة التحقق بعد النشر

| # | الاختبار | المتوقع |
| :--- | :--- | :--- |
| 1 | `/sessions` | 200 (ليس 404) |
| 2 | `/robots.txt` | يحتوي `Sitemap:` بالدومين الصحيح |
| 3 | `/sitemap.xml` | يحتوي 134 رابط مكان |
| 4 | `/locations` | قسمان + فلاتر (محافظة/نوع/مسافة) |
| 5 | `/calendar` | زر «إضافة موعد» يظهر بعد الدخول ومخفي للزائر |
| 6 | `/api/search?q=tax` | يرجع «مكتب ضرائب الدقي» |
| 7 | `/api/search?q=محكمة` | يرجع محاكم (COURT) |
| 8 | صور الأشخاص | Avatar مستطيل حروف فقط |
| 9 | الزر العائم | قبل الفوتر، `z-[75]` |
| 10 | اللوجو | مرة واحدة في النافبار |
| 11 | الاتجاه | RTL يمين |
| 12 | `/admin` بدون جلسة | يحوّل إلى `/admin/login` |
| 13 | `POST /api/locations` كزائر | 403 |
| 14 | `GET /api/users` كزائر أو غير مدير عام | 403 |
| 15 | هيدرز الأمان | CSP, X-Frame-Options: DENY, nosniff, Referrer-Policy, Permissions-Policy, HSTS |
| 16 | كوكي الجلسة | يبدأ بـ `v1.` ولا يحتوي CUID |

---

## 9. التطوير المحلي

```bash
npm install
cp .env.example .env
npm run db:init      # يشغّل PostgreSQL المدمج على 5432
npm run db:migrate   # يطبّق الـ migrations
DEMO=1 npm run db:seed
npm run dev
```
