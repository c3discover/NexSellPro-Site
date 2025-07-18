import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Only allow in development
  if (process.env.NODE_ENV === 'production') {
    return res.status(404).json({ error: 'Not found' });
  }

  console.log('🧪 Testing Supabase Admin Access...');

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  );

  const results = {
    timestamp: new Date().toISOString(),
    tests: {} as any
  };

  // Test 1: Can we query user_plan table?
  try {
    console.log('Test 1: Querying user_plan table...');
    const { data, error } = await supabaseAdmin
      .from('user_plan')
      .select('*')
      .limit(5);
    
    results.tests.userPlanQuery = {
      success: !error,
      rowCount: data?.length || 0,
      error: error?.message || null
    };
  } catch (e: any) {
    results.tests.userPlanQuery = {
      success: false,
      error: e.message
    };
  }

  // Test 2: Can we list auth users?
  try {
    console.log('Test 2: Listing auth users...');
    const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 5
    });
    
    results.tests.authUsersList = {
      success: !error,
      userCount: users?.length || 0,
      error: error?.message || null
    };
  } catch (e: any) {
    results.tests.authUsersList = {
      success: false,
      error: e.message
    };
  }

  // Test 3: Can we insert into user_plan? (dry run - will rollback)
  try {
    console.log('Test 3: Testing insert capability...');
    const testEmail = `test-${Date.now()}@example.com`;
    
    const { data, error } = await supabaseAdmin
      .from('user_plan')
      .insert({
        user_id: '00000000-0000-0000-0000-000000000000', // Fake UUID
        email: testEmail,
        plan: 'test'
      })
      .select();
    
    results.tests.insertCapability = {
      success: !error,
      error: error?.message || null
    };

    // If insert worked, delete it immediately
    if (data && data[0]) {
      await supabaseAdmin
        .from('user_plan')
        .delete()
        .eq('id', data[0].id);
    }
  } catch (e: any) {
    results.tests.insertCapability = {
      success: false,
      error: e.message
    };
  }

  console.log('🧪 Test Results:', results);
  res.status(200).json(results);
}