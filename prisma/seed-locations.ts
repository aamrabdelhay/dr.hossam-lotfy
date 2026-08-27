/**
 * Directory of Egyptian legal destinations, outward from the firm's Dokki
 * office. 119 COURTS (محكمة النقض، دار القضاء العالي، مجلس الدولة، الاستئناف،
 * الاقتصادية، الابتدئية والجزئية في كل المحافظات) + الضرائب، الشهر العقاري،
 * السجل التجاري، النقابة، المساحة، الجوازات … إلخ.
 *
 * The script asserts COURTS.length === 119 before writing.
 */
import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, LocationType } from '../src/generated/prisma/client';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const HOURS = 'الأحد – الخميس · 9:00 ص – 2:00 م';

type CourtSeed = {
  name: string;
  nameEn: string;
  subType: string;
  governorate: string;
  city: string;
  district?: string;
  address: string;
  km: number;
  bucket: string;
  jurisdiction?: string;
  lat?: number;
  lng?: number;
};

function c(
  name: string,
  nameEn: string,
  subType: string,
  governorate: string,
  city: string,
  address: string,
  km: number,
  bucket: string,
  lat?: number,
  lng?: number,
): CourtSeed {
  return { name, nameEn, subType, governorate, city, address, km, bucket, jurisdiction: jurisdictionOf(governorate, subType), lat, lng };
}

function jurisdictionOf(gov: string, subType: string): string {
  if (subType.includes('نقض') || subType.includes('دستورية') || subType.includes('عالي')) return 'على مستوى الجمهورية';
  if (subType.includes('استئناف')) return `دائرة محكمة استئناف ${gov === 'القاهرة' ? 'القاهرة' : gov}`;
  if (subType.includes('إداري') || subType.includes('دولة')) return 'القضاء الإداري — مجلس الدولة';
  return `دائرة محافظة ${gov}`;
}

