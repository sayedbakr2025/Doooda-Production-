create table project_activity (
  id uuid primary key default gen_random_uuid(),
  project_id uuid,
  user_id uuid,
  action text,
  metadata jsonb,
  created_at timestamp default now()
);

alter table project_activity enable row level security;

create policy "project members can read activity"
on project_activity for select
to authenticated
using (
  project_id IN (
    select p.id from projects p where p.user_id = auth.uid()
    union
    select pc.project_id from project_collaborators pc where pc.user_id = auth.uid() and pc.status = 'active'
  )
);

create policy "authenticated can insert activity"
on project_activity for insert
to authenticated
with check (true);
