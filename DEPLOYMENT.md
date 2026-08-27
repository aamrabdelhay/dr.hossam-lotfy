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
| `SEED_ON_BUILD` | `1` لمرة واحدة عند الحاجة إلى زرع الحسابات ودليل الأماكن | اختياري |
| `SKIP_DB_MIGRATE` | `1` فقط عند تنفيذ migrations يدوياً في حالة طوارئ | اختياري وخطر |

توليد `SESSION_SECRET`:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

> ⚠️ لا تضع `DEMO=1` في الإنتاج — هذا المتغيّر يزرع بيانات تجريبية. عند استخدام `SEED_ON_BUILD=1` يفرض سكربت البناء `DEMO=''` حتى لو كان المتغيّر مضبوطاً بالخطأ.

---

## 3. أمر البناء (Build Command)

**Settings → General → Build & Development Settings → Build Command → Override**:

```
npm run vercel-build
```

سكربت `scripts/vercel-build.mjs` يقوم بالتالي بالترتيب:
1. يتحقق من وجود `DATABASE_URL` ثم يطبّق كل SQL migrations عليه (يظهر في اللوج كسطور `[migrate] …`).
2. `prisma generate`.
3. عند ضبط `SEED_ON_BUILD=1` يشغّل `prisma/seed.ts` بعد نجاح الـ migrations، مع فرض `DEMO=''` حتى لا تُزرع بيانات تجريبية.
4. `next build`.

> **فشل الـ migration أو غياب `DATABASE_URL` يُسقط الـ deploy عمداً.** هذا يمنع نشر كود أحدث من مخطط قاعدة البيانات، وهو سبب أخطاء `P2022` مثل غياب `locations.nameEn`.
>
> يوجد مخرج طوارئ واحد: `SKIP_DB_MIGRATE=1`. استخدمه فقط بعد تطبيق الـ migrations يدوياً والتحقق من المخطط، ثم أزله فوراً. عند ضبط `SEED_ON_BUILD=1` يبقى `DATABASE_URL` مطلوباً حتى مع هذا المخرج.

---

## 4. أول نشر

1. **Deployments → Redeploy** مع إلغاء تفعيل خيار **Use existing Build Cache**.
2. افتح **Build Logs** وتأكد من ظهور:
   ```
   [migrate] applying init …
   [migrate] applying extend_location …
   [migrate] done
   ```
3. إذا ظهر خطأ `DATABASE_URL is required` فالمتغيّر لم يُضَف لبيئة **Production** الصحيحة؛ البناء لن يكمل قبل إصلاحه.
4. بعد اكتمال النشر افحص `/api/health` كما في القسم التالي؛ يجب أن يعيد `200` و`"status":"ok"`.

---

## 5. تشخيص الخدمة عبر `/api/health`

نفّذ من المتصفح أو الطرفية (لا يحتاج إلى تسجيل دخول):

```bash
curl -i https://dr-hossam-lotfy-hw88-aamrabdelhays-projects.vercel.app/api/health
```

الاستجابة لا تعرض كلمات المرور أو رابط الاتصال الكامل. تعيد `200` عندما تكون الحالة `ok`، و`503` عندما تكون `degraded` أو `down` حتى تظهر المشكلة بوضوح في أدوات المراقبة.

