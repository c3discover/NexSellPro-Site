import Head from "next/head";

export default function Support() {
  return (
    <>
      <Head>
        <title>Support | NexSellPro</title>
        <meta name="robots" content="noindex" />
      </Head>
      <div className="max-w-2xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold mb-4">NexSellPro Support</h1>
        <p className="mb-4">
          If you're experiencing an issue with the extension, have questions, or need help with your account, feel free to reach out.
        </p>
        <p className="mb-4">
          💬 Email us at:{" "}
          <a href="mailto:support@nexsellpro.com" className="text-blue-600 underline">
            support@nexsellpro.com
          </a>
        </p>
        <p className="mb-4">
          We aim to respond to all inquiries within 1–2 business days.
        </p>
        <p className="text-sm text-gray-500 mt-10">Last updated: July 30, 2025</p>
      </div>
    </>
  );
} 