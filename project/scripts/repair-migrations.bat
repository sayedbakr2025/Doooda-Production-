@echo off
echo Repairing Supabase migration history...

echo === Marking remote-only migrations as reverted ===
call npx supabase migration repair --status reverted 20260209194123
call npx supabase migration repair --status reverted 20260209221101
call npx supabase migration repair --status reverted 20260218005813

echo === Marking local migrations as applied ===
call npx supabase migration repair --status applied 20260107191832
call npx supabase migration repair --status applied 20260107191851
call npx supabase migration repair --status applied 20260107191911
call npx supabase migration repair --status applied 20260107191927
call npx supabase migration repair --status applied 20260107191941
call npx supabase migration repair --status applied 20260107191957
call npx supabase migration repair --status applied 20260107192018
call npx supabase migration repair --status applied 20260107192044
call npx supabase migration repair --status applied 20260107193651
call npx supabase migration repair --status applied 20260107193721
call npx supabase migration repair --status applied 20260107194823
call npx supabase migration repair --status applied 20260107194855
call npx supabase migration repair --status applied 20260107194920
call npx supabase migration repair --status applied 20260107200002
call npx supabase migration repair --status applied 20260107200039
call npx supabase migration repair --status applied 20260107200059
call npx supabase migration repair --status applied 20260107200954
call npx supabase migration repair --status applied 20260107201021
call npx supabase migration repair --status applied 20260107210648
call npx supabase migration repair --status applied 20260107211104
call npx supabase migration repair --status applied 20260107211132
call npx supabase migration repair --status applied 20260107211149
call npx supabase migration repair --status applied 20260107211204
call npx supabase migration repair --status applied 20260107212102
call npx supabase migration repair --status applied 20260107212524
call npx supabase migration repair --status applied 20260107213017
call npx supabase migration repair --status applied 20260107214737
call npx supabase migration repair --status applied 20260130114604
call npx supabase migration repair --status applied 20260130115834
call npx supabase migration repair --status applied 20260130131218
call npx supabase migration repair --status applied 20260205190525
call npx supabase migration repair --status applied 20260205195621
call npx supabase migration repair --status applied 20260205202129
call npx supabase migration repair --status applied 20260206185554
call npx supabase migration repair --status applied 20260206191013
call npx supabase migration repair --status applied 20260206191740
call npx supabase migration repair --status applied 20260206200247
call npx supabase migration repair --status applied 20260207192556
call npx supabase migration repair --status applied 20260207193138
call npx supabase migration repair --status applied 20260207193156
call npx supabase migration repair --status applied 20260207200716
call npx supabase migration repair --status applied 20260207202735
call npx supabase migration repair --status applied 20260207202757
call npx supabase migration repair --status applied 20260207203851
call npx supabase migration repair --status applied 20260207204626
call npx supabase migration repair --status applied 20260423

echo.
echo Done! Now run: npx supabase db push
pause
