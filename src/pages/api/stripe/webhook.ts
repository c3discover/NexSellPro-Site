// In src/pages/api/stripe/webhook.ts
// Fixes: Stripe webhook missing customer info

import type { NextApiRequest, NextApiResponse } from "next";
import { buffer } from "micro";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

export const config = {
  api: {
    bodyParser: false,
  },
};

const stripe = new Stripe(process.env.NEXT_PUBLIC_IS_TESTING === "true"
  ? process.env.TEST_STRIPE_SECRET_KEY!
  : process.env.STRIPE_SECRET_KEY!,
  { apiVersion: "2025-06-30.basil" }
);

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const webhookSecret = process.env.NEXT_PUBLIC_IS_TESTING === "true"
  ? process.env.TEST_STRIPE_WEBHOOK_SECRET!
  : process.env.STRIPE_WEBHOOK_SECRET!;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).end("Method Not Allowed");
  }

  const buf = await buffer(req);
  const sig = req.headers["stripe-signature"] as string;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(buf, sig, webhookSecret);
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return res.status(400).send(`Webhook Error: ${err instanceof Error ? err.message : "Unknown error"}`);
  }

  // Expand customer in the session object
  if (event.type === "checkout.session.completed") {
    const session = await stripe.checkout.sessions.retrieve(
      event.data.object.id,
      {
        expand: ["customer"],
      }
    );

    const customer = session.customer as Stripe.Customer;
    const email = session.customer_details?.email || customer.email;
    const stripeCustomerId = session.customer?.toString();

    if (!stripeCustomerId || !email) {
      console.error("Missing Stripe customer info", { stripeCustomerId, email });
      return res.status(400).json({ error: "Missing Stripe customer info" });
    }

    const { error } = await supabase.from("user_plan").insert([
      {
        email,
        plan: "founding",
        stripe_customer_id: stripeCustomerId,
      },
    ]);

    if (error) {
      console.error("Supabase insert error:", error);
      return res.status(500).json({ error: "Database insert failed" });
    }

    return res.status(200).json({ received: true });
  }

  return res.status(200).json({ received: true });
}