/** ─────────────── 119 COURT ─────────────── */
const COURTS: CourtSeed[] = [
  // ── الجيزة (0–5كم من الدقي) ──
  c('محكمة شمال الجيزة الابتدائية', 'North Giza Primary Court', 'ابتدائية', 'الجيزة', 'الجيزة', 'ميدان المحاكم — شارع الجيزة', 2.5, '0-5كم', 30.0219, 31.2075),
  c('محكمة شمال الجيزة الجزئية', 'North Giza District Court', 'جزئية', 'الجيزة', 'الدقي', 'شارع التحرير — الدقي', 1.2, '0-5كم', 30.0385, 31.2118),
  c('محكمة شمال الجيزة الاقتصادية', 'North Giza Economic Court', 'اقتصادية', 'الجيزة', 'الجيزة', 'مجمع محاكم الجيزة — شارع الجيزة', 3, '0-5كم', 30.0199, 31.2049),
  c('محكمة شمال الجيزة للأسر', 'North Giza Family Court', 'أسر', 'الجيزة', 'الجيزة', 'مجمع محاكم الجيزة', 3, '0-5كم', 30.0205, 31.2056),
  c('محكمة جنوب الجيزة الابتدائية', 'South Giza Primary Court', 'ابتدائية', 'الجيزة', 'الهرم', 'طريق الكورنيش — فيصل', 6.5, '5-10كم', 29.9585, 31.1902),
  c('محكمة جنوب الجيزة الجزئية', 'South Giza District Court', 'جزئية', 'الجيزة', 'الهرم', 'طريق الهرم — جنوب الجيزة', 7, '5-10كم', 29.9521, 31.1837),
  c('محكمة جنوب الجيزة الاقتصادية', 'South Giza Economic Court', 'اقتصادية', 'الجيزة', 'فيصل', 'مجمع محاكم جنوب الجيزة', 8, '5-10كم'),
  c('محكمة جنوب الجيزة للأسر', 'South Giza Family Court', 'أسر', 'الجيزة', 'فيصل', 'مجمع محاكم جنوب الجيزة', 8, '5-10كم'),
  c('محكمة كرداسة الجزئية', 'Kerdasa District Court', 'جزئية', 'الجيزة', 'كرداسة', 'شارع المحكمة — كرداسة', 12, '10-20كم', 30.0816, 31.1462),
  c('محكمة أوسيم الجزئية', 'Oseem District Court', 'جزئية', 'الجيزة', 'أوسيم', 'شارع المحكمة — أوسيم', 14, '10-20كم'),
  c('محكمة البدرشين الجزئية', 'Badrashein District Court', 'جزئية', 'الجيزة', 'البدرشين', 'شارع المحكمة — البدرشين', 18, '10-20كم'),
  c('محكمة الصف الجزئية', 'Saff District Court', 'جزئية', 'الجيزة', 'الصف', 'شارع المحكمة — الصف', 24, '20-40كم'),
  c('محكمة العياط الجزئية', 'Ayat District Court', 'جزئية', 'الجيزة', 'العياط', 'شارع المحكمة — العياط', 28, '20-40كم'),
  c('محكمة أبو النمرس الجزئية', 'Abu Nomros District Court', 'جزئية', 'الجيزة', 'أبو النمرس', 'شارع المحكمة', 20, '10-20كم'),
  c('محكمة منشأة القناطر الجزئية', 'Mansheyat El-Qanater District Court', 'جزئية', 'الجيزة', 'منشأة القناطر', 'شارع المحكمة', 22, '20-40كم'),

  // ── القاهرة: مجلس الدولة، القضاء العالي، النقض، الاستئناف (5–10كم) ──
  c('المحكمة الإدارية العليا — مجلس الدولة', 'Supreme Administrative Court — Council of State', 'إدارية عليا', 'القاهرة', 'وسط القاهرة', 'مبنى مجلس الدولة — شارع 26 يوليو، garden city', 6, '5-10كم', 30.0444, 31.2249),
  c('محكمة القضاء الإداري — مجلس الدولة (القاهرة)', 'Administrative Judicial Court — Cairo', 'قضاء إداري', 'القاهرة', 'وسط القاهرة', 'مبنى مجلس الدولة — ميدان التحرير', 5.5, '5-10كم', 30.0447, 31.2353),
  c('محكمة القضاء الإداري — مجلس الدولة (الجيزة)', 'Administrative Judicial Court — Giza', 'قضاء إداري', 'الجيزة', 'الجيزة', 'فرع مجلس الدولة — شارع الجيزة', 3.5, '0-5كم'),
  c('دار القضاء العالي', 'House of the Supreme Judiciary', 'مقر قضائي', 'القاهرة', 'وسط القاهرة', 'شارع 26 يوليو — Garden City', 6, '5-10كم', 30.0416, 31.2244),
  c('محكمة النقض', 'Court of Cassation', 'نقض', 'القاهرة', 'وسط القاهرة', 'مبنى محكمة النقض — 11 شارع رمسيس', 6.5, '5-10كم', 30.0527, 31.2337),
  c('المحكمة الدستورية العليا', 'Supreme Constitutional Court', 'دستورية عليا', 'القاهرة', 'وسط القاهرة', 'شارع محمد فريد — وسط البلد', 6, '5-10كم'),
  c('محكمة استئناف القاهرة', 'Cairo Court of Appeal', 'استئناف', 'القاهرة', 'وسط القاهرة', 'مبنى المحاكم — شارع رمسيس', 6.5, '5-10كم', 30.0552, 31.2335),
  c('محكمة استئناف الجيزة', 'Giza Court of Appeal', 'استئناف', 'الجيزة', 'الجيزة', 'مبنى استئناف الجيزة — شارع الجيزة', 3, '0-5كم'),
  c('محكمة شمال القاهرة الابتدائية', 'North Cairo Primary Court', 'ابتدائية', 'القاهرة', 'شبرا', 'مجمع محاكم شمال القاهرة — شارع شبرا', 8, '5-10كم', 30.0994, 31.2458),
  c('محكمة جنوب القاهرة الابتدائية', 'South Cairo Primary Court', 'ابتدائية', 'القاهرة', 'حلوان', 'مجمع محاكم جنوب القاهرة', 14, '10-20كم'),
  c('محكمة شمال القاهرة الاقتصادية', 'North Cairo Economic Court', 'اقتصادية', 'القاهرة', 'وسط القاهرة', 'مجمع المحاكم الاقتصادية — وسط القاهرة', 6, '5-10كم'),
  c('محكمة جنوب القاهرة الاقتصادية', 'South Cairo Economic Court', 'اقتصادية', 'القاهرة', 'حلوان', 'مجمع محاكم جنوب القاهرة', 14, '10-20كم'),

  // ── القاهرة: بقية المحاكم ──
  c('محكمة القاهرة الاقتصادية', 'Cairo Economic Court', 'اقتصادية', 'القاهرة', 'وسط القاهرة', 'مجمع المحاكم الاقتصادية — صلاح سالم', 7, '5-10كم'),
  c('محكمة عابدين الجزئية', 'Abedin District Court', 'جزئية', 'القاهرة', 'عابدين', 'شارع عابدين', 6.5, '5-10كم'),
  c('محكمة مدينة نصر الجزئية', 'Nasr City District Court', 'جزئية', 'القاهرة', 'مدينة نصر', 'شارع عباس العقاد', 10, '10-20كم'),
  c('محكمة حلوان الابتدائية', 'Helwan Primary Court', 'ابتدائية', 'القاهرة', 'حلوان', 'ميدان المحكمة — حلوان', 25, '20-40كم', 29.8441, 31.3346),
  c('محكمة حلوان الجزئية', 'Helwan District Court', 'جزئية', 'القاهرة', 'حلوان', 'ميدان المحكمة — حلوان', 25, '20-40كم'),
  c('محكمة حلوان للأسر', 'Helwan Family Court', 'أسر', 'القاهرة', 'حلوان', 'مجمع محاكم حلوان', 25, '20-40كم'),
  c('محكمة القاهرة الجديدة الابتدائية', 'New Cairo Primary Court', 'ابتدائية', 'القاهرة', 'القاهرة الجديدة', 'الحي الأول — التجمع الخامس', 32, '20-40كم', 30.0302, 31.4685),
  c('محكمة القاهرة الجديدة الجزئية', 'New Cairo District Court', 'جزئية', 'القاهرة', 'القاهرة الجديدة', 'التجمع الخامس', 32, '20-40كم'),
  c('محكمة القاهرة الجديدة الاقتصادية', 'New Cairo Economic Court', 'اقتصادية', 'القاهرة', 'القاهرة الجديدة', 'التجمع الخامس', 32, '20-40كم'),

  // ── القليوبية ──
  c('محكمة شمال بنها الابتدائية', 'North Banha Primary Court', 'ابتدائية', 'القليوبية', 'بنها', 'شارع الجيش — بنها', 48, '40-75كم', 30.4594, 31.1787),
  c('محكمة جنوب بنها الابتدائية', 'South Banha Primary Court', 'ابتدائية', 'القليوبية', 'بنها', 'شارع الجيش — بنها', 48, '40-75كم'),
  c('محكمة بنها الجزئية', 'Banha District Court', 'جزئية', 'القليوبية', 'بنها', 'شارع المحكمة — بنها', 48, '40-75كم'),
  c('محكمة شبرا الخيمة الابتدائية', 'Shubra El-Kheima Primary Court', 'ابتدائية', 'القليوبية', 'شبرا الخيمة', 'شارع المحكمة — شبرا الخيمة', 15, '10-20كم', 30.1286, 31.2422),
  c('محكمة شبرا الخيمة الجزئية', 'Shubra El-Kheima District Court', 'جزئية', 'القليوبية', 'شبرا الخيمة', 'شارع المحكمة', 15, '10-20كم'),
  c('محكمة قليوب الابتدائية', 'Qalyub Primary Court', 'ابتدائية', 'القليوبية', 'قليوب', 'شارع المحكمة — قليوب', 20, '10-20كم', 30.1754, 31.2067),
  c('محكمة قليوب الجزئية', 'Qalyub District Court', 'جزئية', 'القليوبية', 'قليوب', 'شارع المحكمة', 20, '10-20كم'),
  c('محكمة القناطر الخيرية الجزئية', 'Qanater El-Kheirya District Court', 'جزئية', 'القليوبية', 'القناطر الخيرية', 'شارع المحكمة', 25, '20-40كم'),

  // ── المنوفية ──
  c('محكمة شبين الكوم الابتدائية', 'Shibin El-Kom Primary Court', 'ابتدائية', 'المنوفية', 'شبين الكوم', 'شارع الجيش — شبين الكوم', 62, '40-75كم', 30.5565, 31.0093),
  c('محكمة شبين الكوم الجزئية', 'Shibin El-Kom District Court', 'جزئية', 'المنوفية', 'شبين الكوم', 'شارع المحكمة', 62, '40-75كم'),
  c('محكمة شبين الكوم الاقتصادية', 'Shibin El-Kom Economic Court', 'اقتصادية', 'المنوفية', 'شبين الكوم', 'مجمع محاكم شبين الكوم', 62, '40-75كم'),

  // ── الغربية ──
  c('محكمة غرب طنطا الابتدائية', 'West Tanta Primary Court', 'ابتدائية', 'الغربية', 'طنطا', 'شارع البحر — غرب طنطا', 85, '75-150كم', 30.7865, 30.9982),
  c('محكمة غرب طنطا الجزئية', 'West Tanta District Court', 'جزئية', 'الغربية', 'طنطا', 'شارع البحر', 85, '75-150كم'),
  c('محكمة شرق طنطا الابتدائية', 'East Tanta Primary Court', 'ابتدائية', 'الغربية', 'طنطا', 'شارع الجيش — شرق طنطا', 85, '75-150كم'),
  c('محكمة شرق طنطا الجزئية', 'East Tanta District Court', 'جزئية', 'الغربية', 'طنطا', 'شارع الجيش', 85, '75-150كم'),
  c('محكمة طنطا الاقتصادية', 'Tanta Economic Court', 'اقتصادية', 'الغربية', 'طنطا', 'مجمع المحاكم الاقتصادية — طنطا', 85, '75-150كم'),

  // ── كفر الشيخ ──
  c('محكمة كفر الشيخ الابتدائية', 'Kafr El-Sheikh Primary Court', 'ابتدائية', 'كفر الشيخ', 'كفر الشيخ', 'شارع الجيش — كفر الشيخ', 130, '75-150كم', 31.1107, 30.9388),
  c('محكمة كفر الشيخ الجزئية', 'Kafr El-Sheikh District Court', 'جزئية', 'كفر الشيخ', 'كفر الشيخ', 'شارع المحكمة', 130, '75-150كم'),
  c('محكمة كفر الشيخ للأسر', 'Kafr El-Sheikh Family Court', 'أسر', 'كفر الشيخ', 'كفر الشيخ', 'مجمع محاكم كفر الشيخ', 130, '75-150كم'),

  // ── دمياط ──
  c('محكمة دمياط الابتدائية', 'Damietta Primary Court', 'ابتدائية', 'دمياط', 'دمياط', 'شارع الجيش — دمياط', 200, '150-300كم', 31.4165, 31.8133),
  c('محكمة دمياط الجزئية', 'Damietta District Court', 'جزئية', 'دمياط', 'دمياط', 'شارع المحكمة', 200, '150-300كم'),
  c('محكمة دمياط للأسر', 'Damietta Family Court', 'أسر', 'دمياط', 'دمياط', 'مجمع محاكم دمياط', 200, '150-300كم'),

  // ── الدقهلية ──
  c('محكمة جنوب المنصورة الابتدائية', 'South Mansoura Primary Court', 'ابتدائية', 'الدقهلية', 'المنصورة', 'شارع الجمهورية — جنوب المنصورة', 120, '75-150كم', 31.0341, 31.3807),
  c('محكمة جنوب المنصورة الجزئية', 'South Mansoura District Court', 'جزئية', 'الدقهلية', 'المنصورة', 'شارع المحكمة', 120, '75-150كم'),
  c('محكمة شمال المنصورة الابتدائية', 'North Mansoura Primary Court', 'ابتدائية', 'الدقهلية', 'المنصورة', 'طريق شربين — شمال المنصورة', 120, '75-150كم'),
  c('محكمة شمال المنصورة الجزئية', 'North Mansoura District Court', 'جزئية', 'الدقهلية', 'المنصورة', 'شارع المحكمة', 120, '75-150كم'),
  c('محكمة المنصورة الاقتصادية', 'Mansoura Economic Court', 'اقتصادية', 'الدقهلية', 'المنصورة', 'مجمع المحاكم الاقتصادية — المنصورة', 120, '75-150كم'),

  // ── الشرقية ──
  c('محكمة جنوب الزقازيق الابتدائية', 'South Zagazig Primary Court', 'ابتدائية', 'الشرقية', 'الزقازيق', 'ميدان المحكمة — جنوب الزقازيق', 65, '40-75كم', 30.5877, 31.5020),
  c('محكمة جنوب الزقازيق الجزئية', 'South Zagazig District Court', 'جزئية', 'الشرقية', 'الزقازيق', 'شارع المحكمة', 65, '40-75كم'),
  c('محكمة شمال الزقازيق الابتدائية', 'North Zagazig Primary Court', 'ابتدائية', 'الشرقية', 'الزقازيق', 'طريق أبو حماد — شمال الزقازيق', 65, '40-75كم'),
  c('محكمة شمال الزقازيق الجزئية', 'North Zagazig District Court', 'جزئية', 'الشرقية', 'الزقازيق', 'شارع المحكمة', 65, '40-75كم'),

  // ── الإسكندرية ──
  c('محكمة شرق الإسكندرية الابتدائية', 'East Alexandria Primary Court', 'ابتدائية', 'الإسكندرية', 'شرق الإسكندرية', 'ميدان المحكمة — محرم بك', 220, '150-300كم', 31.2050, 29.9200),
  c('محكمة شرق الإسكندرية الجزئية', 'East Alexandria District Court', 'جزئية', 'الإسكندرية', 'شرق الإسكندرية', 'شارع المحكمة — محرم بك', 220, '150-300كم'),
  c('محكمة غرب الإسكندرية الابتدائية', 'West Alexandria Primary Court', 'ابتدائية', 'الإسكندرية', 'غرب الإسكندرية', 'ميدان المحكمة — العجمي', 225, '150-300كم'),
  c('محكمة غرب الإسكندرية الجزئية', 'West Alexandria District Court', 'جزئية', 'الإسكندرية', 'غرب الإسكندرية', 'شارع المحكمة', 225, '150-300كم'),
  c('محكمة الإسكندرية الاقتصادية', 'Alexandria Economic Court', 'اقتصادية', 'الإسكندرية', 'الإسكندرية', 'مجمع المحاكم الاقتصادية — سموحة', 218, '150-300كم'),
  c('محكمة شرق الإسكندرية للأسر', 'East Alexandria Family Court', 'أسر', 'الإسكندرية', 'شرق الإسكندرية', 'مجمع محاكم شرق الإسكندرية', 220, '150-300كم'),
  c('محكمة استئناف الإسكندرية', 'Alexandria Court of Appeal', 'استئناف', 'الإسكندرية', 'الإسكندرية', 'مبنى استئناف الإسكندرية — محطة الرمل', 215, '150-300كم', 31.2245, 29.9443),

  // ── البحيرة ──
  c('محكمة شمال دمنهور الابتدائية', 'North Damanhour Primary Court', 'ابتدائية', 'البحيرة', 'دمنهور', 'شارع الجيش — شمال دمنهور', 160, '150-300كم', 31.0409, 30.4695),
  c('محكمة شمال دمنهور الجزئية', 'North Damanhour District Court', 'جزئية', 'البحيرة', 'دمنهور', 'شارع المحكمة', 160, '150-300كم'),
  c('محكمة جنوب دمنهور الابتدائية', 'South Damanhour Primary Court', 'ابتدائية', 'البحيرة', 'دمنهور', 'طريق كفر الدوار — جنوب دمنهور', 160, '150-300كم'),
  c('محكمة جنوب دمنهور الجزئية', 'South Damanhour District Court', 'جزئية', 'البحيرة', 'دمنهور', 'شارع المحكمة', 160, '150-300كم'),

  // ── مطروح ──
  c('محكمة مرسى مطروح الابتدائية', 'Marsa Matrouh Primary Court', 'ابتدائية', 'مطروح', 'مرسى مطروح', 'شارع البحر — مرسى مطروح', 440, '300+كم', 31.3543, 27.2373),
  c('محكمة مرسى مطروح الجزئية', 'Marsa Matrouh District Court', 'جزئية', 'مطروح', 'مرسى مطروح', 'شارع المحكمة', 440, '300+كم'),

  // ── الإسماعيلية ──
  c('محكمة الإسماعيلية الابتدائية', 'Ismailia Primary Court', 'ابتدائية', 'الإسماعيلية', 'الإسماعيلية', 'شارع السلطة — الإسماعيلية', 140, '75-150كم', 30.5852, 32.2654),
  c('محكمة الإسماعيلية الجزئية', 'Ismailia District Court', 'جزئية', 'الإسماعيلية', 'الإسماعيلية', 'شارع المحكمة', 140, '75-150كم'),
  c('محكمة الإسماعيلية الاقتصادية', 'Ismailia Economic Court', 'اقتصادية', 'الإسماعيلية', 'الإسماعيلية', 'مجمع المحاكم الاقتصادية', 140, '75-150كم'),

  // ── بورسعيد ──
  c('محكمة بورسعيد الابتدائية', 'Port Said Primary Court', 'ابتدائية', 'بورسعيد', 'بورسعيد', 'شارع 23 يوليو — بورسعيد', 200, '150-300كم', 31.2653, 32.3019),
  c('محكمة بورسعيد الجزئية', 'Port Said District Court', 'جزئية', 'بورسعيد', 'بورسعيد', 'شارع المحكمة', 200, '150-300كم'),
  c('محكمة بورسعيد الاقتصادية', 'Port Said Economic Court', 'اقتصادية', 'بورسعيد', 'بورسعيد', 'مجمع المحاكم الاقتصادية', 200, '150-300كم'),

  // ── السويس ──
  c('محكمة السويس الابتدائية', 'Suez Primary Court', 'ابتدائية', 'السويس', 'السويس', 'شارع الجيش — السويس', 130, '75-150كم', 29.9668, 32.5498),
  c('محكمة السويس الجزئية', 'Suez District Court', 'جزئية', 'السويس', 'السويس', 'شارع المحكمة', 130, '75-150كم'),
  c('محكمة السويس للأسر', 'Suez Family Court', 'أسر', 'السويس', 'السويس', 'مجمع محاكم السويس', 130, '75-150كم'),

  // ── شمال سيناء ──
  c('محكمة العريش الابتدائية', 'Arish Primary Court', 'ابتدائية', 'شمال سيناء', 'العريش', 'شارع المحكمة — العريش', 330, '300+كم', 31.1249, 33.7984),
  c('محكمة العريش الجزئية', 'Arish District Court', 'جزئية', 'شمال سيناء', 'العريش', 'شارع المحكمة', 330, '300+كم'),

  // ── جنوب سيناء ──
  c('محكمة الطور الابتدائية', 'El-Tor Primary Court', 'ابتدائية', 'جنوب سيناء', 'الطور', 'شارع المحكمة — الطور', 320, '300+كم', 28.2416, 33.6179),
  c('محكمة الطور الجزئية', 'El-Tor District Court', 'جزئية', 'جنوب سيناء', 'الطور', 'شارع المحكمة', 320, '300+كم'),

  // ── بني سويف ──
  c('محكمة بني سويف الابتدائية', 'Beni Suef Primary Court', 'ابتدائية', 'بني سويف', 'بني سويف', 'كورنيش النيل — بني سويف', 115, '75-150كم', 29.0661, 31.0994),
  c('محكمة بني سويف الجزئية', 'Beni Suef District Court', 'جزئية', 'بني سويف', 'بني سويف', 'شارع المحكمة', 115, '75-150كم'),
  c('محكمة بني سويف الاقتصادية', 'Beni Suef Economic Court', 'اقتصادية', 'بني سويف', 'بني سويف', 'مجمع المحاكم الاقتصادية', 115, '75-150كم'),

  // ── الفيوم ──
  c('محكمة الفيوم الابتدائية', 'Fayoum Primary Court', 'ابتدائية', 'الفيوم', 'الفيوم', 'شارع الجيش — الفيوم', 100, '75-150كم', 29.3084, 30.8428),
  c('محكمة الفيوم الجزئية', 'Fayoum District Court', 'جزئية', 'الفيوم', 'الفيوم', 'شارع المحكمة', 100, '75-150كم'),
  c('محكمة الفيوم للأسر', 'Fayoum Family Court', 'أسر', 'الفيوم', 'الفيوم', 'مجمع محاكم الفيوم', 100, '75-150كم'),

  // ── المنيا ──
  c('محكمة المنيا الابتدائية', 'Minya Primary Court', 'ابتدائية', 'المنيا', 'المنيا', 'كورنيش النيل — المنيا', 245, '150-300كم', 28.1099, 30.7503),
  c('محكمة المنيا الجزئية', 'Minya District Court', 'جزئية', 'المنيا', 'المنيا', 'شارع المحكمة', 245, '150-300كم'),
  c('محكمة المنيا الاقتصادية', 'Minya Economic Court', 'اقتصادية', 'المنيا', 'المنيا', 'مجمع المحاكم الاقتصادية', 245, '150-300كم'),

  // ── أسيوط ──
  c('محكمة أسيوط الابتدائية', 'Assiut Primary Court', 'ابتدائية', 'أسيوط', 'أسيوط', 'كورنيش النيل — أسيوط', 370, '300+كم', 27.1783, 31.1859),
  c('محكمة أسيوط الجزئية', 'Assiut District Court', 'جزئية', 'أسيوط', 'أسيوط', 'شارع المحكمة', 370, '300+كم'),
  c('محكمة أسيوط الاقتصادية', 'Assiut Economic Court', 'اقتصادية', 'أسيوط', 'أسيوط', 'مجمع المحاكم الاقتصادية', 370, '300+كم'),

  // ── سوهاج ──
  c('محكمة سوهاج الابتدائية', 'Sohag Primary Court', 'ابتدائية', 'سوهاج', 'سوهاج', 'كورنيش النيل — سوهاج', 490, '300+كم', 26.5591, 31.6957),
  c('محكمة سوهاج الجزئية', 'Sohag District Court', 'جزئية', 'سوهاج', 'سوهاج', 'شارع المحكمة', 490, '300+كم'),
  c('محكمة سوهاج للأسر', 'Sohag Family Court', 'أسر', 'سوهاج', 'سوهاج', 'مجمع محاكم سوهاج', 490, '300+كم'),

  // ── قنا ──
  c('محكمة قنا الابتدائية', 'Qena Primary Court', 'ابتدائية', 'قنا', 'قنا', 'كورنيش النيل — قنا', 600, '300+كم', 26.1551, 32.7160),
  c('محكمة قنا الجزئية', 'Qena District Court', 'جزئية', 'قنا', 'قنا', 'شارع المحكمة', 600, '300+كم'),
  c('محكمة قنا الاقتصادية', 'Qena Economic Court', 'اقتصادية', 'قنا', 'قنا', 'مجمع المحاكم الاقتصادية', 600, '300+كم'),

  // ── الأقصر ──
  c('محكمة الأقصر الابتدائية', 'Luxor Primary Court', 'ابتدائية', 'الأقصر', 'الأقصر', 'كورنيش النيل — الأقصر', 670, '300+كم', 25.6872, 32.6396),
  c('محكمة الأقصر الجزئية', 'Luxor District Court', 'جزئية', 'الأقصر', 'الأقصر', 'شارع المحكمة', 670, '300+كم'),
  c('محكمة الأقصر الاقتصادية', 'Luxor Economic Court', 'اقتصادية', 'الأقصر', 'الأقصر', 'مجمع المحاكم الاقتصادية', 670, '300+كم'),

  // ── أسوان ──
  c('محكمة أسوان الابتدائية', 'Aswan Primary Court', 'ابتدائية', 'أسوان', 'أسوان', 'كورنيش النيل — أسوان', 900, '300+كم', 24.0889, 32.8998),
  c('محكمة أسوان الجزئية', 'Aswan District Court', 'جزئية', 'أسوان', 'أسوان', 'شارع المحكمة', 900, '300+كم'),
  c('محكمة أسوان الاقتصادية', 'Aswan Economic Court', 'اقتصادية', 'أسوان', 'أسوان', 'مجمع المحاكم الاقتصادية', 900, '300+كم'),

  // ── البحر الأحمر ──
  c('محكمة الغردقة الابتدائية', 'Hurghada Primary Court', 'ابتدائية', 'البحر الأحمر', 'الغردقة', 'شارع المطار — الغردقة', 450, '300+كم', 27.2579, 33.8116),
  c('محكمة الغردقة الجزئية', 'Hurghada District Court', 'جزئية', 'البحر الأحمر', 'الغردقة', 'شارع المحكمة', 450, '300+كم'),
];

