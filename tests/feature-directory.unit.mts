import { readdirSync, readFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { FEATURES } from '../src/lib/feature-directory.ts';
import { filterFeaturesByAccess } from '../src/lib/feature-access-core.ts';
import { matchFeature, normalizeAr } from '../src/lib/feature-search-core.ts';

let fail = 0;
const check = (condition: boolean, label: string) => {
  console.log((condition ? 'PASS ' : 'FAIL ') + label);
  if (!condition) fail++;
};
check(normalizeAr('إضافة') === normalizeAr('اضافه'), 'Arabic normalization unifies alif and taa marbuta');
const lawyerFeature = FEATURES.find((feature) => feature.id === 'admin-lawyers')!;
const locationsFeature = FEATURES.find((feature) => feature.id === 'locations')!;
check(matchFeature(lawyerFeature, 'اضافة محامي'), 'search finds lawyer administration by Arabic keywords');
check(matchFeature(locationsFeature, 'محكمة'), 'search finds locations by court keyword');
check(!matchFeature(locationsFeature, 'كلمة عشوائية لا توجد'), 'unrelated terms do not match');

const ids = FEATURES.map((feature) => feature.id);
check(new Set(ids).size === ids.length, 'feature ids are unique');
check(FEATURES.every((feature) => !(feature.access === 'any' && feature.href.startsWith('/admin/'))), 'no admin URL has unrestricted access');

const regularLawyer = {
  isLawyer: true, isStaff: false, isSenior: false, isOfficeManager: false, isFinance: false,
  permissions: { manageUsers: false, manageLawyers: false, manageLocations: false, writeTasks: false },
};
const visibleForLawyer = filterFeaturesByAccess(FEATURES, regularLawyer);
check(visibleForLawyer.every((feature) => !feature.group.includes('الإدارة')), 'ordinary lawyer is not given administration directory entries');
check(visibleForLawyer.some((feature) => feature.id === 'tasks'), 'ordinary lawyer retains unrestricted day-to-day features');

function collectPages(directory: string): string[] {
  const paths: string[] = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const absolute = join(directory, entry.name);
    if (entry.isDirectory()) paths.push(...collectPages(absolute));
    else if (entry.isFile() && entry.name === 'page.tsx') paths.push(absolute);
  }
  return paths;
}
function routePattern(file: string): RegExp {
  const appRoot = join(process.cwd(), 'src', 'app');
  const directory = relative(appRoot, file).split(sep).slice(0, -1);
  const segments = directory.filter((segment) => !(segment.startsWith('(') && segment.endsWith(')')));
  const pattern = segments.map((segment) => {
    if (/^\[\.\.\.[^\]]+\]$/.test(segment)) return '.+';
    if (/^\[\[\.\.\.[^\]]+\]\]$/.test(segment)) return '.*';
    if (/^\[[^\]]+\]$/.test(segment)) return '[^/]+';
    return segment.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }).join('/');
  return new RegExp('^/' + pattern + '/?$');
}
const pageFiles = collectPages(join(process.cwd(), 'src', 'app'));
const routePatterns = pageFiles.map(routePattern);
for (const feature of FEATURES) {
  const pathname = new URL(feature.href, 'https://internal.invalid').pathname;
  check(routePatterns.some((pattern) => pattern.test(pathname)), `directory route exists: ${feature.href}`);
}

// Guard against accidentally turning the directory itself into a route containing unsafe content.
const source = readFileSync(join(process.cwd(), 'src', 'lib', 'feature-directory.ts'), 'utf8');
check(source.includes("access: 'officeManager'"), 'management-only features are explicitly permission-scoped');

process.exit(fail ? 1 : 0);
