/**
 * Test Webhook Endpoint
 * 
 * This endpoint allows manual testing of the webhook logic without going through Stripe.
 * It simulates a successful payment and processes it using the same logic as the real webhook.
 * 
 * WARNING: This should only be used in development/testing environments.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

interface TestWebhookRequest {
  email: string;
  firstName?: string;
  lastName?: string;
  customerName?: string;
}

interface TestWebhookResponse {
  success: boolean;
  message: string;
  data?: {
    userId?: string;
    plan?: string;
    email?: string;
  };
  error?: string;
}

// Initialize Supabase Admin Client
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

/**
 * Generate a secure temporary password
 */
function generateSecurePassword(): string {
  const length = 16;
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
  let password = '';
  
  // Ensure at least one of each required character type
  password += 'A'; // Uppercase
  password += 'a'; // Lowercase
  password += '1'; // Number
  password += '!'; // Special
  
  // Fill the rest randomly
  for (let i = password.length; i < length; i++) {
    password += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  
  // Shuffle the password
  return password.split('').sort(() => Math.random() - 0.5).join('');
}

/**
 * Send password reset email
 */
async function sendPasswordResetEmail(email: string): Promise<void> {
  console.log('📨 Sending password reset email...');
  
  try {
    const { error } = await supabaseAdmin.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL || 'https://nexsellpro.com'}/reset-password`
    });

    if (error) {
      console.error('❌ Error sending reset email:', error);
      throw error;
    }

    console.log('✅ Password reset email sent successfully');
  } catch (error) {
    console.error('❌ Failed to send password reset email:', error);
    throw error;
  }
}

/**
 * Process payment simulation (same logic as real webhook)
 */
async function processPaymentSimulation(email: string, firstName: string, lastName: string): Promise<{ userId?: string; plan: string; email: string }> {
  console.log('🚀 Processing test payment for:', email);
  console.log('👤 Customer name:', `${firstName} ${lastName}`);

  // Check if user already exists in auth.users
  console.log('🔍 Checking if user exists in auth.users...');
  
  let existingAuthUser = null;
  let listError = null;

  try {
    // Get all users and find by email
    const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 1000
    });
    
    listError = error;
    
    if (!error && users) {
      existingAuthUser = users.find((user: any) => user.email === email);
    }
    
    console.log('📊 Auth users query response:', {
      totalUsers: users?.length || 0,
      foundUser: !!existingAuthUser,
      error: listError?.message || 'none'
    });
  } catch (queryError) {
    console.error('💥 Auth users query threw exception:', queryError);
    listError = queryError;
  }

  if (listError) {
    console.error('❌ Error checking auth users:', {
      message: (listError as any).message,
      details: (listError as any).details,
      hint: (listError as any).hint,
      code: (listError as any).code
    });
    throw new Error(`Failed to check auth users: ${(listError as any).message}`);
  }

  if (existingAuthUser) {
    // User exists in auth - check/update user_plan
    console.log('👤 User exists in auth, checking user_plan...', {
      userId: existingAuthUser.id,
      email: existingAuthUser.email
    });
    
    // Check if user has a plan record
    const { data: existingPlan, error: planError } = await supabaseAdmin
      .from('user_plan')
      .select('user_id, plan')
      .eq('user_id', existingAuthUser.id)
      .single();

    if (planError && planError.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('❌ Error checking user plan:', planError);
      throw planError;
    }

    if (existingPlan) {
      // Update existing plan
      const { error: updateError } = await supabaseAdmin
        .from('user_plan')
        .update({ 
          plan: 'premium',
          updated_at: new Date().toISOString()
        })
        .eq('user_id', existingAuthUser.id);

      if (updateError) {
        console.error('❌ Error updating user plan:', updateError);
        throw updateError;
      }

      console.log('✅ Existing user plan updated to premium');
      return { userId: existingAuthUser.id, plan: 'premium', email };
    } else {
      // Insert new plan record
      const { error: insertError } = await supabaseAdmin
        .from('user_plan')
        .insert({
          user_id: existingAuthUser.id,
          plan: 'premium'
        });

      if (insertError) {
        console.error('❌ Error inserting user plan:', insertError);
        throw insertError;
      }

      console.log('✅ Added user plan record for existing auth user');
      return { userId: existingAuthUser.id, plan: 'premium', email };
    }
    
  } else {
    // New user - create auth user first
    console.log('🆕 Creating new user...');
    
    // Generate a secure temporary password
    const tempPassword = generateSecurePassword();
    
    // Create auth user
    const { data: authData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: tempPassword,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        first_name: firstName,
        last_name: lastName,
        source: 'test_webhook'
      }
    });

    if (createError) {
      console.error('❌ Error creating auth user:', createError);
      throw createError;
    }

    if (authData?.user) {
      // New user created successfully
      console.log('✅ Auth user created:', authData.user.id);
      
      // Insert into user_plan table
      const { error: insertError } = await supabaseAdmin
        .from('user_plan')
        .insert({
          user_id: authData.user.id,
          plan: 'premium'
        });

      if (insertError) {
        console.error('❌ Error inserting user_plan:', insertError);
        throw insertError;
      }

      console.log('✅ User added to user_plan table');
      
      // Send password reset email for new users
      await sendPasswordResetEmail(email);
      
      return { userId: authData.user.id, plan: 'premium', email };
    }
  }

  throw new Error('Unexpected error in payment processing');
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<TestWebhookResponse>
) {
  // SECURITY: Block this endpoint in production
  if (process.env.NODE_ENV === 'production') {
    return res.status(404).json({ 
      success: false, 
      message: 'Test endpoint not available in production' 
    });
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      success: false, 
      message: 'Method Not Allowed. Only POST requests are supported.' 
    });
  }

  try {
    const { email, firstName = 'Test', lastName = 'User', customerName }: TestWebhookRequest = req.body;

    // Validate required fields
    if (!email) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email is required' 
      });
    }

    if (!email.includes('@')) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid email format' 
      });
    }

    console.log('🧪 Starting test webhook simulation...');
    console.log('📧 Email:', email);
    console.log('👤 Name:', `${firstName} ${lastName}`);

    // Process the payment simulation
    const result = await processPaymentSimulation(email, firstName, lastName);

    console.log('🎉 Test webhook processing completed successfully');

    return res.status(200).json({
      success: true,
      message: 'Test webhook processed successfully',
      data: result
    });

  } catch (error) {
    console.error('❌ Test webhook error:', error);
    
    return res.status(500).json({
      success: false,
      message: 'Test webhook processing failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
} 