/** ─────────────── غير المحاكم: ضرائب، عقاري، سجل تجاري … ─────────────── */
type PlaceSeed = CourtSeed & { type: LocationType; services: string[]; phone?: string; requiresPersonal?: boolean; hasOnlineService?: boolean };

const p = (name: string, nameEn: string, type: LocationType, subType: string, governorate: string, city: string, address: string, km: number, bucket: string, services: string[], extra: Partial<PlaceSeed> = {}): PlaceSeed =>
  ({ name, nameEn, type, subType, governorate, city, address, km, bucket, services, ...extra });

const PLACES: PlaceSeed[] = [
  p('مكتب ضرائب الدقي', 'Dokki Tax Office', LocationType.TAX_OFFICE, 'مصلحة الضرائب', 'الجيزة', 'الدقي', 'شارع مصطفى النحاس — الدقي', 1.5, '0-5كم', ['تقديم الإقرارات الضريبية', 'فصل الضريبي', 'الطعون الضريبية'], { phone: '02-3336xxxx', hasOnlineService: true }),
  p('الشهر العقاري — الدقي', 'Dokki Real Estate Registration', LocationType.REAL_ESTATE_REGISTRATION, 'شهر عقاري', 'الجيزة', 'الدقي', 'شارع النيل — الدقي', 1.8, '0-5كم', ['تقييد العقارات', 'الرسوم العقارية', 'صور رسمية للقيد'], { requiresPersonal: true }),
  p('السجل التجاري — الجيزة', 'Giza Commercial Registry', LocationType.COMMERCIAL_REGISTRY, 'سجل تجاري', 'الجيزة', 'الجيزة', 'مبنى مديرية الإدارة المحلية — شارع الجيزة', 3, '0-5كم', ['تأسيس الشركات', 'التعديلات التجارية', 'شهادة سجل تجاري'], { hasOnlineService: true }),
  p('نقابة المحامين — شمال الجيزة', 'North Giza Bar Association', LocationType.LAWYERS_SYNDICATE, 'نقابة', 'الجيزة', 'الدقي', 'شارع مصطفى النحاس — الدقي', 2, '0-5كم', ['تجديد التراخيص', 'بطاقة نقابية', 'شهادة حسن سيرة'], { phone: '02-3761xxxx' }),
  p('جهاز المساحة — مديرية الجيزة', 'Giza Survey Authority', LocationType.SURVEY_AUTHORITY, 'مساحة', 'الجيزة', 'الجيزة', 'مبنى جهاز المساحة — شارع الجيزة', 4, '0-5كم', ['رفع مساحي', 'المعاينات العقارية', 'أعمال التسوية'], { requiresPersonal: true }),
  p('مصلحة الجوازات والهجرة والجنسية — الجيزة', 'Giza Passports & Immigration', LocationType.PASSPORTS, 'جوازات', 'الجيزة', 'الجيزة', 'مبنى الجوازات — طريق النصر', 6, '5-10كم', ['إصدار جواز سفر', 'التجديد', 'فيزا الخروج'], { hasOnlineService: true }),
  p('إدارة مرور الجيزة', 'Giza Traffic Department', LocationType.TRAFFIC, 'مرور', 'الجيزة', 'الجيزة', 'مبنى المرور — شارع الجيزة', 3, '0-5كم', ['تجديد الرخص', 'خلاص المخالفات', 'نقل ملكية سيارة'], { hasOnlineService: true }),
  p('الهيئة القومية للتأمين الاجتماعي — الجيزة', 'Giza Social Insurance', LocationType.SOCIAL_INSURANCE, 'تأمينات', 'الجيزة', 'الجيزة', 'مبنى التأمينات — شارع بورسعيد', 3.5, '0-5كم', ['تأمينات العاملين', 'شهادة اشتراك', 'المعاشات']),
  p('مكتب العمل — الجيزة', 'Giza Labor Office', LocationType.LABOR_OFFICE, 'عمل', 'الجيزة', 'الجيزة', 'مبنى مديرية القوى العاملة', 4, '0-5كم', ['تسجيل عقود عمل', 'منازعات عمالية', 'تصاريح عمل']),
  p('جمارك الجيزة', 'Giza Customs', LocationType.CUSTOMS, 'جمارك', 'الجيزة', 'الجيزة', 'مبنى الجمارك — المنطقة الصناعية', 9, '5-10كم', ['تخليص جمركي', 'بيان جمركي', 'الطعون الجمركية']),
  p('الهيئة العامة للاستثمار — مكتب الجيزة', 'GAFI — Giza Office', LocationType.INVESTMENT_AGENCY, 'استثمار', 'الجيزة', 'الجيزة', 'مبنى الهيئة — الأهرام', 8, '5-10كم', ['تأسيس شركات المناطق الحرة', 'تذاكر استثمارية', 'الإعفاءات'], { hasOnlineService: true }),
  p('مكتب الخبراء — الجيزة', 'Giza Experts Office', LocationType.EXPERTS_OFFICE, 'خبراء', 'الجيزة', 'الجيزة', 'مبنى مكتب الخبراء — شارع الجيزة', 3, '0-5كم', ['إحالة خبرة', 'تسعير عقاري', 'خبرة فنية']),
  p('السجل المدني — الدقي', 'Dokki Civil Registry', LocationType.CIVIL_REGISTRY, 'سجل مدني', 'الجيزة', 'الدقي', 'مبنى الأحوال المدنية — الدقي', 2, '0-5كم', ['شهادة ميلاد', 'شهادة وفاة', 'قيد عائلي'], { hasOnlineService: true }),
  p('النيابة الكلية — شمال الجيزة', 'North Giza Prosecution', LocationType.PROSECUTION, 'نيابة', 'الجيزة', 'الجيزة', 'مجمع محاكم الجيزة', 2.5, '0-5كم', ['تحقيقات أولية', 'دعاوى جنائية', 'إنابة قضائية'], { requiresPersonal: true }),
  p('محافظة الجيزة — ديوان عام', 'Giza Governorate HQ', LocationType.GOVERNMENT_AGENCY, 'جهة حكومية', 'الجيزة', 'الجيزة', 'ميدان المحافظة — الجيزة', 3, '0-5كم', ['شكاوى المواطنين', 'خدمات الأراضي', 'المشروعات']),
];

