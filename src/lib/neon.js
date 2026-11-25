import { createClient, SupabaseAuthAdapter } from '@neondatabase/neon-js';

const neonAuthUrl = import.meta.env?.VITE_NEON_AUTH_URL?.trim() || '';
const neonDataApiUrl = import.meta.env?.VITE_NEON_DATA_API_URL?.trim() || '';

const hasValidConfig = Boolean(neonAuthUrl && neonDataApiUrl);

export const neon = hasValidConfig
  ? createClient({
      auth: {
        url: neonAuthUrl,
        adapter: SupabaseAuthAdapter(),
      },
      dataApi: {
        url: neonDataApiUrl,
      },
    })
  : null;

export const isDemoMode = !hasValidConfig;
export const client = neon;
export const supabase = neon; // Alias backward-compatibility jika ada modul internal yang merujuk
