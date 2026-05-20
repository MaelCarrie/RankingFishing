// ─── Configuration Supabase ───────────────────────────────────────────────────
//
// Pour configurer Supabase :
// 1. Créer un projet sur https://supabase.com
// 2. Aller dans Project Settings > API
// 3. Copier "Project URL" et "anon public" key ci-dessous
//
// ─────────────────────────────────────────────────────────────────────────────

import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const supabaseUrl = 'https://flhqlktregfwvomzprlo.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZsaHFsa3RyZWdmd3ZvbXpwcmxvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkyNTczMDksImV4cCI6MjA5NDgzMzMwOX0.sgpXg7Woed9NNnw02pWQAn-tWlZKYKLzCLJoWA52zPA';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Mode mock : true = données simulées localement, false = Supabase réel
export const USE_MOCK_DATA = false;
