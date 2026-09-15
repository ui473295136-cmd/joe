create or replace function public.cw_reset_linked_expense_settlements()
returns trigger
language plpgsql
as $$
begin
  if old.amount is distinct from new.amount
     or old.payer is distinct from new.payer
     or old.participants is distinct from new.participants
     or old.status is distinct from new.status then
    delete from public.repayments
     where trip_slug = old.trip_slug
       and expense_id = old.id;
  end if;
  return new;
end;
$$;

drop trigger if exists expenses_reset_linked_settlements on public.expenses;
create trigger expenses_reset_linked_settlements
after update of amount, payer, participants, status on public.expenses
for each row execute function public.cw_reset_linked_expense_settlements();