-- Supabase Database Schema Migration Script for Growth Quest Tracker
-- Run this in your Supabase SQL Editor: https://supabase.com/dashboard/project/_/sql

-- 1. Create User Profiles Table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users NOT NULL PRIMARY KEY,
  email TEXT,
  full_name TEXT,
  nickname TEXT,
  role TEXT DEFAULT 'child',
  coins INTEGER DEFAULT 350,
  xp INTEGER DEFAULT 0,
  level INTEGER DEFAULT 1,
  current_avatar TEXT DEFAULT 'roblox_noob',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Create User Quests & Rewards Sync Table
CREATE TABLE IF NOT EXISTS public.user_data (
  user_id UUID REFERENCES auth.users NOT NULL PRIMARY KEY,
  tasks JSONB DEFAULT '[]'::jsonb,
  prizes JSONB DEFAULT '[]'::jsonb,
  won_prizes JSONB DEFAULT '[]'::jsonb,
  unlocked_avatars JSONB DEFAULT '["default", "roblox_noob"]'::jsonb,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_data ENABLE ROW LEVEL SECURITY;

-- Create RLS Policies for Profiles
CREATE POLICY "Public profiles are viewable by everyone." ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert their own profile." ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update their own profile." ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Create RLS Policies for User Data
CREATE POLICY "Users can view their own data." ON public.user_data FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own data." ON public.user_data FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own data." ON public.user_data FOR UPDATE USING (auth.uid() = user_id);
