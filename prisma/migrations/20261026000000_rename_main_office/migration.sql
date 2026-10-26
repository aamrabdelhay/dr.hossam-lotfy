-- Rename the main office display name without changing its stable identifier.
UPDATE "office_branches"
SET "name_ar" = 'المقر الرئيس',
    "name_en" = 'Main Office',
    "updated_at" = NOW()
WHERE "id" = 'branch_main';
