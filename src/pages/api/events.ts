import type { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'

// ============================================================================
// SUPABASE CLIENT SETUP
// ============================================================================

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface EventData {
  id: string;
  eventType: string;
  productId?: string;
  sessionId?: string;
  metadata?: Record<string, any>;
  timestamp: number;
  retryCount: number;
}

interface ApiRequest {
  events: EventData[];
  userId: string;
}

interface ApiResponse {
  success: boolean;
  message?: string;
  error?: string;
  processedCount?: number;
}

// ============================================================================
// VALIDATION FUNCTIONS
// ============================================================================

/**
 * Validates the Authorization header and extracts user ID
 */
function validateAuthHeader(authHeader: string | undefined): string | null {
  if (!authHeader) {
    return null;
  }
  
  // Expect format: "Bearer <userId>"
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return null;
  }
  
  const userId = parts[1];
  
  // Basic UUID validation
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(userId)) {
    return null;
  }
  
  return userId;
}

/**
 * Validates event data structure
 */
function validateEvent(event: any): event is EventData {
  return (
    typeof event === 'object' &&
    typeof event.id === 'string' &&
    typeof event.eventType === 'string' &&
    typeof event.timestamp === 'number' &&
    typeof event.retryCount === 'number' &&
    (event.productId === undefined || typeof event.productId === 'string') &&
    (event.sessionId === undefined || typeof event.sessionId === 'string') &&
    (event.metadata === undefined || typeof event.metadata === 'object')
  );
}

/**
 * Validates the request body
 */
function validateRequestBody(body: any): body is ApiRequest {
  return (
    typeof body === 'object' &&
    Array.isArray(body.events) &&
    typeof body.userId === 'string' &&
    body.events.length > 0 &&
    body.events.length <= 100 && // Limit batch size
    body.events.every(validateEvent)
  );
}

/**
 * Maps event data to Supabase table structure
 */
function mapEventToSupabase(event: EventData, userId: string) {
  return {
    user_id: userId,
    event_type: event.eventType,
    product_id: event.productId || null,
    session_id: event.sessionId || null,
    metadata: event.metadata || {},
    created_at: new Date(event.timestamp).toISOString(),
    retry_count: event.retryCount,
    processing_status: 'completed' as const,
    processed_at: new Date().toISOString()
  };
}

// ============================================================================
// MAIN API HANDLER
// ============================================================================

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResponse>) {
  // Add CORS headers to allow extension requests
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  // Handle preflight requests from extension
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ 
      success: false, 
      error: 'Method not allowed' 
    });
  }

  try {
    // Validate Authorization header
    const userId = validateAuthHeader(req.headers.authorization);
    if (!userId) {
      console.error('Invalid or missing Authorization header');
      return res.status(401).json({ 
        success: false, 
        error: 'Invalid or missing Authorization header' 
      });
    }

    // Validate request body
    if (!validateRequestBody(req.body)) {
      console.error('Invalid request body:', req.body);
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid request body' 
      });
    }

    const { events, userId: bodyUserId } = req.body;

    // Ensure userId in body matches Authorization header
    if (userId !== bodyUserId) {
      console.error('User ID mismatch between header and body');
      return res.status(400).json({ 
        success: false, 
        error: 'User ID mismatch' 
      });
    }

    // Verify user exists in the database
    const { data: user, error: userError } = await supabase
      .from('user_plan')
      .select('id')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      console.error('User not found:', userId, userError);
      return res.status(404).json({ 
        success: false, 
        error: 'User not found' 
      });
    }

    // Map events to Supabase structure
    const mappedEvents = events.map(event => mapEventToSupabase(event, userId));

    // Insert events into database using batch insert
    const { data: insertedEvents, error: insertError } = await supabase
      .from('event_logs')
      .insert(mappedEvents)
      .select('id');

    if (insertError) {
      console.error('Database insert error:', insertError);
      return res.status(500).json({ 
        success: false, 
        error: 'Failed to insert events' 
      });
    }

    // Log successful processing
    console.log(`Successfully processed ${events.length} events for user ${userId}`);

    // Return success response
    return res.status(200).json({
      success: true,
      message: `Successfully processed ${events.length} events`,
      processedCount: events.length
    });

  } catch (error) {
    console.error('API error:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
}