function slugFor(name: string, nameEn: string, i: number): string {
  const base = nameEn
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
  return `${base}-${i}`.replace(/--+/g, '-');
}

function keywords(seed: CourtSeed & { type?: LocationType }): string[] {
  const en = seed.nameEn.toLowerCase();
  const sub = seed.subType ?? '';
  const kw = new Set<string>([en, seed.name, seed.city ?? '', seed.governorate]);
  for (const w of en.split(/[^a-z]+/).filter((x) => x.length > 2)) kw.add(w);
  if (sub.includes('ابتدائي')) kw.add('محكمة');
  if (seed.name.includes('محكمة')) { kw.add('court'); kw.add('محكمة'); }
  if (seed.name.includes('ضرائب')) { kw.add('tax'); kw.add('ضرائب'); }
  if (seed.name.includes('شهر عقاري') || seed.name.includes('الشهر العقاري')) { kw.add('real estate'); kw.add('شهر عقاري'); }
  if (seed.name.includes('سجل تجاري')) { kw.add('commercial registry'); kw.add('سجل تجاري'); }
  if (seed.name.includes('نقابة')) { kw.add('bar association'); kw.add('نقابة'); }
  if (seed.name.includes('مساحة')) { kw.add('survey'); kw.add('مساحة'); }
  if (seed.name.includes('جوازات')) { kw.add('passports'); kw.add('جوازات'); }
  if (seed.name.includes('استثمار')) { kw.add('investment'); kw.add('استثمار'); }
  return [...kw].filter(Boolean).slice(0, 14);
}

