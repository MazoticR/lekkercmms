// lib/supabaseClient.ts
import { createClient } from '@supabase/supabase-js';
import { Database } from '../types/db_types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient<Database>(supabaseUrl, supabaseKey);

export default supabase;
