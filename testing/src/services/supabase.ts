
import { createClient } from '@supabase/supabase-js';
import { Database } from '../types_db.ts';

// For development, you can replace these with your actual URL and Key from the Supabase Dashboard
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://rdygfkbIwyouvfdeblfe.supabase.co';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJkeWdma2Jpd3lvdXZmZGVibGZlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE3MDEzMjcsImV4cCI6MjA4NzI3NzMyN30.2EI30FsfglK85TXOn7VJYBmF1tNx2ychgYmfbhIqoJs';

export const supabase = createClient<Database>(supabaseUrl, supabaseKey);
