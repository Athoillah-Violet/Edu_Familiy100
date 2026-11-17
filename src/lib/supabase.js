import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env?.VITE_SUPABASE_URL?.trim() || '';
const supabaseKey = import.meta.env?.VITE_SUPABASE_PUBLISHABLE_KEY?.trim() || '';

const hasValidConfig = Boolean(supabaseUrl && supabaseKey);

export const supabase = hasValidConfig ? createClient(supabaseUrl, supabaseKey) : null;
export const isDemoMode = !hasValidConfig;
export const client = supabase;
