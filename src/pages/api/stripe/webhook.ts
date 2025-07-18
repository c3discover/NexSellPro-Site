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
 * Handles paid user creation with complete email and user management
 * Creates new users or upgrades existing users to paid plan
 * @param email - User's email address
 * @param sessionId - Stripe session ID for tracking
 */
async function handlePaidUser(email: string, sessionId: string): Promise<void> {
  console.log('📋 Starting handlePaidUser for:', email);
  
  const adminClient = createSupabaseAdmin();
  
  try {
    // First, try to create the user
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
    
    if (createError && createError.message.includes('already been registered')) {
      // User already exists - just update their plan
      console.log('📊 User already exists, updating plan...');
      
      // Get the existing user's ID
      const { data: { users }, error: searchError } = await adminClient
        .auth
        .admin
        .listUsers();
      
      if (!searchError && users && users.length > 0) {
        const existingUser = users.find(user => user.email === email);
        
        if (!existingUser) {
          console.error('❌ User not found in list despite registration error');
          return;
        }
        
        // Update or insert user_plan
        const { error: planError } = await adminClient
          .from('user_plan')
          .upsert({
            user_id: existingUser.id,
            plan: 'paid',
            updated_at: new Date().toISOString()
          });
        
        if (planError) {
          console.error('❌ Error updating user plan:', planError.message);
        } else {
          console.log('✅ Existing user upgraded to paid plan');
          
          // Send a "payment successful" email (optional)
          // You could send a custom email here confirming their purchase
        }
      }
      return;
    } else if (createError) {
      // Some other error
      console.error('❌ Error creating user:', createError.message);
      return;
    }
    
    // New user created successfully
    console.log('✅ New user created:', newUser.user?.id);
    
    // Add to user_plan table
    if (newUser.user?.id) {
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
      
      // Send welcome email with password reset
      console.log('📧 Sending welcome email...');
      
      // This actually sends the email
      const { error: emailError } = await adminClient
        .auth
        .resetPasswordForEmail(email, {
          redirectTo: 'https://nexsellpro.com/setup-account'
        });
      
      if (emailError) {
        console.error('❌ Error sending welcome email:', emailError.message);
      } else {
        console.log('✅ Welcome email sent with password setup link');
      }
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
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
