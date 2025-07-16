/**
 * @fileoverview Test API route for verifying user plan functionality
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
interface UserPlanData {
  id: string;
  user_id: string;
  plan: string;
  created_at: string;
  updated_at: string;
}

interface TestUserPlanResponse {
  success: boolean;
  data?: {
    userPlans: UserPlanData[];
    totalCount: number;
    samplePlan?: UserPlanData;
  };
  error?: string;
}

////////////////////////////////////////////////
// Constants:
////////////////////////////////////////////////
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

////////////////////////////////////////////////
// Helper Functions:
////////////////////////////////////////////////
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
  res: NextApiResponse<TestUserPlanResponse>
) {
  // SECURITY: Block this endpoint in production
  if (process.env.NODE_ENV === 'production') {
    return res.status(404).json({ success: false, error: 'Not found' });
  }

  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ 
      success: false, 
      error: 'Method Not Allowed. Only GET requests are supported.' 
    });
  }

  try {
    // Create Supabase admin client
    const supabaseAdmin = createSupabaseAdminClient();

    // Get all user plans from the table
    const { data: userPlans, error } = await supabaseAdmin
      .from('user_plan')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      console.error('[Test User Plan API] Supabase error:', error);
      return res.status(500).json({ 
        success: false, 
        error: `Failed to fetch user plans: ${error.message}` 
      });
    }

    // Log results (in development)
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Test User Plan API] Found ${userPlans?.length || 0} user plans`);
      if (userPlans && userPlans.length > 0) {
        console.log('[Test User Plan API] Sample plan:', userPlans[0]);
      }
    }

    return res.status(200).json({ 
      success: true, 
      data: {
        userPlans: userPlans || [],
        totalCount: userPlans?.length || 0,
        samplePlan: userPlans && userPlans.length > 0 ? userPlans[0] : undefined
      }
    });

  } catch (error) {
    console.error('[Test User Plan API] Unexpected error:', error);
    
    return res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Internal server error' 
    });
  }
} 