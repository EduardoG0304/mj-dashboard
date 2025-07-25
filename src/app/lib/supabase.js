import { createClient } from '@supabase/supabase-js'

let supabase;

try {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (supabaseUrl && supabaseKey) {
    supabase = createClient(supabaseUrl, supabaseKey);
  } else {
    console.warn('Supabase credentials not found - client not initialized');
    supabase = null;
  }
} catch (error) {
  console.error('Supabase initialization error:', error);
  supabase = null;
}

export { supabase };