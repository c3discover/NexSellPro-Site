import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

export const runtime = "edge";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-06-30.basil",
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  const sig = req.headers.get("stripe-signature")!;
  const body = await req.text();

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error("⚠️ Webhook signature verification failed.", err);
    return new NextResponse("Webhook Error", { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;

    const email = session.customer_details?.email;
    if (!email) {
      console.error("⚠️ Missing email in checkout session.");
      return new NextResponse("Missing email", { status: 400 });
    }

    const { data: user, error } = await supabase
      .from("users") // double check this matches your user table
      .select("id")
      .eq("email", email)
      .single();

    if (error || !user) {
      console.error("❌ Could not find user with email:", email, error);
      return new NextResponse("User not found", { status: 404 });
    }

    const { error: upsertError } = await supabase
      .from("user_plan")
      .upsert(
        {
          user_id: user.id,
          plan: "beta",
        },
        { onConflict: "user_id" }
      );

    if (upsertError) {
      console.error("❌ Failed to upsert plan:", upsertError);
      return new NextResponse("Database error", { status: 500 });
    }

    console.log(`✅ Beta plan activated for ${email}`);
  }

  return new NextResponse("Success", { status: 200 });
}
