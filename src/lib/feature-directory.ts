export type FeatureAccess =
  | 'any'
  | 'lawyer'
  | 'staff'
  | 'senior'
  | 'officeManager'
  | 'finance'
  | 'permission:manageUsers'
  | 'permission:manageLawyers'
  | 'permission:manageLocations'
  | 'permission:writeTasks';

export type Feature = {
  id: string;
  title: string;
  description: string;
  href: string;
  keywords: string[];
  group: string;
  access: FeatureAccess;
};

/**
 * Central directory of navigable product areas. Detail routes that require a
 * real record ID are reached from their parent list/profile rather than using
 * fabricated IDs in a directory link.
 */
export const FEATURES: Feature[] = [
  { id: 'home', group: 'الأساسي', title: 'الرئيسية', description: 'الخلاصة العامة للمهام والجلسات ونشاط المكتب', href: '/', keywords: ['الصفحة الرئيسية', 'خلاصة', 'home', 'feed'], access: 'any' },
  { id: 'tasks', group: 'المهام والجلسات', title: 'التكليفات والمهام', description: 'عرض المهام والتكليفات ومتابعة تنفيذها', href: '/tasks', keywords: ['تاسك', 'تكليف', 'إسناد', 'مهمة', 'task', 'assign'], access: 'any' },
  { id: 'sessions', group: 'المهام والجلسات', title: 'الجلسات والمواعيد', description: 'عرض الجلسات القادمة والسابقة وفتح تفاصيل كل جلسة', href: '/sessions', keywords: ['جلسة', 'محكمة', 'وصول', 'مغادرة', 'session', 'hearing'], access: 'any' },
  { id: 'calendar', group: 'المهام والجلسات', title: 'التقويم', description: 'عرض الجلسات والمهام والمواعيد على التقويم', href: '/calendar', keywords: ['موعد', 'calendar', 'ميعاد'], access: 'any' },
  { id: 'my-day', group: 'المهام والجلسات', title: 'يومي', description: 'خطة اليوم والمهام والتذكيرات وتسجيل الحضور', href: '/my-day', keywords: ['تذكير', 'خطتي', 'حضور', 'انصراف'], access: 'any' },
  { id: 'court-mode', group: 'المهام والجلسات', title: 'وضع المحاكم', description: 'واجهة المحامي السريعة أثناء يوم المحاكم', href: '/court-mode', keywords: ['court', 'محكمة', 'جلسات اليوم'], access: 'lawyer' },
  { id: 'locations', group: 'الأماكن والأدلة', title: 'أماكن العمل والمحاكم', description: 'البحث في المحاكم والجهات وأماكن العمل وفروع المكتب', href: '/locations', keywords: ['محكمة', 'محاكم', 'جهة', 'نيابة', 'موقع', 'location', 'court'], access: 'any' },
  { id: 'lawyer-guide', group: 'الأماكن والأدلة', title: 'دليل المحامي', description: 'دليل المحاكم والجهات الحكومية ومعلوماتها وإجراءاتها', href: '/lawyer-guide', keywords: ['guide', 'الدليل القانوني', 'جهات حكومية'], access: 'any' },
  { id: 'directory', group: 'الأماكن والأدلة', title: 'دليل الخبراء والمترجمين', description: 'الوصول إلى دليل الخبراء والمترجمين وذاكرة الترجمة', href: '/directory', keywords: ['directory', 'خبير', 'خبرا', 'مترجم', 'ترجمة'], access: 'any' },
  { id: 'lawyers', group: 'الفريق', title: 'زملاء العمل', description: 'قائمة المحامين وفتح الملف الشخصي والمهام المرتبطة به', href: '/lawyers', keywords: ['محامي', 'محامون', 'lawyer', 'فريق', 'زملاء'], access: 'any' },
  { id: 'cases', group: 'القضايا والعملاء', title: 'القضايا', description: 'عرض القضايا حسب أقسامها وفتح ملف القضية', href: '/cases', keywords: ['قضية', 'ملف', 'case', 'دوسيه'], access: 'any' },
  { id: 'case-archive', group: 'القضايا والعملاء', title: 'أرشيف القضايا', description: 'عرض القضايا المؤرشفة وما يحتاج منها إلى متابعة', href: '/cases/archive', keywords: ['أرشيف', 'مؤرشفة', 'case archive'], access: 'any' },
  { id: 'archive', group: 'القضايا والعملاء', title: 'الأرشيف العام', description: 'عرض سجل العناصر المؤرشفة وإجراءات الاسترجاع المتاحة', href: '/archive', keywords: ['محذوفات', 'استرجاع', 'archive'], access: 'any' },
  { id: 'library', group: 'الأدوات والمراجع', title: 'مكتبة السوابق والأحكام والمذكرات', description: 'البحث في مكتبة المراجع والنماذج القانونية', href: '/library', keywords: ['مكتبة', 'نموذج', 'حكم', 'سابقة', 'playbook'], access: 'any' },
  { id: 'timesheets', group: 'الأدوات والمراجع', title: 'ساعات العمل', description: 'عرض وتسجيل ساعات العمل ومراجعتها بحسب صلاحيات الحساب', href: '/timesheets', keywords: ['ساعات', 'timesheet', 'وقت العمل'], access: 'any' },
  { id: 'compare', group: 'الأدوات والمراجع', title: 'مقارنة نصوص المستندات', description: 'مقارنة نسختين من النص وإظهار الاختلافات بينهما', href: '/tools/compare', keywords: ['مقارنة', 'diff', 'مستند', 'نص'], access: 'any' },
  { id: 'redact', group: 'الأدوات والمراجع', title: 'إخفاء البيانات الحساسة في الصور', description: 'تغطية البيانات الحساسة داخل الصور قبل مشاركتها', href: '/tools/redact', keywords: ['redact', 'تظليل', 'تغطية', 'إخفاء بيانات'], access: 'any' },
  { id: 'search', group: 'الأدوات والمراجع', title: 'البحث العام', description: 'البحث داخل محتوى الموقع', href: '/search', keywords: ['بحث', 'search', 'ابحث'], access: 'any' },
  { id: 'training', group: 'الأدوات والمراجع', title: 'التقديم للتدريب', description: 'إرسال طلب الالتحاق ببرنامج التدريب', href: '/training', keywords: ['تدريب', 'متدرب', 'training', 'طلب تدريب'], access: 'any' },
  { id: 'notifications', group: 'حسابي', title: 'الإشعارات والتذكيرات', description: 'متابعة الإشعارات والتذكيرات الشخصية', href: '/notifications', keywords: ['notification', 'تذكير', 'تنبيه'], access: 'any' },
  { id: 'profile', group: 'حسابي', title: 'ملفي الشخصي', description: 'عرض الملف الشخصي وبيانات الحساب', href: '/profile', keywords: ['profile', 'حسابي', 'بياناتي'], access: 'any' },
  { id: 'security', group: 'حسابي', title: 'أمان الحساب والأجهزة', description: 'مراجعة جلسات الدخول والأجهزة المسجلة', href: '/profile/security', keywords: ['security', 'كلمة السر', 'الأجهزة', 'جلسات الدخول'], access: 'any' },
  { id: 'admin-home', group: 'الإدارة', title: 'منطقة الإدارة', description: 'لوحة الإدارة وأدوات متابعة المكتب للإدارة العليا', href: '/admin', keywords: ['admin', 'إدارة', 'لوحة الإدارة'], access: 'senior' },
  { id: 'admin-clients', group: 'الإدارة', title: 'إدارة العملاء', description: 'عرض ملفات العملاء ومواعيدهم وإجراءات الإدارة المتاحة', href: '/admin/clients', keywords: ['عميل', 'عملاء', 'client', 'إضافة عميل'], access: 'officeManager' },
  { id: 'admin-lawyers', group: 'الإدارة', title: 'إدارة المحامين', description: 'إضافة محامٍ وتعديل بياناته ومراجعة أرشيف زملاء العمل', href: '/admin/lawyers', keywords: ['إضافة محامي', 'اضف محامي', 'lawyer', 'اعتماد محامي'], access: 'permission:manageLawyers' },
  { id: 'admin-lawyer-archive', group: 'الإدارة', title: 'أرشيف زملاء العمل السابقين', description: 'مراجعة المحامين غير النشطين واسترجاع الحسابات المتاحة', href: '/admin/lawyers/archive', keywords: ['محامي سابق', 'استرجاع محامي', 'أرشيف المحامين'], access: 'permission:manageLawyers' },
  { id: 'admin-lawyer-guide', group: 'الإدارة', title: 'إدارة دليل المحامي', description: 'إدارة تصنيفات الدليل والأماكن وطلبات التحقق', href: '/admin/lawyer-guide', keywords: ['إدارة الأماكن', 'تصنيفات', 'تحقق', 'دليل المحامي'], access: 'permission:manageLocations' },
  { id: 'admin-forms', group: 'الإدارة', title: 'منشئ النماذج', description: 'إنشاء وإدارة نماذج المكتب', href: '/admin/forms', keywords: ['forms', 'نموذج', 'استمارة'], access: 'staff' },
  { id: 'admin-archives', group: 'الإدارة', title: 'الأرشيف العام للإدارة', description: 'مراجعة أرشيف المحامين والعملاء والقضايا', href: '/admin/archives', keywords: ['أرشيف الإدارة', 'عميل سابق', 'قضية مغلقة'], access: 'finance' },
  { id: 'office', group: 'الإدارة', title: 'إدارة الفروع', description: 'اختيار الفرع وفتح لوحة إدارته', href: '/admin/office', keywords: ['فرع', 'الفروع', 'branch', 'مدير المكتب'], access: 'staff' },
  { id: 'office-control', group: 'الإدارة', title: 'أدوات الإدارة العامة', description: 'إدارة الصلاحيات والطلبات والفروع والملفات', href: '/admin/office/control', keywords: ['مركز التحكم', 'صلاحيات', 'control'], access: 'staff' },
  { id: 'office-live', group: 'الإدارة', title: 'شاشة المكتب الحية', description: 'متابعة حالة المحامين ومكان آخر تسجيل وصول والمهام المفتوحة اليوم', href: '/admin/office/live', keywords: ['شاشة', 'حالة المحامين', 'مكان المحامي', 'live', 'متابعة'], access: 'officeManager' },
  { id: 'operations', group: 'الإدارة', title: 'مركز العمليات الذكية', description: 'تنبيهات العمليات ومراجعة التغطية والمواعيد', href: '/admin/operations', keywords: ['operations', 'تنبيهات', 'العمليات'], access: 'officeManager' },
  { id: 'settings', group: 'الإدارة', title: 'إعدادات النظام', description: 'إعدادات هوية الموقع والمساعد الذكي', href: '/admin/settings', keywords: ['settings', 'إعدادات', 'المساعد الذكي'], access: 'permission:manageUsers' },
];
