import Stripe from 'stripe';

// Environment-aware Stripe configuration
const isTesting = process.env.NEXT_PUBLIC_IS_TESTING === "true";
const isProd = process.env.NODE_ENV === "production" && !isTesting;

const stripe = new Stripe(
  isProd ? process.env.STRIPE_SECRET_KEY! : process.env.TEST_STRIPE_SECRET_KEY!,
  {
    apiVersion: '2025-06-30.basil',
  }
);

export default stripe; 