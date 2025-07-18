import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

// THIS IS ONLY FOR TESTING - REMOVE AFTER DEBUGGING
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (process.env.NODE_ENV === 'production') {
    return res.status(404).json({ error: 'Not found' });
  }

  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  
  const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  try {
    // Get the user we just created
    const { data: users } = await adminClient
      .from('auth.users')
      .select('id, email')
      .eq('email', 'traggs25@hotmail.com')
      .single();

    if (!users) {
      return res.json({ error: 'User not found' });
    }

    // Try to insert into user_plan
    const { data, error } = await adminClient
      .from('user_plan')
      .insert({
        user_id: users.id,
        plan: 'paid'
      })
      .select();

    if (error) {
      return res.json({ 
        error: 'Failed to insert',
        details: error,
        userId: users.id
      });
    }

    return res.json({ 
      success: true,
      data,
      userId: users.id
    });

  } catch (error) {
    return res.json({ 
      error: 'Unexpected error',
      details: error
    });
  }
} 