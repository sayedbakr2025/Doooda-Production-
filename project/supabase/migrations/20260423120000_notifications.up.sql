create table notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  type text not null,
  title text,
  message text,
  data jsonb,
  read boolean default false,
  created_at timestamp default now()
);

alter table notifications enable row level security;

create policy "user can read own notifications"
on notifications for select
to authenticated
using (auth.uid() = user_id);

create policy "user can insert notifications"
on notifications for insert
to authenticated
with check (true);
