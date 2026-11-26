# Part 3 status ledger (separate from any audit)

Evidence scope: local only. Branch internal-clean. Embedded PostgreSQL 18, synthetic data, no push, no deploy, no real S3, no AI/OCR/STT provider. Full e2e: 34 files pass (batches of 5). Unit tests pass where listed in tests/.

## Implemented and tested (API + e2e; UI verified in headless Chrome where noted)
125/126 chronology (UI), 127/128/135 parties/links/repeat opponents (UI), 129 conflict check, 136 notebook (UI), 144 library (UI), 142 playbooks (UI, apply to case), 149 text compare (UI, unit), 150/152 document type, tags, versions (UI labels), 154 redaction images and PDFs (UI, exported files byte-checked; PDF output is image-only), 155 bundle watermark (visual check of PDF; input typed in UI), 158 review/approval (UI buttons in the files panel, browser-verified; senior approves), 159 obligations (register kind), 160 print (log kind, UI), 161/184 log kinds (UI), 162 translation memory (UI), 163 handover checklist (UI panel), 166-169/171/189 analytics (UI), 172 coverage (UI panel), 177/178/183/188 office log (UI), 179/186/172 delegation/handover/absence kinds (UI), 182 inventory (UI), 185 directory (UI), 102 court arrival/departure taps on the session page (UI-verified earlier, screenshot ui-groupC-run-A, lawyer login), 187 office staff check-in/out (API tested; the my-day tap is shown only to the lawyer role and was NOT UI-verified; this is a different feature from 102), 111 voice buttons (UI error path only, microphone denied in headless; storage tested only on a synthetic fixture).

## Genuinely blocked (concrete dependency)
138-141, 143 AI part, 145-148, 165: need an AI provider or a corpus. 164 semantic search: needs an embedding provider (keyword search exists, item 71). 112 and 110 photo path: need speech-to-text and OCR providers. 153 automatic extraction: needs a provider. 156 link for a real file and voice/bundle/upload-POST on real storage: need real S3.

## Still to build or review
UI-verify the my-day office check-in/out tap (item 187) with a lawyer session. Item 102 is separate and was verified. Real-DB (Neon), deploy, real S3 and reverse migration-order checks are untested.

## Access rules
All newly chosen access mappings are PROPOSED, pending user review: docs/proposed-permission-policies.md.
