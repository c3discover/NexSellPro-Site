import { NextApiRequest, NextApiResponse } from 'next';
import Stripe from 'stripe';
import { buffer } from 'micro';

// Initialize Stripe with the correct API version
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-06-30.basil', // Use current stable version
});

// Add debug logging
console.log('Webhook endpoint loaded. Environment check:', {
  hasStripeKey: !!process.env.STRIPE_SECRET_KEY,
  hasWebhookSecret: !!process.env.STRIPE_WEBHOOK_SECRET,
});

// CRITICAL: Disable body parsing - Next.js must NOT parse the body
export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Test endpoint for debugging (remove in production!)
  if (req.method === 'GET') {
    return res.status(200).json({ 
      status: 'Webhook endpoint active',
      hasStripeKey: !!process.env.STRIPE_SECRET_KEY,
      hasWebhookSecret: !!process.env.STRIPE_WEBHOOK_SECRET,
      webhookSecretPreview: process.env.STRIPE_WEBHOOK_SECRET?.substring(0, 10) + '...'
    });
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).end('Method Not Allowed');
  }

  // Get the signature from headers
  const sig = req.headers['stripe-signature'] as string;

  if (!sig) {
    console.error('Missing stripe-signature header');
    return res.status(400).json({ error: 'Missing stripe-signature header' });
  }

  let event: Stripe.Event;

  try {
    // IMPORTANT: Get the raw body as a buffer
    const buf = await buffer(req);
    const rawBody = buf.toString('utf8');
    
    console.log('Received webhook with signature:', sig.substring(0, 20) + '...');
    console.log('Body length:', rawBody.length);
    console.log('Using webhook secret:', process.env.STRIPE_WEBHOOK_SECRET?.substring(0, 10) + '...');
    
    // Construct the event using the raw body and signature
    event = stripe.webhooks.constructEvent(
      rawBody,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err: any) {
    console.error(`Webhook signature verification failed:`, err.message);
    console.error('Full error:', err);
    return res.status(400).json({ error: `Webhook Error: ${err.message}` });
  }

  // Log successful verification
  console.log('✅ Webhook verified, processing event:', event.type);

  // Handle the event
  try {
    switch (event.type) {
      case 'checkout.session.completed':
        const session = event.data.object as Stripe.Checkout.Session;
        
        // Log the successful checkout
        console.log('💰 Checkout completed!');
        console.log('Session ID:', session.id);
        console.log('Customer Email:', session.customer_email);
        console.log('Payment Status:', session.payment_status);
        
        // TODO: Add your business logic here
        // - Save to database
        // - Send welcome email
        // - Grant access to product
        // - etc.
        
        break;
      
      case 'payment_intent.succeeded':
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        console.log('💳 Payment succeeded:', paymentIntent.id);
        break;
      
      case 'payment_intent.payment_failed':
        const failedPayment = event.data.object as Stripe.PaymentIntent;
        console.log('❌ Payment failed:', failedPayment.id);
        break;
      
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }
  } catch (error) {
    console.error('Error processing webhook:', error);
    // Still return 200 to acknowledge receipt
  }

  // Always return 200 to acknowledge receipt of the event
  res.status(200).json({ received: true });
}