import { useEffect } from "react";
import { useRouter } from "next/router";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import Head from 'next/head';

export default function PostSignupToStripe() {
  const supabase = createClientComponentClient();
  const router = useRouter();

  useEffect(() => {
    const redirectToStripe = async () => {
      const { data: { user }, error } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      // Insert user profile into user_profiles table (if not already inserted)
      const profileData = {
        user_id: user.id,
        first_name: user.user_metadata?.first_name || '',
        last_name: user.user_metadata?.last_name || '',
        ...(user.user_metadata?.business_name && { business_name: user.user_metadata.business_name }),
        ...(user.user_metadata?.how_did_you_hear && { how_did_you_hear: user.user_metadata.how_did_you_hear })
      };

      await supabase.from("user_profiles").upsert(profileData);

      // Insert user into user_plan table (if not already inserted)
      await supabase.from("user_plan").upsert({
        user_id: user.id,
        plan: "free"
      });

      const res = await fetch("/api/stripe/create-checkout-session", {
        method: "POST",
        body: JSON.stringify({
          email: user.email,
          uid: user.id,
          name: user.user_metadata?.full_name || "NexSellPro User"
        }),
      });

      const { url } = await res.json();
      window.location.href = url;
    };

    redirectToStripe();
  }, []);

  return (
    <>
      <Head>
        <title>Redirecting to Stripe | NexSellPro</title>
      </Head>
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-700 px-4">
        <div className="card max-w-md w-full mx-auto p-8 md:p-10 glass animate-fadeIn shadow-xl text-center">
          <svg className="animate-spin h-12 w-12 text-accent mx-auto mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
          </svg>
          <h1 className="text-2xl font-bold mb-2 gradient-text">Setting up your account...</h1>
          <p className="text-gray-400">Redirecting to Stripe Checkout...</p>
        </div>
      </div>
    </>
  );
} 