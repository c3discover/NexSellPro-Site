import type { NextApiRequest, NextApiResponse } from 'next';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

// ============================================
// CONFIGURATION
// ============================================

export const config = {
  api: {
    bodyParser: false, // CRITICAL: Stripe needs raw body
  },
};

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-06-30.basil',
});

// ============================================
// MAIN WEBHOOK HANDLER
// ============================================

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log('🚀 WEBHOOK CALLED AT:', new Date().toISOString());

  // Only accept POST requests
  if (req.method !== 'POST') {
    console.log('❌ Non-POST request rejected');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  console.log('🚀 Webhook received');

  // ============================================
  // STEP 1: Read the raw body (required by Stripe)
  // ============================================
  const chunks: any[] = [];
  const rawBody = await new Promise<Buffer>((resolve, reject) => {
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });

  // ============================================
  // STEP 2: Verify the webhook signature
  // ============================================
  const sig = req.headers['stripe-signature'] as string;
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      rawBody, 
      sig, 
      process.env.STRIPE_WEBHOOK_SECRET!
    );
    console.log('✅ Webhook verified:', event.type);
  } catch (err: any) {
    console.error('❌ Webhook verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // ============================================
  // STEP 3: Respond to Stripe immediately
  // This prevents timeouts
  // ============================================
  res.status(200).json({ received: true });

  // ============================================
  // STEP 4: Process the payment asynchronously
  // ============================================
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    
    // Extract email from session
    const email = session.customer_email || session.customer_details?.email;
    const customerName = session.customer_details?.name || '';
    
    // Split name into first and last
    const nameParts = customerName.split(' ');
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';
    
    if (!email) {
      console.error('❌ No email found in payment session');
      return;
    }

    console.log('📧 Processing payment for:', email);
    console.log('👤 Customer name:', customerName);

    // ============================================
    // STEP 5: Initialize Supabase Admin Client
    // ============================================
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!, // Service role key bypasses RLS
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    try {
      // ============================================
      // STEP 6: Check if user already exists in auth.users
      // ============================================
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
      }

      if (existingAuthUser) {
        // ============================================
        // CASE 1: User exists in auth - check/update user_plan
        // ============================================
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
        }
        
              } else {
          // ============================================
          // CASE 2: New user - create auth user first
          // ============================================
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
              source: 'stripe_payment'
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
            await sendPasswordResetEmail(supabaseAdmin, email);
          }
        }

      console.log('🎉 Webhook processing completed successfully');
      
    } catch (error) {
      console.error('❌ Fatal error in webhook:', error);
      // Don't throw - we already responded to Stripe
      // Consider sending to error tracking service (Sentry, etc)
    }
  }
}

// ============================================
// HELPER FUNCTIONS
// ============================================

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
 * Send password reset email with retry logic
 */
async function sendPasswordResetEmail(supabaseAdmin: any, email: string): Promise<void> {
  console.log('📨 Sending password reset email...');
  
  try {
    // Note: resetPasswordForEmail uses the PUBLIC client methods
    // So we need to use the standard auth methods, not admin
    const { error } = await supabaseAdmin.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL || 'https://nexsellpro.com'}/reset-password`
    });

    if (error) {
      console.error('❌ Error sending reset email:', error);
      
      // Retry once after a delay
      console.log('🔄 Retrying email send...');
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const { error: retryError } = await supabaseAdmin.auth.resetPasswordForEmail(email, {
        redirectTo: `${process.env.NEXT_PUBLIC_APP_URL || 'https://nexsellpro.com'}/reset-password`
      });
      
      if (retryError) {
        console.error('❌ Retry failed:', retryError);
        throw retryError;
      }
    }

    console.log('✅ Password reset email sent successfully');
  } catch (error) {
    console.error('❌ Failed to send password reset email:', error);
    // Don't throw - payment was successful, this is a secondary action
  }
}