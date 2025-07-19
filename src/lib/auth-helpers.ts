import { SupabaseClient, Session, User } from '@supabase/supabase-js';
import { createBrowserClient } from '@supabase/ssr';

// ============================================================================
// ENVIRONMENT & CONFIGURATION
// ============================================================================

// Environment variables for Supabase configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Environment detection for timing adjustments
const isDevelopment = process.env.NODE_ENV === 'development';
const isProduction = (process.env.NODE_ENV as string) === 'production';

// Debug flag for development logging
export const DEBUG = isDevelopment;

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Session persistence configuration options
 */
export interface SessionPersistenceConfig {
  /** Maximum time to wait for session refresh (default: 5000ms) */
  maxRefreshWaitTime?: number;
  /** Time to wait for cookie propagation (default: 200ms in prod, 50ms in dev) */
  cookiePropagationDelay?: number;
  /** Whether to force session refresh even if session exists */
  forceRefresh?: boolean;
  /** Custom error handler for session operations */
  onError?: (error: Error) => void;
  /** Callback when session is successfully persisted */
  onSuccess?: (session: Session) => void;
}

/**
 * Session persistence result
 */
export interface SessionPersistenceResult {
  /** Whether session persistence was successful */
  success: boolean;
  /** The current session after persistence attempt */
  session: Session | null;
  /** Any error that occurred during the process */
  error?: string;
  /** Whether a session refresh was performed */
  refreshed: boolean;
  /** Time taken for the operation in milliseconds */
  duration: number;
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
 * Get environment-appropriate cookie propagation delay
 * Production environments need more time for cookie propagation across
 * different servers/load balancers, while development can be faster
 */
function getCookiePropagationDelay(): number {
  if (isProduction) {
    return 200; // 200ms for production - accounts for load balancers, CDN, etc.
  }
  return 50; // 50ms for development - faster for better DX
}

/**
 * Create a browser-specific Supabase client for client-side operations
 * This ensures we're using the correct client type for browser environments
 */
function createBrowserSupabaseClient(): SupabaseClient {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables');
  }

  return createBrowserClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });
}

/**
 * Check if a session is valid and not expired
 * @param session - The session to validate
 * @returns {boolean} True if session is valid, false otherwise
 */
function isSessionValid(session: Session | null): boolean {
  if (!session) return false;
  
  // Check if session has required properties
  if (!session.access_token || !session.refresh_token || !session.user) {
    return false;
  }
  
  // Check if session is expired (with 5-minute buffer for safety)
  const now = Math.floor(Date.now() / 1000);
  const expiresAt = session.expires_at;
  const bufferTime = 5 * 60; // 5 minutes in seconds
  
  return expiresAt ? (expiresAt - bufferTime) > now : false;
}

/**
 * Check if a session needs refresh based on expiration time
 * @param session - The session to check
 * @returns {boolean} True if session needs refresh, false otherwise
 */
function needsSessionRefresh(session: Session | null): boolean {
  if (!session) return true;
  
  const now = Math.floor(Date.now() / 1000);
  const expiresAt = session.expires_at;
  
  // Refresh if session expires within 10 minutes
  const refreshThreshold = 10 * 60; // 10 minutes in seconds
  
  return expiresAt ? (expiresAt - refreshThreshold) <= now : true;
}

/**
 * Wait for a specified amount of time
 * @param ms - Milliseconds to wait
 * @returns {Promise<void>} Promise that resolves after the delay
 */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
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
      const delayMs = baseDelay * Math.pow(2, attempt);
      debugLog(`Retry attempt ${attempt + 1}/${maxRetries + 1} after ${delayMs}ms`);
      
      await delay(delayMs);
    }
  }
  
  throw lastError;
}

// ============================================================================
// CORE SESSION PERSISTENCE FUNCTION
// ============================================================================

