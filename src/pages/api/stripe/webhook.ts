import { buffer } from 'micro'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

export const config = {
  api: {
    bodyParser: false,
  },
}

// Switch based on environment
const isTestMode = process.env.NODE_ENV !== 'production'

const stripe = new Stripe(
  isTestMode
    ? process.env.TEST_STRIPE_SECRET_KEY!
    : process.env.STRIPE_SECRET_KEY!,
  {
    apiVersion: '2025-06-30.basil',
  }
)

const webhookSecret = isTestMode
  ? process.env.TEST_STRIPE_WEBHOOK_SECRET!
  : process.env.STRIPE_WEBHOOK_SECRET!

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const webhookHandler = async (req: any, res: any) => {
  if (req.method !== 'POST') {
    return res.status(405).end('Method not allowed')
  }

  const sig = req.headers['stripe-signature']
  const buf = await buffer(req)

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(buf, sig!, webhookSecret)
  } catch (err: any) {
    console.error('❌ Webhook verification failed:', err.message)
    return res.status(400).send(`Webhook Error: ${err.message}`)
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session
    const customerEmail = session.customer_email
    const stripeCustomerId = session.customer as string

    if (!customerEmail || !stripeCustomerId) {
      console.warn('⚠️ Missing email or customer ID in session')
      return res.status(400).send('Missing required session data')
    }

    const { data, error } = await supabase
      .from('user_plan')
      .upsert(
        {
          email: customerEmail,
          plan: 'beta',
          stripe_customer_id: stripeCustomerId,
        },
        { onConflict: 'email' }
      )

    if (error) {
      console.error('❌ Supabase upsert error:', error)
      return res.status(500).send('Database error')
    }

    console.log('✅ user_plan updated:', data)
  }

  res.status(200).json({ received: true })
}

export default webhookHandler
