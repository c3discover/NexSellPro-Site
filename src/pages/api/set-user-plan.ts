/**
 * @fileoverview API route for setting user subscription plans
 * @author NexSellPro
 * @created 2024-12-19
 * @lastModified 2024-12-19
 */

////////////////////////////////////////////////
// Imports:
////////////////////////////////////////////////
import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

////////////////////////////////////////////////
// Types and Interfaces:
////////////////////////////////////////////////
interface SetUserPlanRequest {
  userId: string;
  plan: 'free' | 'premium' | 'enterprise';
}

interface SetUserPlanResponse {
  success: boolean;
  data?: any;
  error?: string;
}

////////////////////////////////////////////////
// Constants:
////////////////////////////////////////////////
const VALID_PLANS = ['free', 'premium', 'enterprise'] as const;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

////////////////////////////////////////////////
// Helper Functions:
////////////////////////////////////////////////
/**
 * Validates the request body for required fields and data types
 * @param body - The request body to validate
 * @returns Validation result with errors if any
 */
function validateRequest(body: any): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!body.userId || typeof body.userId !== 'string') {
    errors.push('userId is required and must be a string');
  }

  if (!body.plan || typeof body.plan !== 'string') {
    errors.push('plan is required and must be a string');
  } else if (!VALID_PLANS.includes(body.plan as any)) {
    errors.push(`plan must be one of: ${VALID_PLANS.join(', ')}`);
  }

  return { isValid: errors.length === 0, errors };
}

/**
 * Creates a Supabase admin client for server-side operations
 * @returns Supabase admin client
 */
function createSupabaseAdminClient() {
  if (!SUPABASE_URL) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL is not configured');
  }
  if (!SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not configured');
  }

  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

////////////////////////////////////////////////
// Handler Function:
////////////////////////////////////////////////
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<SetUserPlanResponse>
) {
  // SECURITY: Block this endpoint in production unless properly secured
  if (process.env.NODE_ENV === 'production') {
    // TODO: Add proper authentication/authorization here
    // For now, blocking in production for security
    return res.status(404).json({ success: false, error: 'Not found' });
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      success: false, 
      error: 'Method Not Allowed. Only POST requests are supported.' 
    });
  }

  try {
    // Validate request body
    const validation = validateRequest(req.body);
    if (!validation.isValid) {
      return res.status(400).json({ 
        success: false, 
        error: `Validation failed: ${validation.errors.join(', ')}` 
      });
    }

    const { userId, plan }: SetUserPlanRequest = req.body;

    // Create Supabase admin client
    const supabaseAdmin = createSupabaseAdminClient();

    // Upsert user plan in the user_plan table
    const { data, error } = await supabaseAdmin
      .from('user_plan')
      .upsert(
        {
          user_id: userId,
          plan: plan,
          updated_at: new Date().toISOString()
        },
        {
          onConflict: 'user_id',
          ignoreDuplicates: false
        }
      )
      .select()
      .single();

    if (error) {
      console.error('[Set User Plan API] Supabase error:', error);
      return res.status(500).json({ 
        success: false, 
        error: `Failed to update user plan: ${error.message}` 
      });
    }

    // Log successful plan update (in development)
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Set User Plan API] Successfully updated user ${userId} to ${plan} plan`);
    }

    return res.status(200).json({ 
      success: true, 
      data: {
        userId: data.user_id,
        plan: data.plan,
        updatedAt: data.updated_at
      }
    });

  } catch (error) {
    console.error('[Set User Plan API] Unexpected error:', error);
    
    return res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Internal server error' 
    });
  }
} 