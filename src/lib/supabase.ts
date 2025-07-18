import { createClient, SupabaseClient, Session, AuthChangeEvent, User } from '@supabase/supabase-js';

// ============================================================================
// CONFIGURATION & ENVIRONMENT SETUP
// ============================================================================

// Environment variables for Supabase configuration
// These should be set in your .env.local file:
// NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
// NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Debug flag for development - enables detailed auth logging
export const DEBUG = process.env.NODE_ENV === 'development';

// ============================================================================
// AUTHENTICATION CONFIGURATION
// ============================================================================

/**
 * Supabase Auth Configuration Options:
 * 
 * persistSession: true - Uses cookies to persist session across browser sessions
 *   - Sessions survive browser restarts and tab closures
 *   - Automatically handles session restoration on page load
 *   - More secure than localStorage for session storage
 * 
 * autoRefreshToken: true - Automatically refreshes access tokens before they expire
 *   - Prevents users from being logged out due to token expiration
 *   - Handles token refresh in the background without user intervention
 *   - Reduces authentication errors during long sessions
 * 
 * detectSessionInUrl: true - Detects authentication tokens in URL parameters
 *   - Essential for OAuth flows (Google, GitHub, etc.)
 *   - Automatically processes auth callbacks from external providers
 *   - Cleans up URL parameters after successful authentication
 */

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

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

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

// User Plan interface
export interface UserPlan {
  id: string;
  user_id: string;
  plan: 'free' | 'premium' | 'enterprise';
  created_at: string;
  updated_at: string;
}

// Auth status interface for checkAuthStatus function
export interface AuthStatus {
  isAuthenticated: boolean;
  user: User | null;
  session: Session | null;
  error?: string;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Log debug messages only in development mode
 * @param message - The message to log
 * @param data - Optional data to include in the log
 */
function debugLog(message: string, data?: unknown): void {
  if (DEBUG) {
  
  }
}

/**
 * Check if Supabase client is properly initialized
 * @returns {boolean} True if client is ready, false otherwise
 */
function isClientReady(): boolean {
  return !!(supabase && supabase.auth);
}

/**
 * Handle authentication errors and return user-friendly messages
 * @param error - The error object from Supabase
 * @returns {string} User-friendly error message
 */
export function handleAuthError(error: unknown): string {
  if (!error) return 'An unknown error occurred';
  
  debugLog('Auth error occurred:', error);
  
  // Handle specific Supabase auth errors
  if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') {
    const message = error.message.toLowerCase();
    
    if (message.includes('invalid login credentials')) {
      return 'Invalid email or password. Please try again.';
    }
    if (message.includes('email not confirmed')) {
      return 'Please check your email and confirm your account before signing in.';
    }
    if (message.includes('too many requests')) {
      return 'Too many login attempts. Please wait a few minutes before trying again.';
    }
    if (message.includes('network')) {
      return 'Network error. Please check your internet connection and try again.';
    }
    if (message.includes('jwt expired')) {
      return 'Your session has expired. Please sign in again.';
    }
    if (message.includes('user not found')) {
      return 'Account not found. Please check your email or create a new account.';
    }
    if (message.includes('weak password')) {
      return 'Password is too weak. Please choose a stronger password.';
    }
    if (message.includes('email already registered')) {
      return 'An account with this email already exists. Please sign in instead.';
    }
  }
  
  // Fallback error messages
  if (error && typeof error === 'object' && 'status' in error) {
    const status = error.status;
    if (status === 400) {
      return 'Invalid request. Please check your information and try again.';
    }
    if (status === 401) {
      return 'Authentication failed. Please sign in again.';
    }
    if (status === 403) {
      return 'Access denied. You don\'t have permission to perform this action.';
    }
    if (status === 404) {
      return 'Resource not found. Please check your request and try again.';
    }
    if (typeof status === 'number' && status >= 500) {
      return 'Server error. Please try again later.';
    }
  }
  
  if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') {
    return error.message;
  }
  
  return 'An unexpected error occurred. Please try again.';
}

/**
 * Retry function with exponential backoff for network operations
 * @param operation - The async operation to retry
 * @param maxRetries - Maximum number of retry attempts (default: 3)
 * @param baseDelay - Base delay in milliseconds (default: 1000)
 * @returns {Promise<T>} The result of the operation
 */
async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: unknown;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error: unknown) {
      lastError = error;
      
      // Don't retry on client errors (4xx) except for network issues
      if (error && typeof error === 'object' && 'status' in error && typeof error.status === 'number') {
        if (error.status >= 400 && error.status < 500) {
          if (!(error && typeof error === 'object' && 'message' in error && typeof error.message === 'string' && error.message.toLowerCase().includes('network'))) {
            throw error;
          }
        }
      }
      
      // Don't retry on the last attempt
      if (attempt === maxRetries) {
        break;
      }
      
      // Calculate delay with exponential backoff
      const delay = baseDelay * Math.pow(2, attempt);
      debugLog(`Retry attempt ${attempt + 1}/${maxRetries + 1} after ${delay}ms`);
      
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError;
}