/**
 * Ensures session persistence with comprehensive error handling and timing optimization
 * 
 * This function is critical for maintaining user sessions across:
 * - Page refreshes and browser restarts
 * - Network interruptions and reconnections
 * - Token expiration and automatic refresh
 * - Cross-tab session synchronization
 * - Production load balancer scenarios
 * 
 * Key Features:
 * - Automatic session refresh when needed
 * - Environment-specific timing optimizations
 * - Comprehensive error handling and retry logic
 * - Cookie propagation timing for production environments
 * - Detailed logging for debugging
 * 
 * @param config - Configuration options for session persistence
 * @returns {Promise<SessionPersistenceResult>} Result of the session persistence operation
 */
export async function ensureSessionPersistence(
  config: SessionPersistenceConfig = {}
): Promise<SessionPersistenceResult> {
  const startTime = Date.now();
  const {
    maxRefreshWaitTime = 5000,
    cookiePropagationDelay = getCookiePropagationDelay(),
    forceRefresh = false,
    onError,
    onSuccess
  } = config;

  debugLog('Starting session persistence check', {
    forceRefresh,
    cookiePropagationDelay,
    maxRefreshWaitTime
  });

  try {
    // Create browser-specific Supabase client
    // This ensures we're using the correct client type for browser environments
    const supabase = createBrowserSupabaseClient();

    // Step 1: Get current session state
    // This is the baseline check to understand the current authentication state
    debugLog('Getting current session...');
    const { data: { session: currentSession }, error: getSessionError } = await supabase.auth.getSession();

    if (getSessionError) {
      debugLog('Error getting current session:', getSessionError);
      const error = new Error(`Failed to get current session: ${getSessionError.message}`);
      onError?.(error);
      
      return {
        success: false,
        session: null,
        error: error.message,
        refreshed: false,
        duration: Date.now() - startTime
      };
    }

    // Step 2: Validate current session
    // Check if the session exists and is valid before proceeding
    const isValidSession = isSessionValid(currentSession);
    const needsRefresh = forceRefresh || needsSessionRefresh(currentSession);

    debugLog('Session validation results:', {
      hasSession: !!currentSession,
      isValid: isValidSession,
      needsRefresh,
      forceRefresh
    });

    // Step 3: Handle session refresh if needed
    let refreshed = false;
    let finalSession = currentSession;

    if (needsRefresh) {
      debugLog('Session refresh required, starting refresh process...');
      
      try {
        // Use retry logic for session refresh to handle network issues
        const refreshResult = await withRetry(async () => {
          const { data, error } = await supabase.auth.refreshSession();
          
          if (error) {
            throw error;
          }
          
          return data;
        }, 3, 1000);

        if (refreshResult.session) {
          finalSession = refreshResult.session;
          refreshed = true;
          debugLog('Session refresh successful', {
            userId: finalSession.user?.id,
            expiresAt: finalSession.expires_at
          });
        } else {
          debugLog('Session refresh returned no session');
        }
      } catch (refreshError) {
        debugLog('Session refresh failed:', refreshError);
        
        // If refresh fails, we might need to redirect to login
        // But don't throw here - let the calling code decide how to handle it
        const error = refreshError instanceof Error ? refreshError : new Error('Session refresh failed');
        onError?.(error);
        
        return {
          success: false,
          session: currentSession, // Return current session even if refresh failed
          error: error.message,
          refreshed: false,
          duration: Date.now() - startTime
        };
      }
    }

    // Step 4: Wait for cookie propagation (critical for production)
    // This ensures that session cookies are properly set before continuing
    // Production environments need more time due to load balancers, CDN, etc.
    if (refreshed || finalSession) {
      debugLog(`Waiting ${cookiePropagationDelay}ms for cookie propagation...`);
      await delay(cookiePropagationDelay);
    }

    // Step 5: Verify final session state
    // Double-check that our session is still valid after all operations
    const finalValidation = isSessionValid(finalSession);
    
    debugLog('Final session validation:', {
      hasSession: !!finalSession,
      isValid: finalValidation,
      refreshed
    });

    // Step 6: Success callback and return result
    if (finalSession && finalValidation) {
      onSuccess?.(finalSession);
    }

    const duration = Date.now() - startTime;
    
    debugLog('Session persistence completed', {
      success: finalValidation,
      duration,
      refreshed
    });

    return {
      success: finalValidation,
      session: finalSession,
      refreshed,
      duration
    };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    debugLog('Session persistence failed:', error);
    
    const finalError = error instanceof Error ? error : new Error(errorMessage);
    onError?.(finalError);
    
    return {
      success: false,
      session: null,
      error: errorMessage,
      refreshed: false,
      duration: Date.now() - startTime
    };
  }
}

