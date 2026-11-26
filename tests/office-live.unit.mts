import { computeLawyerStatus } from '../src/lib/office-live-core.ts';

let fail = 0;
const eq = (actual: unknown, expected: unknown, label: string) => {
  const ok = actual === expected;
  console.log((ok ? 'PASS ' : 'FAIL ') + label + (ok ? '' : ` (got ${String(actual)}, want ${String(expected)})`));
  if (!ok) fail++;
};
const taskById = {
  taskA: { id: 'taskA', description: 'جلسة مدنية', locationName: 'محكمة شمال الجيزة', time: '09:00', caseLabel: null },
  taskB: { id: 'taskB', description: 'استخراج شهادة', locationName: 'الشهر العقاري', time: '11:00', caseLabel: null },
};
const tap = (taskId: string, kind: 'ARRIVE' | 'DEPART', at: string) => ({ taskId, kind, at });

eq(computeLawyerStatus({ taps: [], officeIn: null, officeOut: null, taskById }).state, 'NOT_CHECKED_IN', 'no records means not checked in');
eq(computeLawyerStatus({ taps: [], officeIn: '2026-11-26T06:30:00.000Z', officeOut: null, taskById }).state, 'IN_OFFICE', 'office check-in without check-out');
eq(computeLawyerStatus({ taps: [], officeIn: '2026-11-26T06:30:00.000Z', officeOut: '2026-11-26T14:00:00.000Z', taskById }).state, 'LEFT', 'office check-in and check-out');
const arrived = computeLawyerStatus({ taps: [tap('taskA', 'ARRIVE', '2026-11-26T07:00:00.000Z')], officeIn: null, officeOut: null, taskById });
eq(arrived.state, 'AT_PLACE', 'last ARRIVE means at court or agency');
eq(arrived.placeName, 'محكمة شمال الجيزة', 'ARRIVE status uses the task location');
eq(computeLawyerStatus({
  taps: [tap('taskA', 'ARRIVE', '2026-11-26T07:00:00.000Z'), tap('taskA', 'DEPART', '2026-11-26T08:00:00.000Z')],
  officeIn: null, officeOut: null, taskById,
}).state, 'IN_TRANSIT', 'ARRIVE then DEPART means in transit');
eq(computeLawyerStatus({
  taps: [
    tap('taskA', 'ARRIVE', '2026-11-26T07:00:00.000Z'),
    tap('taskA', 'DEPART', '2026-11-26T08:00:00.000Z'),
    tap('taskB', 'ARRIVE', '2026-11-26T09:00:00.000Z'),
  ],
  officeIn: null, officeOut: null, taskById,
}).state, 'AT_PLACE', 'a later ARRIVE overrides the previous DEPART');
eq(computeLawyerStatus({
  taps: [tap('taskA', 'ARRIVE', '2026-11-26T07:00:00.000Z')],
  officeIn: '2026-11-26T06:30:00.000Z', officeOut: null, taskById,
}).state, 'AT_PLACE', 'ARRIVE has priority over office attendance');
eq(computeLawyerStatus({
  taps: [tap('missing-task', 'ARRIVE', '2026-11-26T07:00:00.000Z')],
  officeIn: '2026-11-26T06:30:00.000Z', officeOut: null, taskById,
}).state, 'UNKNOWN', 'unknown task details never produce a guessed location');

process.exit(fail ? 1 : 0);