| الحقل / النتيجة | المعنى | الإجراء المطلوب |
| :--- | :--- | :--- |
| `status: "ok"` وHTTP `200` | الاتصال، migrations، المخطط، ومتغيرات البيئة الأساسية سليمة | لا شيء؛ افحص العدادات في `data` للتأكد من اكتمال الـ seed. |
| `status: "degraded"` وHTTP `503` | قاعدة البيانات قابلة للوصول لكن يوجد إعداد أو migration أو جدول ناقص | اقرأ `hints[]`؛ غالباً طبّق `extend_location` ثم Redeploy بدون cache. |
| `status: "down"` وHTTP `503` | لا يوجد `DATABASE_URL` أو تعذّر الاتصال بـ Neon | راجع رابط Neon الـ pooled وصلاحية الوصول ومتغيرات Production. |
| `env.DATABASE_URL` / `env.SESSION_SECRET` | قيمتا `true` تعنيان أن المتغير موجود (لا تُعرض قيمته) | أضف أي متغير قيمته `false`. |
| `env.NEXT_PUBLIC_SITE_URL` | رابط الموقع المستخدم في `robots.txt` و`sitemap.xml` | اضبطه على الدومين النهائي ثم أعد النشر. |
| `migrations.applied`, `missing` | يسرد migrations المسجلة؛ يقبل الاسم القصير أو الاسم المؤرخ | يجب أن تكون `missing: []` وأن تشمل `init` و`extend_location`. |
| `schema.extendedLocationColumns` | أعمدة `locations` الموسعة، ومنها `nameEn`، موجودة | إن كانت `false` شغّل `npm run db:migrate` أو Redeploy بأمر البناء الصحيح. |
| `schema.authSessionsTable` | جدول الجلسات الآمنة `auth_sessions` موجود | إن كانت `false` طبّق `extend_location`. |
| `data.locations`, `courts`, `users`, `lawyers`, `tasks` | عدادات بيانات حية؛ `null` يعني تعذر قراءة الجدول | شغّل الـ seed عند الحاجة؛ المتوقّع بعده 134 مكاناً و119 محكمة. |

---

## 6. زرع البيانات (مرة واحدة فقط)

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

بديل من Vercel: اضبط `SEED_ON_BUILD=1` في **Production**، أعد النشر بعد نجاح الـ migrations، ثم احذف المتغيّر أو غيّره فور اكتمال الزرع. يبقى الـ seed آمناً لأن سكربت البناء يمرّر `DEMO=''` إجبارياً.

---

## 7. الحسابات والصلاحيات

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

## 8. ربط الدومين

1. **Settings → Domains** → أضف الدومين.
2. في مسجّل الدومين: سجل **CNAME** باسم النطاق الفرعي إلى `cname.vercel-dns.com` (أو سجلات A للـ root حسب تعليمات Vercel).
3. بعد نجاح الربط: حدّث `NEXT_PUBLIC_SITE_URL` بالدومين الجديد ثم **Redeploy** (يستخدمه `robots.txt` و `sitemap.xml`).

---

## 9. قائمة التحقق بعد النشر

| # | الاختبار | المتوقع |
| :--- | :--- | :--- |
| 1 | `/api/health` | HTTP 200 و`status: ok` و`missing: []` |
| 2 | `/sessions` | 200 (ليس 404) |
| 3 | `/robots.txt` | يحتوي `Sitemap:` بالدومين الصحيح |
| 4 | `/sitemap.xml` | يحتوي 134 رابط مكان |
| 5 | `/locations` | قسمان + فلاتر (محافظة/نوع/مسافة) |
| 6 | `/calendar` | زر «إضافة موعد» يظهر بعد الدخول ومخفي للزائر |
| 7 | `/api/search?q=tax` | يرجع «مكتب ضرائب الدقي» |
| 8 | `/api/search?q=محكمة` | يرجع محاكم (COURT) |
| 9 | صور الأشخاص | Avatar مستطيل حروف فقط |
| 10 | الزر العائم | قبل الفوتر، `z-[75]` |
| 11 | اللوجو | مرة واحدة في النافبار |
| 12 | الاتجاه | RTL يمين |
| 13 | `/admin` بدون جلسة | يحوّل إلى `/admin/login` |
| 14 | `POST /api/locations` كزائر | 403 |
| 15 | `GET /api/users` كزائر أو غير مدير عام | 403 |
| 16 | هيدرز الأمان | CSP, X-Frame-Options: DENY, nosniff, Referrer-Policy, Permissions-Policy, HSTS |
| 17 | كوكي الجلسة | يبدأ بـ `v1.` ولا يحتوي CUID |

---

## 10. التطوير المحلي

```bash
npm install
cp .env.example .env
npm run db:init      # يشغّل PostgreSQL المدمج على 5432
npm run db:migrate   # يطبّق الـ migrations
DEMO=1 npm run db:seed
npm run dev
```

لإعادة فحص الأساسيات بأمر واحد بعد تشغيل الموقع محلياً أو على Vercel:

```bash
npm run smoke
npm run smoke -- https://dr-hossam-lotfy-hw88-aamrabdelhays-projects.vercel.app
```
