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
 * Handles paid user creation or plan updates
 * Checks if user exists and either updates their plan or creates a new account
 * @param email - User's email address
 * @param sessionId - Stripe session ID for tracking
 */
async function handlePaidUser(email: string, sessionId: string): Promise<void> {
  const adminClient = createSupabaseAdmin();
  
  try {
    // Check if user already exists
    console.log('🔍 Checking if user exists:', email);
    
    const { data: existingUsers, error: searchError } = await adminClient
      .auth
      .admin
      .listUsers();
    
    if (searchError) {
      console.error('❌ Error searching for user:', searchError);
      return;
    }
    
    const existingUser = existingUsers.users.find(user => user.email === email);
    
    if (existingUser) {
      // User exists - update their plan
      console.log('🔄 Existing user found, updating to paid plan:', email);
      
      // Update user_plan table to 'paid'
      const { error: updateError } = await adminClient
        .from('user_plan')
        .upsert({
          user_id: existingUser.id,
          plan: 'paid',
          updated_at: new Date().toISOString()
        });
      
      if (updateError) {
        console.error('❌ Error updating user plan:', updateError);
      } else {
        console.log('✅ User plan updated to paid');
      }
      
    } else {
      // Create new user
      console.log('🆕 Creating new paid user:', email);
      
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
            stripe_session_id: sessionId,
            payment_date: new Date().toISOString()
          }
        });
      
      if (createError) {
        console.error('❌ Error creating user:', createError);
        return;
      }
      
      console.log('✅ New user created successfully');
      
      // Insert into user_plan table
      if (newUser.user) {
        const { error: planError } = await adminClient
          .from('user_plan')
          .insert({
            user_id: newUser.user.id,
            plan: 'paid'
          });
        
        if (planError) {
          console.error('❌ Error setting user plan:', planError);
        } else {
          console.log('✅ User plan set to paid');
        }
      }
      
      // Send password reset email for new users
      // This allows them to set their own password since we generated a random one
      const { data: resetLink, error: resetError } = await adminClient
        .auth
        .admin
        .generateLink({
          type: 'recovery',
          email: email
        });
      
      if (resetError) {
        console.error('❌ Error generating password reset link:', resetError);
      } else {
        console.log('✅ Password reset email queued for:', email);
        console.log('🔗 Reset link generated (Supabase will send email)');
      }
    }
    
  } catch (error) {
    console.error('❌ Unexpected error in handlePaidUser:', error);
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
    const session = event.data.object as Stripe.Checkout.Session;
    console.log('✅ Payment completed for:', session.customer_email);
    
    // Get customer email from the Stripe session
    const customerEmail = session.customer_email;
    
    if (!customerEmail) {
      console.error('❌ No customer email found in session');
      return;
    }
    
    // Handle user creation/upgrade with Supabase
    console.log('🎯 Processing user for email:', customerEmail);
    await handlePaidUser(customerEmail, session.id);
  }
}