// ============================================================================
// AUTHENTICATION HELPER FUNCTIONS
// ============================================================================

/**
 * Check current authentication status with comprehensive error handling
 * 
 * Use this function when you need to:
 * - Verify if a user is currently logged in
 * - Get the current user and session information
 * - Handle authentication errors gracefully
 * - Display authentication status in UI components
 * 
 * @returns {Promise<AuthStatus>} Object containing auth state, user, session, and any errors
 */
export async function checkAuthStatus(): Promise<AuthStatus> {
  if (!isClientReady()) {
    return {
      isAuthenticated: false,
      user: null,
      session: null,
      error: 'Supabase client not initialized'
    };
  }

  try {
    debugLog('Checking authentication status...');
    
    const result = await withRetry(async () => {
      const [userResult, sessionResult] = await Promise.all([
        supabase.auth.getUser(),
        supabase.auth.getSession()
      ]);
      
      return { userResult, sessionResult };
    });
    
    const { userResult, sessionResult } = result;
    
    if (userResult.error) {
      debugLog('Error getting user:', userResult.error);
      return {
        isAuthenticated: false,
        user: null,
        session: null,
        error: handleAuthError(userResult.error)
      };
    }
    
    if (sessionResult.error) {
      debugLog('Error getting session:', sessionResult.error);
      return {
        isAuthenticated: false,
        user: null,
        session: null,
        error: handleAuthError(sessionResult.error)
      };
    }
    
    const isAuthenticated = !!(userResult.data.user && sessionResult.data.session);
    
    debugLog(`Auth status: ${isAuthenticated ? 'Authenticated' : 'Not authenticated'}`);
    
    return {
      isAuthenticated,
      user: userResult.data.user,
      session: sessionResult.data.session,
    };
    
  } catch (error: unknown) {
    debugLog('Unexpected error in checkAuthStatus:', error);
    return {
      isAuthenticated: false,
      user: null,
      session: null,
      error: handleAuthError(error)
    };
  }
}

/**
 * Wait for a session to be available, with timeout
 * 
 * Use this function when you need to:
 * - Wait for authentication to complete after sign-in
 * - Handle OAuth redirects that may take time to process
 * - Ensure session is available before proceeding with protected operations
 * - Implement loading states during authentication
 * 
 * @param maxWaitTime - Maximum time to wait in milliseconds (default: 10000ms = 10 seconds)
 * @returns {Promise<Session | null>} The session if available, null if timeout or error
 */
export async function waitForSession(maxWaitTime: number = 10000): Promise<Session | null> {
  if (!isClientReady()) {
    debugLog('Client not ready for waitForSession');
    return null;
  }

  const startTime = Date.now();
  
  debugLog(`Waiting for session (max ${maxWaitTime}ms)...`);
  
  return new Promise((resolve) => {
    const checkSession = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          debugLog('Error getting session during wait:', error);
          resolve(null);
          return;
        }
        
        if (data.session) {
          debugLog('Session found during wait');
          resolve(data.session);
          return;
        }
        
        // Check if we've exceeded the timeout
        if (Date.now() - startTime >= maxWaitTime) {
          debugLog('Session wait timeout exceeded');
          resolve(null);
          return;
        }
        
        // Check again in 100ms
        setTimeout(checkSession, 100);
        
      } catch (error) {
        debugLog('Error in waitForSession:', error);
        resolve(null);
      }
    };
    
    checkSession();
  });
}

/**
 * Get the current authenticated user (if any)
 * 
 * Use this function when you need to:
 * - Get basic user information (id, email, etc.)
 * - Check if a user is logged in
 * - Access user metadata or app metadata
 * 
 * @returns {Promise<User | null>} The current user or null if not authenticated
 */
export async function getCurrentUser(): Promise<User | null> {
  if (!isClientReady()) {
    debugLog('Client not ready for getCurrentUser');
    return null;
  }

  try {
    debugLog('Getting current user...');
    
    const { data, error } = await withRetry(async () => {
      return await supabase.auth.getUser();
    });
    
    if (error) {
      debugLog('Error fetching current user:', error);
      return null;
    }
    
    debugLog(`Current user: ${data.user ? data.user.email : 'None'}`);
    return data.user;
    
  } catch (error: unknown) {
    debugLog('Unexpected error in getCurrentUser:', error);
    return null;
  }
}

/**
 * Get user profile data from the database
 * 
 * Use this function when you need to:
 * - Access custom user profile information (name, business details, etc.)
 * - Display user-specific data in the UI
 * - Get additional user metadata beyond basic auth info
 * 
 * @param userId - The user's ID
 * @returns {Promise<UserProfile | null>} The user profile or null if not found
 */
