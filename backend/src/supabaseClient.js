// backend/src/supabaseClient.js - SUPABASE CONNECTION CLIENT

const { createClient } = require('@supabase/supabase-js');

// !!! IMPORTANT: YOU MUST REPLACE THESE WITH YOUR ACTUAL SUPABASE DETAILS !!!
// You get these from your Supabase Project Settings -> API.

// 1. Project URL (e.g., https://abcde12345.supabase.co)
const supabaseUrl = 'https://uvtjwgvknbaizpiejazq.supabase.co'; 

// 2. Anon Public Key (Safe to expose on the web, but we use it server-side)
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV2dGp3Z3ZrbmJhaXpwaWVqYXpxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk0MDg5NjgsImV4cCI6MjA3NDk4NDk2OH0.XwbI2NpB0vdB4has3d-gZNeJZLJhhseeI4eJKnWWFGk'; 

const supabase = createClient(supabaseUrl, supabaseKey);

module.exports = supabase;