// Configuration Supabase directe
export const SUPABASE_CONFIG = {
  url: import.meta.env.VITE_SUPABASE_URL || '',

  // Utiliser import.meta.env pour Vite
  anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY || '',
};

// Force l'utilisation de Supabase uniquement
export const FORCE_SUPABASE_ONLY = true;
export const DISABLE_INDEXEDDB = true;
