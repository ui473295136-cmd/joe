-- Trip tables are accessed by session-checked Edge Functions using the service role.
alter table public.profiles enable row level security;
alter table public.activity_logs enable row level security;
alter table public.ledger_acknowledgements enable row level security;
alter table public.team_votes enable row level security;
