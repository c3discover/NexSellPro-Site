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
    persistSession: true, // Use cookies for session persistence (default)
    autoRefreshToken: true, // Enable auto token refresh
    detectSessionInUrl: true, // Detect session in URL for OAuth redirects
  },
});

// User Profile interface
export interface UserProfile {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  business_name?: string;
  how_did_you_hear?: string;
  created_at: string;
  updated_at: string;
}

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
 * Get user profile data
 * @param userId - The user's ID
 * @returns {Promise<UserProfile | null>} The user profile or null if not found
 */
export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error) {
    console.error('Error fetching user profile:', error.message);
    return null;
  }
  return data;
}

/**
 * Create or update user profile
 * @param profile - The user profile data
 * @returns {Promise<UserProfile | null>} The created/updated profile or null if failed
 */
export async function upsertUserProfile(profile: Omit<UserProfile, 'id' | 'created_at' | 'updated_at'>): Promise<UserProfile | null> {
  const { data, error } = await supabase
    .from('user_profiles')
    .upsert({
      user_id: profile.user_id,
      first_name: profile.first_name,
      last_name: profile.last_name,
      business_name: profile.business_name,
      how_did_you_hear: profile.how_did_you_hear,
    }, {
      onConflict: 'user_id'
    })
    .select()
    .single();

  if (error) {
    console.error('Error upserting user profile:', error.message);
    return null;
  }
  return data;
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