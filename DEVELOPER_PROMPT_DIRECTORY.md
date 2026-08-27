# Production-Ready Prompt for AI Developer — دليل المحامي

> انسخ هذا الملف كاملا وأرسله للـ AI Developer / AI Coding Agent

---

أنت تعمل داخل مشروع Next.js 15 + Prisma + PostgreSQL موجود بالفعل لمكتب DR. HOSSAM LOTFY LAW FIRM. المشروع به Auth و Navbar و Footer و Theme وهوية بصرية جديدة بعد إعادة التصميم:

Palette:
--navy: #101C2C
--navy2: #18263A
--burgundy: #641F2B
--gold: #8A6A3A
--ivory: #F7F5F0
--charcoal: #242424
--gray: #6B6B6B
--line: #EEEBE4
--line2: #E0D8CC

Fonts (مضافة في globals.css):
@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;500;600&family=IBM+Plex+Sans+Arabic:wght@300;400;500&display=swap');
English headings → Cormorant Garamond
Arabic body → IBM Plex Sans Arabic

**لا تعيد بناء الموقع من الصفر. ادمج فقط.**

## المطلوب: إضافة قسم "دليل المحامي في مصر"

### 1. Database Schema — أضف إلى prisma/schema.prisma

```
model LegalDirectoryCategory { ... }
model LegalDirectoryBuilding { ... }
model LegalDirectoryItem { ... }
```

راجع docs/lawyer-guide-database.md للقالب الكامل مع كل الحقول: officialNameAr, officialNameEn, categoryId, subType, governorate, city, district, fullAddress, phone, email, website, googleMapsUrl, lat, lng, workingHours, services String[], jurisdiction, relatedEntityIds String[], requiresPersonalAttendance, hasOnlineService, onlineServiceUrl, source, lastVerified, confidence, distanceFromDokkiKm, distanceBucket, buildingId, searchKeywords, timestamps + indexes.

نقطة مرجعية الدقي: lat 30.0380, lng 31.2000. احسب المسافة بـ Haversine.

### 2. API

- GET /api/directory?q=&category=&governorate=&distanceBucket=&service=&sort=distance&page=&limit=
- GET /api/directory/[slug]
- POST/PUT/DELETE محمية admin
- حدث /api/search ليشمل الجدول الجديد

بحث يدعم "عايز أعمل توكيل" → يطابق searchKeywords.

### 3. UI /directory

- خلفية #F7F5F0، نفس هوية صفحة المحامي الجديدة (بدون كروت ملونة، borders #EEEBE4 فقط)
- Search + Filters (Category pills, Governorate, Distance Bucket 0-5,5-10,10-20,20-40,40-75,75-150,150-300,300+)
- Sort: الأقرب للدقي افتراضيا
- View: List / Map / Nearby
- كل row: اسم عربي + إنجليزي صغير + نوع + محافظة + مسافة + زر Directions (Google Maps) + تفاصيل + tel: + website
- Detail Page: definition list مثل Professional Profile، خريطة، خدمات، اختصاص، جهات مرتبطة، مصدر، آخر تحقق، مستوى ثقة، زر أبلغ عن خطأ، جهات في نفس المبنى، الأقرب لهذا المكان

### 4. Admin /admin/directory

- CRUD + CSV import + منع تكرار بـ slug
- confidence needs_verification يظهر ملاحظة محايدة
- سجل تدقيق

### 5. Integration

- TaskCreator autocomplete من الدليل
- ربط محكمة ↔ نيابة ↔ نقابة عبر relatedEntityIds

### 6. Design Rules

- لا duplicate footer (يوجد واحد في layout.tsx)
- لا badges ملونة (لا أخضر/أزرق)
- Typography Cormorant + IBM Plex
- RTL صحيح، Mobile stack صحيح
- حافظ على كل الروابط الحالية: /sessions/[id], /locations/[id], tel:, maps, /admin/login, /search, /calendar

### 7. Seed

ابدأ بـ 30 مكان مؤكد من الدقي والعجوزة وشمال الجيزة مع إحداثيات حقيقية ومصادر رسمية (وزارة العدل، eta.gov.eg، egyls.com، ITDA، GAFI، esa.gov.eg). لا تخترع عناوين. أي معلومة غير مؤكدة confidence=needs_verification.

### 8. Checklist

- [ ] Footer مرة واحدة
- [ ] بحث بالاسم والخدمة يعمل
- [ ] فلترة وترتيب حسب المسافة من الدقي
- [ ] Directions و tel: يعمل
- [ ] Detail يعرض كل الحقول
- [ ] Admin يمنع التكرار
- [ ] لا يكسر /lawyers/[slug] الجديد
- [ ] Build ينجح

سلم migration + seed + docs.

