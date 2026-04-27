-- Create Users Table
CREATE TABLE public.users (
  email text PRIMARY KEY,
  role text,
  parent_email text,
  status text
);

-- Create Child Data Table to store the application state
CREATE TABLE public.child_data (
  email text PRIMARY KEY REFERENCES public.users(email),
  state jsonb
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.child_data ENABLE ROW LEVEL SECURITY;

-- For this prototype, we'll create simple permissive policies.
-- (In a production environment, you should restrict access to authenticated users based on their email)
CREATE POLICY "Allow public read/write on users" ON public.users FOR ALL USING (true);
CREATE POLICY "Allow public read/write on child_data" ON public.child_data FOR ALL USING (true);
