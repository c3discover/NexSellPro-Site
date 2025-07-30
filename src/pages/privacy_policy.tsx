import Head from "next/head";

export default function PrivacyPolicy() {
  return (
    <>
      <Head>
        <title>Privacy Policy | NexSellPro</title>
        <meta name="robots" content="noindex" />
      </Head>
      <div className="max-w-3xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold mb-6">Privacy Policy</h1>

        <p className="mb-4">
          This Privacy Policy explains how NexSellPro ("we", "us", or "our") collects, uses, and protects your information when you use our Chrome extension and related services.
        </p>

        <h2 className="text-xl font-semibold mt-6 mb-2">1. Information We Collect</h2>
        <p className="mb-4">
          NexSellPro does not collect personally identifiable information (PII) unless you explicitly provide it. We may collect the following:
        </p>
        <ul className="list-disc pl-6 mb-4">
          <li>Email address during signup (via Supabase)</li>
          <li>Extension feature usage (e.g. export, settings preferences)</li>
          <li>Local extension data (stored in your browser)</li>
        </ul>

        <h2 className="text-xl font-semibold mt-6 mb-2">2. How We Use Your Data</h2>
        <p className="mb-4">
          Data is used only to operate and improve the NexSellPro service. We do not sell your data. Some aggregate, anonymous usage data may be used to improve performance or identify bugs.
        </p>

        <h2 className="text-xl font-semibold mt-6 mb-2">3. Third-Party Services</h2>
        <p className="mb-4">
          We use third-party services including:
        </p>
        <ul className="list-disc pl-6 mb-4">
          <li>Supabase – for authentication and data storage</li>
          <li>Stripe – for payment processing</li>
          <li>Google – for optional Sheets integration</li>
        </ul>
        <p className="mb-4">
          These providers may collect their own data according to their privacy policies:
        </p>
        <ul className="list-disc pl-6 mb-4">
          <li><a href="https://supabase.com/privacy" target="_blank">Supabase Privacy Policy</a></li>
          <li><a href="https://stripe.com/privacy" target="_blank">Stripe Privacy Policy</a></li>
          <li><a href="https://policies.google.com/privacy" target="_blank">Google Privacy Policy</a></li>
        </ul>

        <h2 className="text-xl font-semibold mt-6 mb-2">4. Your Rights</h2>
        <p className="mb-4">
          You may request deletion of your personal data or revoke access by emailing us at <a href="mailto:support@nexsellpro.com" className="text-blue-600 underline">support@nexsellpro.com</a>.
        </p>

        <h2 className="text-xl font-semibold mt-6 mb-2">5. Contact</h2>
        <p className="mb-4">
          If you have questions, contact us at: <a href="mailto:support@nexsellpro.com" className="text-blue-600 underline">support@nexsellpro.com</a>
        </p>

        <p className="text-sm text-gray-500 mt-10">
          Last updated: July 30, 2025
        </p>
      </div>
    </>
  );
} 