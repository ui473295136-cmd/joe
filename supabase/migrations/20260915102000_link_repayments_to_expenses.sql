alter table public.repayments
  add column if not exists expense_id uuid references public.expenses(id) on delete cascade;

create or replace function public.cw_extract_expense_marker()
returns trigger
language plpgsql
as $$
declare
  m text[];
  exp_payer text;
  exp_parts text[];
begin
  m := regexp_match(coalesce(new.note, ''), '\[\[cw-expense:([0-9a-fA-F-]{36})\]\]');
  if m is not null then
    new.expense_id := m[1]::uuid;
    new.note := btrim(regexp_replace(coalesce(new.note, ''), '\s*\[\[cw-expense:[0-9a-fA-F-]{36}\]\]\s*', ' ', 'g'));

    select payer, participants
      into exp_payer, exp_parts
      from public.expenses
     where id = new.expense_id
       and trip_slug = new.trip_slug;

    if exp_payer is null then
      raise exception 'linked expense not found';
    end if;
    if new.to_person <> exp_payer then
      raise exception 'settlement recipient must be the expense payer';
    end if;
    if not (new.from_person = any(exp_parts)) or new.from_person = exp_payer then
      raise exception 'settlement payer must be a non-payer participant';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists repayments_extract_expense_marker on public.repayments;
create trigger repayments_extract_expense_marker
before insert or update of note on public.repayments
for each row execute function public.cw_extract_expense_marker();

update public.repayments r
   set expense_id = e.id
  from public.expenses e
 where r.trip_slug = e.trip_slug
   and r.expense_id is null
   and e.category = '机票'
   and e.payer = r.to_person
   and r.note like '%机票%已结清%'
   and r.from_person = any(e.participants)
   and abs(r.amount::numeric - round(e.amount::numeric / cardinality(e.participants), 2)) <= 0.01;

create unique index if not exists repayments_expense_share_unique
  on public.repayments (trip_slug, expense_id, from_person, to_person)
  where expense_id is not null;

comment on column public.repayments.expense_id is
  'Optional linked expense. For per-expense AA settlement, the expense payer confirms receipt before a linked repayment is created.';