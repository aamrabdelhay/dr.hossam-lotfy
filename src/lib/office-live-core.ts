export type LiveState = 'AT_PLACE' | 'IN_TRANSIT' | 'IN_OFFICE' | 'LEFT' | 'NOT_CHECKED_IN' | 'UNKNOWN';

export const LIVE_STATE_LABEL: Record<LiveState, string> = {
  AT_PLACE: 'في المحكمة / الجهة',
  IN_TRANSIT: 'في الطريق',
  IN_OFFICE: 'في المكتب',
  LEFT: 'انصرف',
  NOT_CHECKED_IN: 'لم يسجل حضور',
  UNKNOWN: 'غير محدد',
};

export type SessionTap = { taskId: string; kind: 'ARRIVE' | 'DEPART'; at: string };
export type LiveTask = { id: string; description: string; locationName: string; time: string | null; caseLabel: string | null };
export type StatusInput = {
  taps: SessionTap[];
  officeIn: string | null;
  officeOut: string | null;
  taskById: Record<string, LiveTask>;
  transitMinutes?: (fromTaskId: string, toTaskId?: string) => number | null;
};
export type LiveStatus = {
  state: LiveState;
  label: string;
  placeName: string | null;
  activity: string | null;
  since: string | null;
  transitMinutes: number | null;
};
export type OfficeLiveRow = {
  lawyerId: string;
  name: string;
  position: string | null;
  status: LiveStatus;
  tasks: LiveTask[];
  moreTasks: number;
};
export type OfficeLivePayload = { generatedAt: string; day: string; rows: OfficeLiveRow[] };

export function computeLawyerStatus(input: StatusInput): LiveStatus {
  const taps = [...input.taps].sort((a, b) => a.at.localeCompare(b.at));
  const last = taps[taps.length - 1];
  const make = (state: LiveState, extra: Partial<LiveStatus> = {}): LiveStatus => ({
    state, label: LIVE_STATE_LABEL[state], placeName: null, activity: null, since: null, transitMinutes: null, ...extra,
  });
  if (last) {
    const task = input.taskById[last.taskId];
    if (!task) return make('UNKNOWN', { since: last.at });
    if (last.kind === 'ARRIVE') {
      return make('AT_PLACE', { placeName: task.locationName || null, activity: task.description || null, since: last.at });
    }
    return make('IN_TRANSIT', {
      placeName: task.locationName ? 'خرج من ' + task.locationName : null,
      since: last.at,
      transitMinutes: input.transitMinutes ? input.transitMinutes(last.taskId) : null,
    });
  }
  if (input.officeOut) return make('LEFT', { since: input.officeOut });
  if (input.officeIn) return make('IN_OFFICE', { since: input.officeIn });
  return make('NOT_CHECKED_IN');
}