// ============================================================================
// ADDITIONAL SESSION UTILITY FUNCTIONS
// ============================================================================

/**
 * Get current user with session validation
 * @returns {Promise<User | null>} Current user or null if not authenticated
 */
export async function getCurrentUser(): Promise<User | null> {
  try {
    const supabase = createBrowserSupabaseClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error) {
      debugLog('Error getting current user:', error);
      return null;
    }
    
    return user;
  } catch (error) {
    debugLog('Unexpected error getting current user:', error);
    return null;
  }
}

/**
 * Check if user is currently authenticated
 * @returns {Promise<boolean>} True if authenticated, false otherwise
 */
export async function isAuthenticated(): Promise<boolean> {
  try {
    const result = await ensureSessionPersistence();
    return result.success && !!result.session;
  } catch (error) {
    debugLog('Error checking authentication status:', error);
    return false;
  }
}

/**
 * Sign out user and clear session
 * @returns {Promise<void>}
 */
export async function signOut(): Promise<void> {
  try {
    const supabase = createBrowserSupabaseClient();
    const { error } = await supabase.auth.signOut();
    
    if (error) {
      debugLog('Error during sign out:', error);
      throw error;
    }
    
    debugLog('User signed out successfully');
  } catch (error) {
    debugLog('Unexpected error during sign out:', error);
    throw error;
  }
}

/**
 * Wait for session to be available with timeout
 * @param maxWaitTime - Maximum time to wait in milliseconds (default: 10000ms)
 * @returns {Promise<Session | null>} Session when available or null if timeout
 */
export async function waitForSession(maxWaitTime: number = 10000): Promise<Session | null> {
  const startTime = Date.now();
  
  while (Date.now() - startTime < maxWaitTime) {
    const result = await ensureSessionPersistence();
    
    if (result.success && result.session) {
      return result.session;
    }
    
    // Wait 500ms before next check
    await delay(500);
  }
  
  debugLog(`Session wait timeout after ${maxWaitTime}ms`);
  return null;
}

// ============================================================================
// SESSION MONITORING & DEBUGGING
// ============================================================================

/**
 * Get detailed session information for debugging
 * @returns {Promise<object>} Detailed session information
 */
export async function getSessionInfo(): Promise<{
  hasSession: boolean;
  isValid: boolean;
  needsRefresh: boolean;
  user?: {
    id: string;
    email: string;
  };
  expiresAt?: number;
  timeUntilExpiry?: number;
}> {
  try {
    const supabase = createBrowserSupabaseClient();
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error || !session) {
      return {
        hasSession: false,
        isValid: false,
        needsRefresh: true
      };
    }
    
    const now = Math.floor(Date.now() / 1000);
    const timeUntilExpiry = session.expires_at ? session.expires_at - now : 0;
    
    return {
      hasSession: true,
      isValid: isSessionValid(session),
      needsRefresh: needsSessionRefresh(session),
      user: session.user ? {
        id: session.user.id,
        email: session.user.email || 'No email'
      } : undefined,
      expiresAt: session.expires_at,
      timeUntilExpiry
    };
  } catch (error) {
    debugLog('Error getting session info:', error);
    return {
      hasSession: false,
      isValid: false,
      needsRefresh: true
    };
  }
}

/**
 * Force session refresh regardless of current state
 * @returns {Promise<SessionPersistenceResult>} Result of forced refresh
 */
export async function forceSessionRefresh(): Promise<SessionPersistenceResult> {
  return ensureSessionPersistence({ forceRefresh: true });
} 