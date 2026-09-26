-- Keep the three Loutfi Law Firm office branches fixed and available.
INSERT INTO "office_branches" ("id","code","name_ar","name_en","address","is_main")
VALUES
  ('branch_main','MAIN','المقر الرئيسي','Main Office','6 شارع السد العالي الدقي – الجيزة',true),
  ('branch_cairo','CAIRO','مكتب القاهرة','Cairo Office','1 شارع شريف باشا باب اللوق – القاهرة',false),
  ('branch_giza','GIZA','مكتب الجيزة','Giza Office','13 شارع نبيل الوقاد – الدقي – الجيزة',false)
ON CONFLICT ("id") DO UPDATE SET
  "code"=EXCLUDED."code",
  "name_ar"=EXCLUDED."name_ar",
  "name_en"=EXCLUDED."name_en",
  "address"=EXCLUDED."address",
  "is_main"=EXCLUDED."is_main",
  "active"=true,
  "updated_at"=NOW();
