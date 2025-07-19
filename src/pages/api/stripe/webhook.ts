// webhook.ts
// Stripe webhook handler that listens for checkout.session.completed and updates Supabase

import type { NextApiRequest, NextApiResponse } from "next"
import { buffer } from "micro"
import Stripe from "stripe"
import { createClient } from "@supabase/supabase-js"

export const config = {
  api: {
    bodyParser: false,
  },
}

// Environment-aware Stripe configuration
const isTesting = process.env.NEXT_PUBLIC_IS_TESTING === "true";
const isProd = process.env.NODE_ENV === "production" && !isTesting;

const stripe = new Stripe(
  isProd ? process.env.STRIPE_SECRET_KEY! : process.env.TEST_STRIPE_SECRET_KEY!,
  {
    apiVersion: "2025-06-30.basil",
  }
)

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const webhookSecret = isProd
  ? process.env.STRIPE_WEBHOOK_SECRET!
  : process.env.TEST_STRIPE_WEBHOOK_SECRET!

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end("Method Not Allowed")

  const buf = await buffer(req)
  const sig = req.headers["stripe-signature"]

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(buf.toString(), sig as string, webhookSecret)
  } catch (err: any) {
    console.error("Webhook signature verification failed:", err)
    return res.status(400).send(`Webhook Error: ${err.message}`)
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session
    const email = session.customer_details?.email

    if (!email) {
      console.warn("No email found in Stripe session")
      return res.status(400).send("Missing email")
    }

    const { data: existingUser, error: fetchError } = await supabase
      .from("user_plan")
      .select("email")
      .eq("email", email)
      .single();

    if (!existingUser) {
      // Invite the user if they haven't signed up
      const { error: inviteError } = await supabase.auth.admin.inviteUserByEmail(email, {
        redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/signup?fromStripe=true`,
      });

      if (inviteError) {
        console.error("Failed to send invite:", inviteError.message);
        return res.status(500).json({ error: "Failed to invite user" });
      }

      console.log("Invite email sent to:", email);
    }

    const { error } = await supabase.from("user_plan").upsert({
      email: email.toLowerCase(),
      plan: "beta",
      is_paid: true,
      stripe_customer_id: session.customer as string,
      last_updated: new Date().toISOString()
    })

    if (error) {
      console.error("Supabase insert error:", error)
      return res.status(500).send("Supabase error")
    }

    console.log("✅ User synced:", email)
  }

  res.status(200).json({ received: true })
}
