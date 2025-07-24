import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { signOut, getUserProfile, getUserPlan, type UserProfile, type UserPlan, checkAuthStatus } from '@/lib/supabase';
import type { User } from '@supabase/supabase-js';


export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [userPlan, setUserPlan] = useState<UserPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [signingOut, setSigningOut] = useState(false);

  // Environment-aware Stripe payment link (runtime evaluation)
  const isTesting = process.env.NEXT_PUBLIC_IS_TESTING === "true";
  const isProd = process.env.NODE_ENV === "production" && !isTesting;
  const stripeLink = isProd
    ? "https://buy.stripe.com/bJeeVddD856nfzCc0b6Zy00" // Live
    : "https://buy.stripe.com/test_bJeeVddD856nfzCc0b6Zy00"; // Test

  // Debug logging
  console.log(`Stripe link loaded in ${isProd ? "PRODUCTION (live mode)" : "TEST mode"}`);

  // Check authentication and load user data on page load
  useEffect(() => {
    async function checkAuthAndLoadData() {
      try {
        // Check authentication status first
        const authStatus = await checkAuthStatus();
        
        if (!authStatus.isAuthenticated || !authStatus.user) {
          // No valid session, redirect to login
  
          router.replace('/login');
          return;
        }

        // User is authenticated, set user data
        setUser(authStatus.user);
        
        // Fetch user profile and plan
        const [profile, plan] = await Promise.all([
          getUserProfile(authStatus.user.id),
          getUserPlan(authStatus.user.id)
        ]);
        setUserProfile(profile);
        setUserPlan(plan);
        
      } catch (error) {
        console.error('Failed to check authentication or load user data:', error);
        // On error, redirect to login for security
        router.replace('/login');
      } finally {
        setLoading(false);
      }
    }
    
    checkAuthAndLoadData();
  }, [router]);

  // Handle sign out
  async function handleSignOut() {
    setSigningOut(true);
    try {
      await signOut();
      router.replace('/');
    } catch (error) {
      console.error('Sign out failed:', error);
      setSigningOut(false);
    }
  }

  // Show loading spinner
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-700">
        <div className="text-center">
          <svg className="animate-spin h-12 w-12 text-accent mx-auto mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
          </svg>
          <p className="text-gray-300">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Dashboard | NexSellPro</title>
      </Head>
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-700">
        {/* Header */}
        <header className="bg-slate-800/50 backdrop-blur-lg border-b border-slate-700">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <h1 className="text-2xl font-bold gradient-text">NexSellPro Dashboard</h1>
                <span className="text-gray-400">|</span>
                <span className="text-gray-300">
                  Welcome, {userProfile?.first_name || user?.email}
                </span>
              </div>
              <div className="flex items-center space-x-3">
                {userPlan?.plan === 'free' && (
                  <a
                    href={stripeLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-primary px-4 py-2 text-sm font-medium"
                  >
                    Upgrade to Premium
                  </a>
                )}
                <button
                  onClick={handleSignOut}
                  disabled={signingOut}
                  className="btn-accent px-4 py-2 text-sm disabled:opacity-60"
                >
                  {signingOut ? 'Signing out...' : 'Sign Out'}
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto space-y-8">
            {/* Welcome Section */}
            <div className="card p-8">
              <h2 className="text-3xl font-bold mb-4 gradient-text">
                Welcome to NexSellPro, {userProfile?.first_name || 'there'}!
              </h2>
              <p className="text-gray-300 mb-6">
                You&rsquo;re all set up! Here&rsquo;s what you need to do next to start finding profitable products on Walmart Marketplace.
              </p>
              <div className="bg-accent/10 border border-accent/20 rounded-lg p-6 mb-6">
                <h3 className="text-xl font-semibold mb-3 text-accent">🚀 Next Steps</h3>
                <ol className="space-y-3 text-gray-300">
                  <li className="flex items-start">
                    <span className="bg-accent text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold mr-3 mt-0.5">1</span>
                    <div>
                      <strong>Download the Chrome Extension</strong>
                      <p className="text-sm text-gray-400 mt-1">Install our browser extension to analyze products directly on Walmart.com</p>
                    </div>
                  </li>
                  <li className="flex items-start">
                    <span className="bg-accent text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold mr-3 mt-0.5">2</span>
                    <div>
                      <strong>Browse Walmart Marketplace</strong>
                      <p className="text-sm text-gray-400 mt-1">Go to any product page and click the NexSellPro button to analyze it</p>
                    </div>
                  </li>
                  <li className="flex items-start">
                    <span className="bg-accent text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold mr-3 mt-0.5">3</span>
                    <div>
                      <strong>Export Profitable Finds</strong>
                      <p className="text-sm text-gray-400 mt-1">Save promising products to your dashboard and export to Google Sheets</p>
                    </div>
                  </li>
                </ol>
              </div>
              <a
                href="#extension-download"
                className="btn-primary inline-flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
                Download Chrome Extension
              </a>
            </div>

            {/* Founding Member Bonus Section - Only shown to founding member plan users */}
            {userPlan?.plan === 'founding' && (
              <div className="card p-8">
                <h2 className="text-2xl font-bold mb-4 gradient-text">
                  🎁 Founding Member Bonus
                </h2>
                <p className="text-gray-300 mb-6">
                  Thanks for being a founding member! Here&rsquo;s your exclusive bonus:
                </p>
                <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-lg p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="text-4xl">📖</div>
                      <div>
                        <h3 className="text-lg font-semibold text-white mb-1">
                          Ultimate Walmart Marketplace Guide
                        </h3>
                        <p className="text-gray-400 text-sm">
                          Exclusive strategies and insights for founding members
                        </p>
                      </div>
                    </div>
                    <a
                      href="/bonus/founding-member-guide.pdf"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-primary inline-flex items-center gap-2"
                    >
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                      Download Guide
                    </a>
                  </div>
                </div>
              </div>
            )}

            {/* Quick Stats */}
            <div className="grid md:grid-cols-3 gap-6">
              <div className="card p-6 text-center">
                <div className="text-3xl font-bold text-accent mb-2">0</div>
                <div className="text-gray-400">Products Analyzed</div>
              </div>
              <div className="card p-6 text-center">
                <div className="text-3xl font-bold text-green-400 mb-2">0</div>
                <div className="text-gray-400">Profitable Finds</div>
              </div>
              <div className="card p-6 text-center">
                <div className="text-3xl font-bold text-blue-400 mb-2">0</div>
                <div className="text-gray-400">Saved Products</div>
              </div>
            </div>

            {/* Extension Download Section */}
            <div id="extension-download" className="card p-8">
              <h3 className="text-2xl font-bold mb-4 gradient-text">Chrome Extension</h3>
              <p className="text-gray-300 mb-6">
                Our browser extension is the key to unlocking NexSellPro&rsquo;s power. Install it to start analyzing products instantly.
              </p>
              <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4 mb-6">
                <p className="text-yellow-400 text-sm">
                  <strong>Coming Soon!</strong> The Chrome extension is currently in development. 
                  You&rsquo;ll be notified as soon as it&rsquo;s ready for download.
                </p>
              </div>
              <button className="btn-primary opacity-60 cursor-not-allowed" disabled>
                Extension Coming Soon
              </button>
            </div>

            {/* Recent Activity */}
            <div className="card p-8">
              <h3 className="text-2xl font-bold mb-4 gradient-text">Recent Activity</h3>
              <div className="text-center py-8 text-gray-400">
                <div className="text-4xl mb-4">📊</div>
                <p>No activity yet. Start analyzing products to see your history here!</p>
              </div>
            </div>

            {/* Account Settings */}
            <div className="card p-8">
              <h3 className="text-2xl font-bold mb-4 gradient-text">Account Settings</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between py-3 border-b border-slate-700">
                  <div>
                    <div className="font-medium text-white">Name</div>
                    <div className="text-sm text-gray-400">
                      {userProfile?.first_name} {userProfile?.last_name}
                    </div>
                  </div>
                  <button className="text-accent hover:underline text-sm">Edit</button>
                </div>
                {userProfile?.business_name && (
                  <div className="flex items-center justify-between py-3 border-b border-slate-700">
                    <div>
                      <div className="font-medium text-white">Business Name</div>
                      <div className="text-sm text-gray-400">{userProfile.business_name}</div>
                    </div>
                    <button className="text-accent hover:underline text-sm">Edit</button>
                  </div>
                )}
                <div className="flex items-center justify-between py-3 border-b border-slate-700">
                  <div>
                    <div className="font-medium text-white">Email</div>
                    <div className="text-sm text-gray-400">{user?.email}</div>
                  </div>
                  <button className="text-accent hover:underline text-sm">Change</button>
                </div>
                <div className="flex items-center justify-between py-3 border-b border-slate-700">
                  <div>
                    <div className="font-medium text-white">Password</div>
                    <div className="text-sm text-gray-400">••••••••</div>
                  </div>
                  <button className="text-accent hover:underline text-sm">Change</button>
                </div>
                <div className="flex items-center justify-between py-3 border-b border-slate-700">
                  <div>
                    <div className="font-medium text-white">Subscription Plan</div>
                    <div className="text-sm text-accent font-medium">
                      {userPlan?.plan ? userPlan.plan.charAt(0).toUpperCase() + userPlan.plan.slice(1) : 'Free'}
                    </div>
                  </div>
                  <a
                    href={stripeLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-accent hover:underline text-sm"
                  >
                    Upgrade
                  </a>
                </div>
                <div className="flex items-center justify-between py-3">
                  <div>
                    <div className="font-medium text-white">Account Status</div>
                    <div className="text-sm text-green-400">Active</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </>
  );
} 