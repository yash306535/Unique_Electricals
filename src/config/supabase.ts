import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Supabase credentials (hard-coded)
const SUPABASE_URL = 'https://izzcbcjdowlxbtpewnxc.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_EHasNMZ7Zv0IsvsjMW6PJA_M7UByCnM';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
