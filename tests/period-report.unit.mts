import assert from 'node:assert/strict';
import { monthsBetween, withDeltas } from '../src/lib/period-report-core.ts';
assert.deepEqual(monthsBetween('2029-11', '2030-02'), ['2029-11', '2029-12', '2030-01', '2030-02']);
assert.throws(() => monthsBetween('2030-02', '2030-01')); assert.throws(() => monthsBetween('2030-1', '2030-02')); assert.throws(() => monthsBetween('2020-01', '2030-01'));
const c = (month: string, branch: string, done: number, files: number) => ({ month, branch, tasksCreated: 0, tasksCompleted: done, filesUploaded: files, invoiced: null, received: null });
const d = withDeltas([c('2030-02', 'a', 7, 1), c('2030-01', 'a', 5, 4), c('2030-01', 'b', 2, 2)]);
assert.equal(d.find((x) => x.month === '2030-02' && x.branch === 'a')!.tasksCompletedDelta, 2); assert.equal(d.find((x) => x.month === '2030-02')!.filesUploadedDelta, -3);
assert.equal(d.find((x) => x.branch === 'b')!.tasksCompletedDelta, null);
console.log('period-report unit OK');
