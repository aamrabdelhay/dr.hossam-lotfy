import { MapPin, Navigation } from 'lucide-react';

const MAIN_OFFICE = '6 شارع السد العالي، الدقي، الجيزة، مصر';

export function mapsDirectionsHref(input: { name?: string | null; address?: string | null; lat?: number | null; lng?: number | null }): string {
  const destination = input.lat != null && input.lng != null
    ? String(input.lat) + ',' + String(input.lng)
    : [input.name, input.address].filter(Boolean).join('، ');
  return 'https://www.google.com/maps/dir/?api=1&destination=' + encodeURIComponent(destination || MAIN_OFFICE) + '&travelmode=driving';
}

export function DirectionsButton({
  name,
  address,
  lat,
  lng,
  label = 'GPS إلى المكان',
  returnToMainOffice = false,
}: {
  name?: string | null;
  address?: string | null;
  lat?: number | null;
  lng?: number | null;
  label?: string;
  returnToMainOffice?: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2" dir="rtl">
      <a href={mapsDirectionsHref({ name, address, lat, lng })} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-full border border-navy-200 bg-white px-3 py-2 text-[10px] font-extrabold text-navy-700 transition hover:border-gold-500 hover:text-gold-700">
        <Navigation size={13}/>{label}
      </a>
      {returnToMainOffice && (
        <a href={mapsDirectionsHref({ name: 'المقر الرئيسي لمكتب لطفي', address: MAIN_OFFICE })} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-full bg-navy-950 px-3 py-2 text-[10px] font-extrabold text-white transition hover:bg-navy-800">
          <MapPin size={13}/>العودة للمقر الرئيسي
        </a>
      )}
    </div>
  );
}
