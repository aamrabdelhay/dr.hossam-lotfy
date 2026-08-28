import { permanentRedirect } from 'next/navigation';

/**
 * Legacy alias.
 *
 * `main` briefly shipped an unlinked archive at `/case-archive`. The canonical
 * page now lives at `/cases/archive`, next to the rest of the case routes, and
 * adds the follow-up split (تحتاج متابعة / لها موعد قادم) plus search by client
 * name. Anything already pointing at the old URL is redirected rather than
 * broken.
 */
export default function LegacyCaseArchivePage(): never {
  permanentRedirect('/cases/archive');
}
