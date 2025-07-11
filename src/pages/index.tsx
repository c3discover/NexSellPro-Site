/**
 * @fileoverview Main landing page for NexSellPro
 * @author NexSellPro
 * @created 2024-03-27
 * @lastModified 2024-03-27
 */

////////////////////////////////////////////////
// Imports:
////////////////////////////////////////////////
import React from 'react';
import Head from 'next/head';
import Image from 'next/image';
import Link from 'next/link';

////////////////////////////////////////////////
// Types and Interfaces:
////////////////////////////////////////////////
// No additional types needed for this page

////////////////////////////////////////////////
// Page Component:
////////////////////////////////////////////////
export default function HomePage() {
  return (
    <>
      <Head>
        <title>NexSellPro - Smart Product Analysis for Walmart Marketplace Sellers</title>
        <meta name="description" content="Find profitable products instantly. NexSellPro analyzes Walmart listings to show profit, ROI, competition, and sales estimates. Join as a Founding Member for just $29." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      {/* Logo-first header with improved gradient and larger logo */}
      <header className="sticky top-0 z-30 h-20" style={{background: 'linear-gradient(90deg, #0a2540 0%, #0a2540 40%, #fff 100%)'}}>
        <nav className="container mx-auto flex items-center justify-between h-20 px-4" aria-label="Main navigation">
          <Link href="#hero" className="flex items-center group focus:outline-none ml-2">
            <Image
              src="/assets/color-logo.svg"
              alt="NexSellPro Logo"
              width={200}
              height={80}
              className="h-20 w-auto mr-0"
              style={{ maxWidth: '200px' }}
            />
          </Link>
          <ul className="hidden md:flex space-x-8 text-base font-medium">
            <li><Link href="#features" className="text-gray-900 hover:text-blue-600 transition-colors focus:outline-none focus:text-blue-700">Features</Link></li>
            <li><Link href="#how-it-works" className="text-gray-900 hover:text-blue-600 transition-colors focus:outline-none focus:text-blue-700">How It Works</Link></li>
            <li><Link href="#pricing" className="text-gray-900 hover:text-blue-600 transition-colors focus:outline-none focus:text-blue-700">Pricing</Link></li>
            <li><Link href="#faqs" className="text-gray-900 hover:text-blue-600 transition-colors focus:outline-none focus:text-blue-700">FAQs</Link></li>
          </ul>
          {/* Mobile login link */}
          <Link href="/login" className="md:hidden text-gray-900 hover:text-blue-600 transition-colors focus:outline-none focus:text-blue-700 font-medium">
            Login
          </Link>
        </nav>
      </header>

      <main className="min-h-screen bg-white">
        <HeroSection />
        <BenefitsSection />
        <FeaturesSection />
        <HowItWorksSection />
        <PricingSection />
        <TargetAudienceSection />
        <FAQSection />
        <FooterSection />
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
 * Hero Section - The first thing visitors see
 */
function HeroSection() {
  return (
    <section id="hero" className="bg-gradient-to-b from-slate-50 to-white px-4 py-16 md:py-24 scroll-mt-28">
      <div className="container mx-auto max-w-4xl text-center">
        {/* Main headline - make this compelling! */}
        <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
          Find Profitable Products in Seconds
        </h1>
        {/* Subheadline - explain the value */}
        <p className="text-xl md:text-2xl text-gray-600 mb-8 max-w-2xl mx-auto">
          NexSellPro analyzes Walmart Marketplace listings instantly, showing you 
          real profit margins, ROI, and competition data.
        </p>
        {/* Call-to-action buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-6">
          <Link 
            href="/signup" 
            className="inline-block bg-blue-600 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-blue-700 transition-colors shadow-lg"
          >
            Get Started - Free
          </Link>
          <Link 
            href="https://buy.stripe.com/bJeeVddD856nfzCc0b6Zy00" 
            className="inline-block bg-green-600 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-green-700 transition-colors shadow-lg"
          >
            Get Founding Member Access - $29
          </Link>
        </div>
        {/* Trust indicator and login banner */}
        <p className="mt-4 text-sm text-gray-500 mb-4">
          🚀 Built by sellers, for sellers • Limited time beta pricing
        </p>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 max-w-md mx-auto">
          <p className="text-sm text-blue-800">
            Already have an account? <Link href="/login" className="font-semibold hover:underline">Sign in here</Link>
          </p>
        </div>
      </div>
    </section>
  );
}

/**
 * Key Benefits Section - Why choose NexSellPro
 */
function BenefitsSection() {
  return (
    <section className="px-4 py-16">
      <div className="container mx-auto max-w-4xl">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-12 text-gray-900">
          Why Walmart Sellers Choose NexSellPro
        </h2>
        
        {/* Benefits grid - easy to scan */}
        <div className="grid md:grid-cols-3 gap-8">
          {/* Benefit 1 */}
          <div className="text-center">
            <div className="text-4xl mb-4">💰</div>
            <h3 className="text-xl font-semibold mb-2 text-gray-900">Instant Profit Analysis</h3>
            <p className="text-gray-700">
              See real profit margins, ROI, and fees calculated automatically. 
              Know if a product is worth selling before you buy.
            </p>
          </div>
          
          {/* Benefit 2 */}
          <div className="text-center">
            <div className="text-4xl mb-4">📊</div>
            <h3 className="text-xl font-semibold mb-2 text-gray-900">Sales Volume Estimates</h3>
            <p className="text-gray-700">
              Get monthly sales estimates and see buy box prices, competition 
              levels, and seller information at a glance.
            </p>
          </div>
          
          {/* Benefit 3 */}
          <div className="text-center">
            <div className="text-4xl mb-4">⚡</div>
            <h3 className="text-xl font-semibold mb-2 text-gray-900">Research 10x Faster</h3>
            <p className="text-gray-700">
              Analyze products in seconds, not minutes. Export profitable finds 
              to Google Sheets with one click.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

/**
 * Features Showcase Section - What's included
 */
function FeaturesSection() {
  return (
    <section id="features" className="px-4 py-16 bg-slate-50 scroll-mt-28">
      <div className="container mx-auto max-w-4xl">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-12 text-gray-900">
          Everything You Need to Find Winners
        </h2>
        
        {/* Features list */}
        <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
          <div className="flex items-start">
            <span className="text-blue-600 text-xl mr-3">✓</span>
            <div>
              <h3 className="font-semibold mb-1 text-gray-900">Real-Time Profit Calculator</h3>
              <p className="text-gray-700 text-sm">
                Factors in Walmart fees, shipping, and your costs
              </p>
            </div>
          </div>
          
          <div className="flex items-start">
            <span className="text-blue-600 text-xl mr-3">✓</span>
            <div>
              <h3 className="font-semibold mb-1 text-gray-900">Competition Analysis</h3>
              <p className="text-gray-700 text-sm">
                See who owns the buy box and seller performance
              </p>
            </div>
          </div>
          
          <div className="flex items-start">
            <span className="text-blue-600 text-xl mr-3">✓</span>
            <div>
              <h3 className="font-semibold mb-1 text-gray-900">Buy Gauge</h3>
              <p className="text-gray-700 text-sm">
                Product buyability based on your baseline metrics
              </p>
            </div>
          </div>
          
          <div className="flex items-start">
            <span className="text-blue-600 text-xl mr-3">✓</span>
            <div>
              <h3 className="font-semibold mb-1 text-gray-900">Google Sheets Export</h3>
              <p className="text-gray-700 text-sm">
                Build your product list with one-click exports
              </p>
            </div>
          </div>
          
          <div className="flex items-start">
            <span className="text-blue-600 text-xl mr-3">✓</span>
            <div>
              <h3 className="font-semibold mb-1 text-gray-900">Advanced Filters</h3>
              <p className="text-gray-700 text-sm">
                Filter by profit margin, ROI, price range, and more
              </p>
            </div>
          </div>
          
          <div className="flex items-start">
            <span className="text-blue-600 text-xl mr-3">✓</span>
            <div>
              <h3 className="font-semibold mb-1 text-gray-900">Works on Any Walmart Product Page</h3>
              <p className="text-gray-700 text-sm">
                No limits, no restrictions
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/**
 * How It Works Section - 3-step process
 */
function HowItWorksSection() {
  return (
    <section id="how-it-works" className="px-4 py-16 scroll-mt-28">
      <div className="container mx-auto max-w-4xl">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-12 text-gray-900">
          Start Finding Profitable Products Today
        </h2>
        
        {/* 3-step process */}
        <div className="space-y-8 md:space-y-0 md:flex md:space-x-8">
          {/* Step 1 */}
          <div className="flex-1 text-center">
            <div className="w-16 h-16 bg-blue-600 text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
              1
            </div>
            <h3 className="text-xl font-semibold mb-2 text-gray-900">Install Extension</h3>
            <p className="text-gray-700">
              Add NexSellPro to Chrome. Works instantly on Walmart.com
            </p>
          </div>
          
          {/* Step 2 */}
          <div className="flex-1 text-center">
            <div className="w-16 h-16 bg-blue-600 text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
              2
            </div>
            <h3 className="text-xl font-semibold mb-2 text-gray-900">Browse Products</h3>
            <p className="text-gray-700">
              Shop Walmart as normal. NexSellPro adds profit data automatically
            </p>
          </div>
          
          {/* Step 3 */}
          <div className="flex-1 text-center">
            <div className="w-16 h-16 bg-blue-600 text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
              3
            </div>
            <h3 className="text-xl font-semibold mb-2 text-gray-900">Find Winners</h3>
            <p className="text-gray-700">
              Spot profitable products instantly. Export your finds to sheets
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

/**
 * Pricing Section - Founding Member special
 */
function PricingSection() {
  return (
    <section id="pricing" className="px-4 py-16 bg-gradient-to-b from-white to-slate-50 scroll-mt-28">
      <div className="container mx-auto max-w-4xl">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-12 text-gray-900">
          Founding Member Special
        </h2>
        
        {/* Pricing card */}
        <div className="max-w-md mx-auto bg-white border-2 border-blue-600 rounded-lg shadow-xl p-8 text-center">
          <div className="text-sm font-semibold text-blue-600 mb-2">
            LIMITED BETA ACCESS
          </div>
          <h3 className="text-2xl font-bold mb-2 text-gray-900">Early Adopter Pricing</h3>
          <div className="text-5xl font-bold mb-4 text-gray-900">
            $29
            <span className="text-lg text-gray-500 line-through ml-2">$99</span>
          </div>
          <p className="text-gray-700 mb-6">
            Join now and lock in this price forever. Help shape the future 
            of NexSellPro with your feedback.
          </p>
          
          {/* What's included */}
          <ul className="text-left mb-8 space-y-2">
            <li className="flex items-start">
              <span className="text-green-500 mr-2">✓</span>
              <span className="text-gray-800">Lifetime access at this price</span>
            </li>
            <li className="flex items-start">
              <span className="text-green-500 mr-2">✓</span>
              <span className="text-gray-800">All current & future features</span>
            </li>
            <li className="flex items-start">
              <span className="text-green-500 mr-2">✓</span>
              <span className="text-gray-800">Priority support & training</span>
            </li>
            <li className="flex items-start">
              <span className="text-green-500 mr-2">✓</span>
              <span className="text-gray-800">Direct line to the founder</span>
            </li>
            <li className="flex items-start">
              <span className="text-green-500 mr-2">✓</span>
              <span className="text-gray-800">Vote on new features</span>
            </li>
          </ul>
          
          {/* CTA button */}
          <Link 
            href="https://buy.stripe.com/bJeeVddD856nfzCc0b6Zy00" 
            className="block w-full bg-blue-600 text-white py-4 rounded-lg text-lg font-semibold hover:bg-blue-700 transition-colors shadow-lg"
          >
            Claim Your Founding Member Spot
          </Link>
          
          <p className="mt-4 text-sm text-gray-600">
            One-time payment • Instant access • 30-day guarantee
          </p>
        </div>
      </div>
    </section>
  );
}

/**
 * Target Audience Section - Who it's for
 */
function TargetAudienceSection() {
  return (
    <section className="px-4 py-16">
      <div className="container mx-auto max-w-4xl">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-12 text-gray-900">
          Built for Serious Sellers
        </h2>
        
        <div className="grid md:grid-cols-3 gap-8 text-center">
          <div className="bg-slate-50 p-6 rounded-lg">
            <div className="text-3xl mb-3">📦</div>
            <h3 className="font-semibold mb-2 text-gray-900">Online Arbitrage Pros</h3>
            <p className="text-gray-700 text-sm">
              Source profitable products faster with instant ROI calculations
            </p>
          </div>
          
          <div className="bg-slate-50 p-6 rounded-lg">
            <div className="text-3xl mb-3">🏪</div>
            <h3 className="font-semibold mb-2 text-gray-900">Walmart Marketplace Sellers</h3>
            <p className="text-gray-700 text-sm">
              Analyze competition and find gaps in the market
            </p>
          </div>
          
          <div className="bg-slate-50 p-6 rounded-lg">
            <div className="text-3xl mb-3">💼</div>
            <h3 className="font-semibold mb-2 text-gray-900">E-commerce Businesses</h3>
            <p className="text-gray-700 text-sm">
              Scale product research and make data-driven decisions
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

/**
 * FAQ Section - Frequently asked questions
 */
function FAQSection() {
  return (
    <section id="faqs" className="px-4 py-16 bg-slate-50 scroll-mt-28">
      <div className="container mx-auto max-w-4xl">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-12 text-gray-900">
          Frequently Asked Questions
        </h2>
        
        {/* FAQ items */}
        <div className="space-y-6 max-w-2xl mx-auto">
          {/* Question 1 */}
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <h3 className="text-lg font-semibold mb-2 text-gray-900">
              Does this work on all Walmart pages?
            </h3>
            <p className="text-gray-700">
              Yes! NexSellPro works on Walmart Product Pages! Any product you browse on Walmart.com, we will show you the data.
            </p>
          </div>
          
          {/* Question 2 */}
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <h3 className="text-lg font-semibold mb-2 text-gray-900">
              How accurate are the profit calculations?
            </h3>
            <p className="text-gray-700">
              We use Walmart&apos;s official fee structure and update it regularly. You can 
              also customize your cost inputs for even more accurate calculations.
            </p>
          </div>
          
          {/* Question 3 */}
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <h3 className="text-lg font-semibold mb-2 text-gray-900">
              Is this a one-time payment or subscription?
            </h3>
            <p className="text-gray-700">
              The $29 Founding Member price is a one-time payment for lifetime access. 
              No monthly fees, no surprises. This special pricing is only available during beta.
            </p>
          </div>
          
          {/* Question 4 */}
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <h3 className="text-lg font-semibold mb-2 text-gray-900">
              Can I use this for retail arbitrage?
            </h3>
            <p className="text-gray-700">
              Absolutely! NexSellPro is perfect for comparing in-store prices to 
              Walmart.com. Many users scan products in stores and check profitability instantly.
            </p>
          </div>
          
          {/* Question 5 */}
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <h3 className="text-lg font-semibold mb-2 text-gray-900">
              Do you offer refunds?
            </h3>
            <p className="text-gray-700">
              Yes, we offer a 30-day money-back guarantee. If NexSellPro doesn&apos;t 
              help you find profitable products, we&apos;ll refund your purchase.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

/**
 * Footer Section - Final CTA and contact info
 */
function FooterSection() {
  return (
    <footer className="px-4 py-16 bg-gray-900 text-white">
      <div className="container mx-auto max-w-4xl text-center">
        {/* White logo above contact info */}
        <Image
          src="/assets/white-logo.svg"
          alt="NexSellPro Logo White"
          width={160}
          height={48}
          className="mx-auto mb-6 h-12 w-auto"
          style={{ maxWidth: '160px' }}
        />
        <h2 className="text-2xl font-bold mb-4">
          Ready to Level Up Your Product Research?
        </h2>
        <p className="mb-8 text-gray-300">
          Join smart sellers who are already finding winners with NexSellPro
        </p>
        
        {/* Final CTA */}
        <Link 
          href="https://buy.stripe.com/bJeeVddD856nfzCc0b6Zy00" 
          className="inline-block bg-white text-gray-900 px-8 py-4 rounded-lg text-lg font-semibold hover:bg-gray-100 transition-colors shadow-lg mb-8"
        >
          Get Started for $29
        </Link>
        
        {/* Contact info */}
        <div className="text-sm text-gray-400">
          <p>Questions? Email us at support@nexsellpro.com</p>
          <p className="mt-2">© 2024 NexSellPro. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}

////////////////////////////////////////////////
// Export:
////////////////////////////////////////////////
// Default export is already defined above