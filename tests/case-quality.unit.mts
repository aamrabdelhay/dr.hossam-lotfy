import assert from 'node:assert/strict';
import { scoreCase } from '../src/lib/case-quality-core.ts';
const empty = scoreCase({ hasClient: false, parties: 0, files: 0, hasDeadline: false, hasChronology: false, hasUpcomingTask: false, staleReviewFiles: 0, hasPowerOfAttorney: false });
assert.equal(empty.score, 1); assert.equal(empty.missing.length, 7); // only REVIEW passes on an empty case
const full = scoreCase({ hasClient: true, parties: 2, files: 3, hasDeadline: true, hasChronology: true, hasUpcomingTask: true, staleReviewFiles: 0, hasPowerOfAttorney: true });
assert.equal(full.score, 8); assert.equal(full.missing.length, 0);
assert.ok(scoreCase({ ...{ hasClient: true, parties: 1, files: 1, hasDeadline: true, hasChronology: true, hasUpcomingTask: true, hasPowerOfAttorney: true }, staleReviewFiles: 2 }).missing.some((m) => m.key === 'REVIEW'));
console.log('case-quality unit OK');