export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  if (!isClientReady()) {
    debugLog('Client not ready for getUserProfile');
    return null;
  }

  if (!userId) {
    debugLog('No userId provided to getUserProfile');
    return null;
  }

  try {
    debugLog(`Getting user profile for: ${userId}`);
    
    const { data, error } = await withRetry(async () => {
      return await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', userId)
        .single();
    });

    if (error) {
      debugLog('Error fetching user profile:', error);
      return null;
    }
    
    debugLog('User profile retrieved successfully');
    return data;
    
  } catch (error: unknown) {
    debugLog('Unexpected error in getUserProfile:', error);
    return null;
  }
}

/**
 * Create or update user profile
 * 
 * Use this function when you need to:
 * - Save user profile information during registration
 * - Update user profile details
 * - Ensure user profile exists for a given user
 * 
 * @param profile - The user profile data
 * @returns {Promise<UserProfile | null>} The created/updated profile or null if failed
 */
export async function upsertUserProfile(profile: Omit<UserProfile, 'id' | 'created_at' | 'updated_at'>): Promise<UserProfile | null> {
  if (!isClientReady()) {
    debugLog('Client not ready for upsertUserProfile');
    return null;
  }

  if (!profile.user_id) {
    debugLog('No user_id provided to upsertUserProfile');
    return null;
  }

  try {
    debugLog(`Upserting user profile for: ${profile.user_id}`);
    
    const { data, error } = await withRetry(async () => {
      return await supabase
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
    });

    if (error) {
      debugLog('Error upserting user profile:', error);
      return null;
    }
    
    debugLog('User profile upserted successfully');
    return data;
    
  } catch (error: unknown) {
    debugLog('Unexpected error in upsertUserProfile:', error);
    return null;
  }
}

/**
 * Check if a user is authenticated (simple boolean check)
 * 
 * Use this function when you need to:
 * - Simple authentication checks in components
 * - Conditional rendering based on auth status
 * - Quick auth validation without detailed user info
 * 
 * @returns {Promise<boolean>} True if authenticated, false otherwise
 */
export async function isAuthenticated(): Promise<boolean> {
  const user = await getCurrentUser();
  return !!user;
}

/**
 * Get user plan from the database
 * 
 * Use this function when you need to:
 * - Check user's current subscription plan
 * - Display plan-specific features or limits
 * - Validate plan-based permissions
 * 
 * @param userId - The user's ID
 * @returns {Promise<UserPlan | null>} The user plan or null if not found
 */
export async function getUserPlan(userId: string): Promise<UserPlan | null> {
  if (!isClientReady()) {
    debugLog('Client not ready for getUserPlan');
    return null;
  }

  if (!userId) {
    debugLog('No userId provided to getUserPlan');
    return null;
  }

  try {
    debugLog(`Getting user plan for: ${userId}`);
    
    const { data, error } = await withRetry(async () => {
      return await supabase
        .from('user_plan')
        .select('*')
        .eq('user_id', userId)
        .single();
    });

    if (error) {
      debugLog('Error fetching user plan:', error);
      return null;
    }
    
    debugLog(`User plan retrieved: ${data.plan}`);
    return data;
    
  } catch (error: unknown) {
    debugLog('Unexpected error in getUserPlan:', error);
    return null;
  }
}

/**
 * Sign out the current user
 * 
 * Use this function when you need to:
 * - Log out users from the application
 * - Clear authentication state
 * - Handle user logout actions
 * 
 * @returns {Promise<void>}
 */
export async function signOut(): Promise<void> {
  if (!isClientReady()) {
    debugLog('Client not ready for signOut');
    throw new Error('Supabase client not initialized');
  }

  try {
    debugLog('Signing out user...');
    
    const { error } = await withRetry(async () => {
      return await supabase.auth.signOut();
    });
    
    if (error) {
      debugLog('Error signing out:', error);
      throw error;
    }
    
    debugLog('User signed out successfully');
    
  } catch (error: unknown) {
    debugLog('Unexpected error in signOut:', error);
    throw error;
  }
}

/**
 * Listen for authentication state changes
 * 
 * Use this function when you need to:
 * - React to login/logout events in real-time
 * - Update UI components when auth state changes
 * - Implement global auth state management
 * - Handle session refresh events
 * 
 * @param {(event: AuthChangeEvent, session: Session | null) => void} callback
 * @returns {() => void} Unsubscribe function
 */
export function onAuthStateChange(
  callback: (event: AuthChangeEvent, session: Session | null) => void
): () => void {
  if (!isClientReady()) {
    debugLog('Client not ready for onAuthStateChange');
    return () => {}; // Return no-op unsubscribe function
  }

  debugLog('Setting up auth state change listener');
  
  const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
    debugLog(`Auth state changed: ${event}`, { session: !!session });
    callback(event, session);
  });
  
  // Return unsubscribe function
  return () => {
    debugLog('Unsubscribing from auth state changes');
    listener.subscription.unsubscribe();
  };
}

// ============================================================================
// TYPE EXPORTS
// ============================================================================

// TypeScript types for convenience
export type { SupabaseClient, Session, AuthChangeEvent, User }; 