-- Grant admin role to implementation user by email
-- This will make the user be treated as admin in all RLS policies using has_role()

insert into public.user_roles (user_id, role)
select id, 'admin'::public.app_role
from auth.users
where email = 'contatomaydsonsv@gmail.com'
on conflict (user_id, role) do nothing;