// Preset session outcomes (item 101). Plain choices only: none states a legal conclusion or a deadline.
export const OUTCOMES: Record<string, string> = {
  ADJOURNED: 'تأجيل الجلسة', ADJOURNED_FOR_DOCS: 'تأجيل لتقديم مستندات', ADJOURNED_FOR_NOTICE: 'تأجيل للإعلان',
  EVIDENCE_PHASE: 'إحالة للإثبات', EXPERT_REFERRED: 'إحالة لخبير', RESERVED_FOR_JUDGMENT: 'حجز للحكم',
  JUDGMENT_ISSUED: 'صدر حكم', STRUCK_OFF: 'شطب', ATTENDED_NO_ACTION: 'حضور بدون إجراء',
};
