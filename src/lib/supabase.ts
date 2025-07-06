import { createClient, SupabaseClient, Session, AuthChangeEvent, User } from '@supabase/supabase-js';

// Ensure environment variables are set
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL in environment variables');
}
if (!supabaseAnonKey) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_ANON_KEY in environment variables');
}

// Create a single supabase client for the whole app
export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true, // Use localStorage for session persistence
    autoRefreshToken: true, // Enable auto token refresh
    detectSessionInUrl: true, // Detect session in URL for OAuth redirects
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
  },
});

/**
 * Get the current authenticated user (if any)
 * @returns {Promise<User | null>} The current user or null if not authenticated
 */
export async function getCurrentUser(): Promise<User | null> {
  const { data, error } = await supabase.auth.getUser();
  if (error) {
    console.error('Error fetching current user:', error.message);
    return null;
  }
  return data.user;
}

/**
 * Check if a user is authenticated
 * @returns {Promise<boolean>} True if authenticated, false otherwise
 */
export async function isAuthenticated(): Promise<boolean> {
  const user = await getCurrentUser();
  return !!user;
}

/**
 * Sign out the current user
 * @returns {Promise<void>}
 */
export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) {
    console.error('Error signing out:', error.message);
    throw error;
  }
}

/**
 * Listen for authentication state changes
 * @param {(event: AuthChangeEvent, session: Session | null) => void} callback
 * @returns {() => void} Unsubscribe function
 */
export function onAuthStateChange(
  callback: (event: AuthChangeEvent, session: Session | null) => void
): () => void {
  const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
    callback(event, session);
  });
  // Return unsubscribe function
  return () => {
    listener.subscription.unsubscribe();
  };
}

// TypeScript types for convenience
export type { SupabaseClient, Session, AuthChangeEvent, User }; 