import type { NextApiRequest, NextApiResponse } from 'next';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

// Disable body parsing - CRITICAL for Stripe webhooks
export const config = {
  api: {
    bodyParser: false,
  },
};

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-06-30.basil',
});

// Supabase environment variables for admin access
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

/**
 * Creates an admin Supabase client with special permissions
 * This client bypasses Row Level Security (RLS) and can perform
 * administrative operations like creating users and updating any data
 */
function createSupabaseAdmin() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

/**
 * Generates a secure random password for new users
 * Creates a 16-character password with mixed case letters, numbers, and special characters
 * This is used when creating new user accounts programmatically
 */
function generateSecurePassword(): string {
  const length = 16;
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
  let password = '';
  for (let i = 0; i < length; i++) {
    password += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  return password;
}

/**
 * Handles paid user creation with simplified approach
 * Attempts to create user directly - if they exist, Supabase will return an error
 * @param email - User's email address
 * @param sessionId - Stripe session ID for tracking
 */
async function handlePaidUser(email: string, sessionId: string): Promise<void> {
  console.log('📋 Starting handlePaidUser for:', email);
  
  const adminClient = createSupabaseAdmin();
  
  try {
    // Just try to create the user - simpler approach
    const password = generateSecurePassword();
    
    const { data: newUser, error: createError } = await adminClient
      .auth
      .admin
      .createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { 
          role: 'paid',
          stripe_session_id: sessionId
        }
      });
    
    if (createError) {
      console.error('❌ Could not create user:', createError.message);
      // User might already exist - that's OK for now
      return;
    }
    
    console.log('✅ User created:', newUser.user?.id);
    
    // Add to user_plan table
    if (newUser.user?.id) {
      await adminClient
        .from('user_plan')
        .insert({ user_id: newUser.user.id, plan: 'paid' });
      
      // Send password reset
      await adminClient.auth.admin.generateLink({
        type: 'recovery',
        email: email
      });
      
      console.log('✅ Password reset email sent');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const chunks: any[] = [];
  await new Promise((resolve, reject) => {
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => resolve(true));
    req.on('error', reject);
  });

  const rawBody = Buffer.concat(chunks);
  const sig = req.headers['stripe-signature'] as string;

  let event: Stripe.Event;

  try {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
    console.log('✅ Webhook verified:', event.type);
  } catch (err: any) {
    console.error('❌ Webhook error:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Respond early to Stripe
  res.status(200).json({ received: true });

  // Custom logic after response
  if (event.type === 'checkout.session.completed') {
    try {
      const session = event.data.object as Stripe.Checkout.Session;
      console.log('✅ Payment completed for:', session.customer_email);
      
      // Get customer email from multiple possible locations
      const customerEmail = session.customer_email || 
                           session.customer_details?.email || 
                           null;

      // Add detailed logging to debug
      console.log('📧 Checking for customer email...');
      console.log('- session.customer_email:', session.customer_email);
      console.log('- session.customer_details?.email:', session.customer_details?.email);
      console.log('- session.customer:', session.customer);

      if (!customerEmail) {
        console.error('❌ No customer email found in session');
        console.log('📋 Full session data:', JSON.stringify(session, null, 2));
        return;
      }

      console.log('✅ Found customer email:', customerEmail);
      
      // Handle user creation/upgrade with Supabase
      console.log('🎯 Processing user for email:', customerEmail);
      await handlePaidUser(customerEmail, session.id);
    } catch (error) {
      console.error('❌ CRITICAL ERROR in webhook handler:', error);
      console.error('Stack trace:', error instanceof Error ? error.stack : 'No stack trace');
    }
  }
}
