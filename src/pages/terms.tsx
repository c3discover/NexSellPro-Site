import Head from "next/head";

export default function TermsOfService() {
  return (
    <>
      <Head>
        <title>Terms of Service | NexSellPro</title>
        <meta name="robots" content="noindex" />
      </Head>
      <div className="max-w-3xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold mb-6">Terms of Service</h1>

        <p className="mb-4">
          These Terms of Service ("Terms") govern your use of NexSellPro and related services ("Service"). By using our Service, you agree to be bound by these Terms.
        </p>

        <h2 className="text-xl font-semibold mt-6 mb-2">1. Use of Service</h2>
        <p className="mb-4">
          You may not reverse engineer, automate, or resell our extension. You may not use NexSellPro to violate the terms of Walmart or other platforms. We reserve the right to suspend accounts that violate our rules.
        </p>

        <h2 className="text-xl font-semibold mt-6 mb-2">2. Money-Back Policy</h2>
        <p className="mb-4">
          We offer a 30-day money-back policy for users who are unsatisfied. To request a refund, contact us within 30 days of purchase. We reserve the right to deny refunds in cases of abuse or excessive usage.
        </p>

        <h2 className="text-xl font-semibold mt-6 mb-2">3. Disclaimer of Warranties</h2>
        <p className="mb-4">
          The Service is provided "as-is" without warranties of any kind. We do not guarantee accuracy of ROI, profit, or pricing data. All outputs should be independently verified by the user.
        </p>

        <h2 className="text-xl font-semibold mt-6 mb-2">4. Limitation of Liability</h2>
        <p className="mb-4">
          We are not liable for damages arising from use of the Service, including lost profits, data loss, or business interruption. Maximum liability shall not exceed the fees paid in the previous 30 days.
        </p>

        <h2 className="text-xl font-semibold mt-6 mb-2">5. Changes to Terms</h2>
        <p className="mb-4">
          We may modify these Terms at any time. Continued use of the Service after changes means you accept the new Terms.
        </p>

        <h2 className="text-xl font-semibold mt-6 mb-2">6. Governing Law</h2>
        <p className="mb-4">
          These Terms are governed by the laws of the State of New York, USA. Any disputes shall be resolved in Monroe County, NY.
        </p>

        <h2 className="text-xl font-semibold mt-6 mb-2">7. Contact</h2>
        <p className="mb-4">
          For questions or disputes, contact us at <a href="mailto:support@nexsellpro.com" className="text-blue-600 underline">support@nexsellpro.com</a>
        </p>

        <p className="text-sm text-gray-500 mt-10">
          Last updated: July 30, 2025
        </p>
      </div>
    </>
  );
} 