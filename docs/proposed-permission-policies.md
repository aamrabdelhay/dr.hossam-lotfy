# Proposed access rules (NOT user-approved; review before activation)

These mappings were chosen while building, from the existing code rules. None comes from a recorded user decision. Each is tested locally and can change after review.

| Feature | Proposed rule | Basis | Open question |
|---|---|---|---|
| Office log (177, 178, 183, 188) | Senior management: all branches. Branch office manager: own branches only. Everyone else refused. No delete. | Same people as the operations page | Should finance managers or senior lawyers read it? Should visitors be visible to reception staff? |
| Conflict check (129) | Senior management only | The answer lists walled cases, so a partial answer would reveal them | Who else may run it? |
| Deadline rules (113) | Senior adds rules (a legal source is required). Anyone with case edit rights saves a deadline from a rule. | Existing case edit right | Who is the "responsible lawyer" who must check each date? |
| Session pack (99) | Assigned lawyer and admin only. Senior lawyers and branch managers get 403. | Strictest reading | Should senior lawyers and branch managers open packs of cases they may see? |
| Hearing exports (109) | The caller's own sessions; staff may pass a lawyer id. Walled and confidential cases are hidden by the same rule as feeds. | Existing feed rule | None |
| Court bundle (124) | Same wall as opening one case file; edit right not required | Existing file access | Should bundling need edit rights? |
| Chronology / passport (125, 126) | Same wall as the case files | Existing file access | None |
| Attendance (102) | Assigned lawyer only, manual tap, no location | Item text | Should managers see attendance? |
| Directory (185) | Any signed-in user reads; senior and office managers add or deactivate; no delete | Mirrors the office log writers | Should lawyers suggest entries? |
| Case notebook (136) | Same as other case register entries: case edit right to write, case wall to read | Existing register rule | Should some notes be private to the author? |
| Inventory (182) | Same people and branch limits as the office log; stock changes are append-only movements | Mirrors the office log | Who approves large stock changes? |
- Items 127/128/135 (case parties, case links, repeat-opponent list): parties and links follow the case wall and edit right of the case; the repeat-opponent list is senior management only. PROPOSED, not user-approved.
- Items 150/152 (document type, tags, version chain on case files): follow the case wall and edit right; old versions are kept. The upload POST path with versionOf needs real S3 and is NOT exercised by the test (PATCH path is). PROPOSED, not user-approved.
- Items 166/167/168/169/171/189 office analytics (workload, stale cases, health, branch comparison, load simulation): senior management only, counts only. Capacity number is chosen by management per request. PROPOSED, not user-approved.
- Items 179/186/172: delegation calendar, hand-over and absence records reuse the office log (senior and branch office manager scope); the coverage checklist (/api/admin/coverage) is senior only, read only, API-only (no UI yet). PROPOSED, not user-approved.
- Item 187 (staff check-in/out): a lawyer taps for themselves only, no location, no lateness rule (the office policy was not supplied); senior management reads all. Admin-only accounts cannot tap (gap). PROPOSED, not user-approved.
- Item 155 (watermark on the court bundle, optional text up to 40 characters): follows the bundle's case wall. Item 154 (redaction) is a browser-side tool for images and PDFs: it works on a file the user selects, writes a NEW flattened file, never touches the original, and the result must be uploaded through the normal case upload. PROPOSED: any signed-in user may use the tool (no data leaves the browser).
- Items 159/158/162/163/160: obligations are a register kind; document review: case editors send to review, only senior management approves or rejects (audited); translation memory: everyone reads, senior and office managers write, people-entered, no machine translation; hand-over checklist: senior only, read only; print center jobs are office-log kind PRINT. PROPOSED, not user-approved.
- Items 144/142: library: staff and lawyers read, lawyers add (source reference required), senior deactivates; playbooks: senior writes, lawyers read and apply to a case they can edit (creates checklist items). PROPOSED, not user-approved.

- Item 149 (text compare): browser-only, no storage, any signed-in user. PROPOSED.
- Items 172/163 panel on the operations page: senior management only (same as the APIs), read only. PROPOSED.
- Items 190/193-199/201-204 (case finance ledger): readable and writable only by finance management (the EXISTING rule: senior management, branch finance manager, or an office finance member), behind the case wall. Entries are never deleted; a wrong one is cancelled. Trust withdrawals cannot exceed the case trust balance (checked under a lock). Accepted quotes become fee agreements. Records only: no payment is taken and nothing is sent to a client. PROPOSED, pending user review: whether branch finance managers see only their branch (the wall and branch rules of the case apply today).
- Items 205/208/210 workflow rules: senior management only sets rules (fixed catalog: installment overdue, budget near, budget exceeded, task overdue, review pending). Nothing is enabled by default. Recipients: senior management (plus finance members for finance rules). Cases under an ethical wall or CONFIDENTIAL classification are skipped so a notification never names a case a recipient cannot open. Not scheduled until /api/cron/workflow is added to the deploy cron list. PROPOSED, pending review.
- Item 226 camera capture: any user who may upload to the case; the image is enhanced in the browser and goes through the normal upload. PROPOSED.
- Items 212/213 period report: senior management only; finance columns only for finance management; counts only; walled/confidential cases excluded. PROPOSED.

## Part 4 additions (all PROPOSED, pending user review, not established rules)
- Case finance (190-204): finance management (existing isFinanceManagement) behind the case wall. Branch finance managers seeing only their branch is proposed.
- Period report (212/213): senior management only; finance columns need finance management too.
- Dashboard (211): senior management only; walled and confidential cases are excluded from counts.
- Client journey (216): senior management only.
- Workflow rules (205/208/210): senior management configures; nothing is enabled by default.
- File completeness (215) and client PDF (214): same case wall as opening the case. The client PDF is generated only, never sent.
- Location proof (227): the lawyer attaches it for their own attendance, with consent each time. Read: the lawyer for own rows, senior management for all. Retention is NOT decided; no automatic deletion exists.
