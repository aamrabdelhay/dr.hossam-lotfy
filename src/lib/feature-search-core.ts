export function normalizeAr(value: string): string {
  return value.toLowerCase()
    .replace(/[\u064B-\u065F\u0670\u0640]/g, '')
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/\s+/g, ' ')
    .trim();
}

export function matchFeature(
  feature: { title: string; description: string; keywords: string[] },
  query: string,
): boolean {
  const normalizedQuery = normalizeAr(query);
  if (!normalizedQuery) return true;
  const searchable = normalizeAr([feature.title, feature.description, ...feature.keywords].join(' '));
  return normalizedQuery.split(' ').every((word) => searchable.includes(word));
}