export const COURT_COUNT = COURTS.length;

export async function seedLocations() {
  if (COURTS.length !== 119) {
    throw new Error(`Expected exactly 119 courts, got ${COURTS.length}`);
  }
  console.log(`📍 Seeding ${COURTS.length} courts + ${PLACES.length} legal destinations…`);

  const all: Array<PlaceSeed & { type: LocationType }> = [
    ...COURTS.map((cr) => ({ ...cr, type: LocationType.COURT, services: ['جلسات المحاكمات', 'تقديم المذكرات', 'صور رسمية للحكم'] })),
    ...PLACES,
  ];

  // Idempotent: upsert on the unique slug. An earlier `count() > 0 → skip`
  // guard silently left the directory empty when demo/partial rows existed
  // (production shipped with ~12 demo places instead of 134). Upserting means
  // re-running the seed always converges to the full official directory while
  // leaving any unrelated rows (and their foreign keys) untouched.
  // Pre-load existing official slugs so we can report created vs updated
  // accurately (upsert itself does not say which branch ran).
  const existingRows = await prisma.location.findMany({ select: { slug: true } });
  const existingSlugs = new Set(existingRows.map((row) => row.slug));

  let created = 0;
  let updated = 0;
  let i = 0;
  for (const seed of all) {
    i += 1;
    const slug = slugFor(seed.name, seed.nameEn, i);
    const data = {
      name: seed.name,
      nameEn: seed.nameEn,
      type: seed.type,
      subType: seed.subType,
      governorate: seed.governorate,
      city: seed.city,
      district: seed.district ?? null,
      address: seed.address,
      phone: seed.phone ?? null,
      workingHours: HOURS,
      services: seed.services,
      jurisdiction: seed.jurisdiction ?? null,
      requiresPersonal: seed.requiresPersonal ?? false,
      hasOnlineService: seed.hasOnlineService ?? false,
      source: 'قاعدة معرفة المكتب — تحتاج مراجعة ميدانية',
      lastVerified: new Date(),
      confidence: seed.lat ? 'عالية' : 'تقديرية',
      lat: seed.lat ?? null,
      lng: seed.lng ?? null,
      distanceFromDokki: seed.km,
      distanceBucket: seed.bucket,
      searchKeywords: keywords(seed),
    };

    await prisma.location.upsert({
      where: { slug },
      create: { slug, ...data },
      update: data,
    });
    if (existingSlugs.has(slug)) updated += 1;
    else created += 1;
  }

  const total = await prisma.location.count();
  console.log(`✅ ${all.length} locations synced (${created} جديدة، ${updated} محدّثة) — إجمالي الأماكن في القاعدة: ${total} (${COURTS.length} محكمة رسمية).`);
}

/** Standalone run: npx tsx prisma/seed-locations.ts */
if (process.argv[1] && process.argv[1].includes('seed-locations')) {
  seedLocations()
    .then(() => process.exit(0))
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
