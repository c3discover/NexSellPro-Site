import { supabase } from './supabase';

/**
 * Ensures session persistence by refreshing the session and allowing time for cookie propagation.
 * 
 * This function is critical for production environments where cookie-based authentication
 * requires proper timing and refresh mechanisms to work reliably across different browsers
 * and deployment scenarios.
 * 
 * Why this is needed:
 * 1. Cookie Propagation: In production, especially with CDNs, load balancers, or edge functions,
 *    there can be delays in cookie propagation across different domains/subdomains.
 * 2. Session Refresh: Supabase sessions can become stale, and a forced refresh ensures
 *    the latest session data is available and properly stored in cookies.
 * 3. Browser Timing: Some browsers require additional time to properly set and propagate
 *    authentication cookies, especially in complex deployment scenarios.
 * 4. Edge Cases: Handles cases where the initial session exists but cookies aren't
 *    properly synchronized across the application.
 * 
 * Usage:
 * - Call this function after successful authentication
 * - Use before making authenticated API calls in production
 * - Particularly important in SSR/SSG scenarios where cookie timing is critical
 * 
 * @returns {Promise<Session | null>} The current session after ensuring persistence
 */
export async function ensureSessionPersistence() {
  console.log('[Auth Helper] Ensuring session persistence...');
  
  // Get the current session from Supabase
  const { data: { session } } = await supabase.auth.getSession();
  
  if (session) {
    // Force refresh the session to ensure all cookies are properly set
    // This is especially important in production where cookie propagation
    // can be delayed due to CDNs, load balancers, or edge functions
    await supabase.auth.refreshSession();
    
    console.log('[Auth Helper] Session refreshed, waiting for propagation...');
    
    // Additional delay to allow for cookie propagation across the application
    // This is a conservative approach to handle edge cases in production
    // where immediate cookie availability might not be guaranteed
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  console.log('[Auth Helper] Session persistence complete');
  return session;
} 