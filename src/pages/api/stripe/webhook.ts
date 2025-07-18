import { buffer } from 'micro'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

export const config = {
  api: {
    bodyParser: false,
  },
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-06-30.basil', // Match the webhook API version
})

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
    event = stripe.webhooks.constructEvent(
      buf,
      sig!,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message)
    return res.status(400).send(`Webhook Error: ${err.message}`)
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session
    const customerEmail = session.customer_email
    const stripeCustomerId = session.customer as string

    if (!customerEmail || !stripeCustomerId) {
      console.warn('Missing email or customer ID from session')
      return res.status(400).send('Invalid session payload')
    }

    // Create user_plan row if not exists
    const { data, error } = await supabase
      .from('user_plan')
      .upsert(
        {
          id: stripeCustomerId, // TEMPORARY: replace with Supabase UID later if known
          email: customerEmail,
          plan: 'beta',
          stripe_customer_id: stripeCustomerId,
        },
        { onConflict: 'email' }
      )

    if (error) {
      console.error('Supabase upsert error:', error)
      return res.status(500).send('Database error')
    }

    console.log('✅ user_plan row updated:', data)
  }

  res.status(200).json({ received: true })
}

export default webhookHandler