/**
 * @fileoverview Thank you page for NexSellPro post-purchase
 * @author NexSellPro
 * @created 2025-07-02
 * @lastModified 2025-07-02
 */

////////////////////////////////////////////////
// Imports:
////////////////////////////////////////////////
import React from 'react';
import Head from 'next/head';
import Link from 'next/link';

////////////////////////////////////////////////
// Types and Interfaces:
////////////////////////////////////////////////
// No additional types needed for this page

////////////////////////////////////////////////
// Page Component:
////////////////////////////////////////////////
export default function ThankYouPage() {
  return (
    <>
      <Head>
        <title>Welcome to NexSellPro - Thank You!</title>
        <meta name="description" content="Thank you for becoming a NexSellPro Founding Member!" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        {/* This prevents search engines from indexing this page */}
        <meta name="robots" content="noindex, nofollow" />
      </Head>

      <main className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center px-4">
        <div className="max-w-2xl mx-auto text-center">
          <SuccessIcon />
          <ThankYouMessage />
          <NextStepsSection />
          <ImportantReminder />
          <SupportSection />
          <FinalMessage />
        </div>
      </main>
    </>
  );
}

////////////////////////////////////////////////
// State and Hooks:
////////////////////////////////////////////////
// No state management needed for this static page

////////////////////////////////////////////////
// Data Fetching:
////////////////////////////////////////////////
// export async function getStaticProps() {}
// export async function getServerSideProps() {}

////////////////////////////////////////////////
// Event Handlers:
////////////////////////////////////////////////
// No event handlers needed for this page

////////////////////////////////////////////////
// Helper Functions:
////////////////////////////////////////////////
// No helper functions needed for this page

////////////////////////////////////////////////
// Render Methods:
////////////////////////////////////////////////

/**
 * Success Icon - Visual confirmation of purchase
 */
function SuccessIcon() {
  return (
    <div className="mb-8">
      <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto">
        <svg className="w-12 h-12 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
        </svg>
      </div>
    </div>
  );
}

/**
 * Thank You Message - Main confirmation
 */
function ThankYouMessage() {
  return (
    <>
      {/* Main thank you message */}
      <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
        Welcome to NexSellPro!
      </h1>
      
      {/* Confirmation message */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
        <p className="text-lg font-semibold text-blue-900 mb-2">
          🎉 You are now a Founding Member!
        </p>
        <p className="text-blue-700">
          Thank you for believing in NexSellPro. Your early support means everything to us.
        </p>
      </div>
    </>
  );
}

/**
 * Next Steps Section - What happens after purchase
 */
function NextStepsSection() {
  return (
    <div className="bg-white rounded-lg shadow-lg p-8 mb-8 text-left">
      <h2 className="text-2xl font-bold mb-4 text-center">
        What Happens Next?
      </h2>
      
      {/* Step-by-step instructions */}
      <div className="space-y-4">
        {/* Step 1 */}
        <div className="flex items-start">
          <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white  rounded-full flex items-center justify-center text-sm font-bold mr-3">
            1
          </div>
          <div>
            <h3 className=" text-black font-bold mb-1">Check Your Email</h3>
            <p className="text-gray-600">
              We have sent your access instructions and login details to your email. 
              It should arrive within the next few minutes.
            </p>
          </div>
        </div>
        
        {/* Step 2 */}
        <div className="flex items-start">
          <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold mr-3">
            2
          </div>
          <div>
            <h3 className=" text-black font-bold mb-1">Join Our Discord</h3>
            <p className="text-gray-600">
              Connect with other Founding Members and get direct access to our team. 
              The Discord link is in your welcome email.
            </p>
          </div>
        </div>
        
        {/* Step 3 */}
        <div className="flex items-start">
          <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold mr-3">
            3
          </div>
          <div>
            <h3 className=" text-black font-bold mb-1">Install & Get Started</h3>
            <p className="text-gray-600">
              Follow the setup guide in your email to install NexSellPro and 
              start boosting your sales productivity today!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Important Reminder - Email check notice
 */
function ImportantReminder() {
  return (
    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-8">
      <p className="text-sm text-yellow-800">
        <strong>Didn&apos;t receive an email?</strong> Check your spam folder or 
        contact us at support@nexsellpro.com
      </p>
    </div>
  );
}

/**
 * Support Section - Help and navigation options
 */
function SupportSection() {
  return (
    <div className="text-center">
      <h3 className="text-lg font-semibold mb-2">Need Help?</h3>
      <p className="text-gray-600 mb-4">
        Our team is here to ensure you get the most out of NexSellPro.
      </p>
      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        {/* Email support */}
        <a 
          href="mailto:support@nexsellpro.com" 
          className="inline-block bg-gray-200 text-gray-800 px-6 py-3 rounded-lg font-medium hover:bg-gray-300 transition-colors"
        >
          📧 Email Support
        </a>
        
        {/* Back to home */}
        <Link 
          href="/" 
          className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
        >
          🏠 Back to Home
        </Link>
      </div>
    </div>
  );
}

/**
 * Final Message - Additional encouragement
 */
function FinalMessage() {
  return (
    <p className="mt-8 text-sm text-gray-500">
      P.S. Keep an eye on your inbox - we will be sharing exclusive Founding Member 
      perks and early feature previews!
    </p>
  );
}

////////////////////////////////////////////////
// Export:
////////////////////////////////////////////////
// Default export is already defined above 