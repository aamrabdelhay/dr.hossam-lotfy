# Part 2 ledger: items that need an outside provider or a legal source

Status words: NOT IMPLEMENTED (no code), GATED (code path exists but returns "provider not configured" until a provider is chosen and configured). Nothing here is marked done.

| # | Item | Status | What is missing | Rule when built |
|---|------|--------|-----------------|-----------------|
| 110 | Court roll photo + OCR | NOT IMPLEMENTED | OCR provider, storage of the photo, consent for sending images to a provider | Output is a draft for human review, never saved as sessions automatically. Case and ethical-wall permissions apply to the photo and the result. Audit entry per run. |
| 111 | Voice notes after a session | NOT IMPLEMENTED | Browser recording or upload flow, speech-to-text provider | Audio is a case file under the same walls. Transcript is a draft, shown with a "not reviewed" label. |
| 112 | Voice to structured data | NOT IMPLEMENTED | Depends on 111 | Result is a suggestion form; a person confirms before anything is written. |
| 113 | Appeal / limitation / deadline calculator | NOT IMPLEMENTED | A verified, dated source of Egyptian legal periods owned by a lawyer | No built-in periods. No computed deadline is shown without a lawyer-entered rule and its source reference. Every result says it must be checked by the responsible lawyer. |
| 114 | Deadline and procedure map | NOT IMPLEMENTED | Same source as 113 | Same rule. |
| 139-141 | Citation checker, statute comparison over time, outdated reference alert | NOT IMPLEMENTED | A legal corpus with versions and dates, and a provider or index | The text says "legal source not configured" until a corpus exists. No invented citations. |
| 145-148 | Knowledge graph, AI contract review, document generator, contradiction finder | NOT IMPLEMENTED | AI provider, corpus, review workflow | AI output is always a draft with "provider not configured" when absent; it never decides, sends or files. Permissions, ethical walls and audit are kept. |

103 (/court-mode) was only confirmed to exist. 104 stores minutes entered by hand; there is no map or traffic service.
No real client or case data was used to test any of this.
