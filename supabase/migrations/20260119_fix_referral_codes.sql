-- Generate unique referral_code for affiliates with NULL referral_code
update public.affiliates
set referral_code = upper('CM' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 8))
where referral_code is null;

-- Optional: add unique index if not exists
do $$
begin
  if not exists (
    select 1 from pg_indexes
    where schemaname = 'public'
      and tablename = 'affiliates'
      and indexname = 'affiliates_referral_code_key'
  ) then
    create unique index affiliates_referral_code_key on public.affiliates (referral_code);
  end if;
end$$;

