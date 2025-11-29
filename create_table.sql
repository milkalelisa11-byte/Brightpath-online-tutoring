
-- Run in Supabase SQL editor (SQL > New query) to create the registrations table
create extension if not exists "uuid-ossp";
create table if not exists public.registrations (
  id uuid default uuid_generate_v4() primary key,
  parent text,
  email text,
  student text,
  country text,
  grade text,
  subject text,
  plan text,
  note text,
  created_at timestamp with time zone default timezone('utc'::text, now())
);
