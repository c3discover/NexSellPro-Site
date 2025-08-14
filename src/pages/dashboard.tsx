import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { signOut, getUserProfile, getUserPlan, type UserProfile, type UserPlan, checkAuthStatus } from '@/lib/supabase';
import { notifyExtensionLogout } from '@/lib/auth-helpers';
import type { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

// Chrome extension types
declare global {
  interface Window {
    chrome?: {
      runtime?: {
        sendMessage?: (extensionId: string, message: any, callback?: (response: any) => void) => void;
        lastError?: { message: string };
      };
    };
  }
}

const chrome = typeof window !== 'undefined' ? window.chrome : undefined;

const EXTENSION_ID = 'oeoabefdhedmaeoghdmbcechbiepmfpc';



// Function to update user status in database
async function updateUserStatus(email: string) {
  try {
    const { error } = await supabase
      .from('user_plan')
      .update({ 
        status: 'active',
        last_login: new Date().toISOString()
      })
      .eq('email', email.toLowerCase());
      
    if (error) {
      console.error('[NexSellPro] Error updating status:', error);
    } else {
      console.log('[NexSellPro] User status set to active');
    }
  } catch (err) {
    console.error('[NexSellPro] Failed to update status:', err);
  }
}


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
        
        // Debug logging for plan data
        console.log('[Dashboard] User plan data:', {
          userId: authStatus.user.id,
          plan: plan,
          planType: plan?.plan,
          isFounding: plan?.plan?.toLowerCase() === 'founding'
        });
        
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

  // Send user info to extension
  useEffect(() => {
    if (user?.email && userPlan) {
      console.log('[NexSellPro] Attempting to sync with extension...');
      
      // Check if extension messaging is available
      if (chrome?.runtime?.sendMessage) {
        // Send auth data to extension
        chrome.runtime.sendMessage!(
          EXTENSION_ID,
          {
            type: 'AUTH_SUCCESS',
            data: {
              userId: user.id,
              email: user.email,
              plan: userPlan.plan?.toLowerCase() || 'free',
              firstName: userProfile?.first_name || '',
              lastName: userProfile?.last_name || '',
              authenticatedAt: new Date().toISOString()
            }
          },
          (response) => {
            if (chrome.runtime?.lastError) {
              console.log('[NexSellPro] Extension not detected:', chrome.runtime.lastError.message);
            } else {
              console.log('[NexSellPro] Extension sync successful!', response);
            }
          }
        );
      } else {
        console.log('[NexSellPro] Chrome extension API not available');
      }
    }
  }, [user, userPlan, userProfile]);

  // Handle sign out
  async function handleSignOut() {
    setSigningOut(true);
    try {
      // Notify extension about logout
      if (chrome?.runtime?.sendMessage) {
        chrome.runtime.sendMessage(
          EXTENSION_ID,
          { type: 'LOGOUT' },
          (response) => {
            console.log('[NexSellPro] Extension notified of logout', response);
          }
        );
      }
      
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
                {userPlan?.plan?.toLowerCase() === 'free' && (
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
            <div className="card p-8 bg-gradient-to-br from-slate-800/50 to-slate-700/50 border border-slate-600/30">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h2 className="text-3xl font-bold mb-2 gradient-text">
                    Welcome to NexSellPro, {userProfile?.first_name || 'there'}! 🎉
                  </h2>
                  <p className="text-gray-300 text-lg">
                    You're ready to unlock profitable products on Walmart Marketplace
                  </p>
                </div>
                <div className="flex items-center space-x-2 bg-green-500/20 border border-green-500/30 rounded-full px-4 py-2">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                  <span className="text-green-400 text-sm font-medium">Active</span>
                </div>
              </div>

              {/* Plan Status */}
              <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20 rounded-lg p-6 mb-6">
                <div className="flex items-center justify-between">
                  <div>
                                         <h3 className="text-xl font-semibold text-white mb-1">
                       {userPlan?.plan?.toLowerCase() === 'founding' ? '🎯 Founding Member' : '🚀 Free Plan'}
                     </h3>
                                         <p className="text-gray-300">
                       {userPlan?.plan?.toLowerCase() === 'founding' 
                         ? 'Full access to all features until launch' 
                         : 'Basic features available - upgrade for full access'
                       }
                     </p>
                  </div>
                  {userPlan?.plan?.toLowerCase() === 'free' && (
                    <a
                      href={stripeLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-primary px-4 py-2 text-sm font-medium"
                    >
                      Upgrade to Founding Member
                    </a>
                  )}
                </div>
              </div>

              {/* Quick Start Guide */}
              <div className="bg-accent/10 border border-accent/20 rounded-lg p-6 mb-6">
                <h3 className="text-xl font-semibold mb-4 text-accent flex items-center">
                  <span className="mr-2">⚡</span>
                  Get Started in 3 Steps
                </h3>
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-slate-700/50 rounded-lg">
                    <div className="w-12 h-12 bg-accent text-white rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-3">1</div>
                    <h4 className="font-semibold text-white mb-2">Install Extension</h4>
                    <p className="text-sm text-gray-400">Add NexSellPro to Chrome for instant analysis</p>
                  </div>
                  <div className="text-center p-4 bg-slate-700/50 rounded-lg">
                    <div className="w-12 h-12 bg-accent text-white rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-3">2</div>
                    <h4 className="font-semibold text-white mb-2">Browse Products</h4>
                    <p className="text-sm text-gray-400">Visit any Walmart product page to analyze</p>
                  </div>
                  <div className="text-center p-4 bg-slate-700/50 rounded-lg">
                    <div className="w-12 h-12 bg-accent text-white rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-3">3</div>
                    <h4 className="font-semibold text-white mb-2">Find Winners</h4>
                    <p className="text-sm text-gray-400">Export profitable finds to Google Sheets</p>
                  </div>
                </div>
              </div>

              <a
                href="#extension-download"
                className="btn-primary inline-flex items-center gap-2 text-lg px-6 py-3"
              >
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
                Download Chrome Extension
              </a>
            </div>

            {/* Feature Access Section */}
            <div className="card p-8 bg-gradient-to-br from-slate-800/50 to-slate-700/50 border border-slate-600/30">
              <h3 className="text-2xl font-bold mb-6 gradient-text flex items-center">
                <span className="mr-3">🎯</span>
                Your Feature Access
              </h3>
              
              <div className="grid md:grid-cols-2 gap-8">
                {/* Free Features */}
                <div className="bg-slate-700/30 rounded-lg p-6">
                  <h4 className="text-lg font-semibold text-white mb-4 flex items-center">
                    <span className="mr-2">🚀</span>
                    Free Features
                  </h4>
                  <ul className="space-y-3">
                    <li className="flex items-start">
                      <span className="text-green-400 mr-3 mt-1">✓</span>
                      <div>
                        <span className="text-white font-medium">Product Overview</span>
                        <p className="text-sm text-gray-400">Basic product information and pricing</p>
                      </div>
                    </li>
                    <li className="flex items-start">
                      <span className="text-green-400 mr-3 mt-1">✓</span>
                      <div>
                        <span className="text-white font-medium">Profit Calculator</span>
                        <p className="text-sm text-gray-400">Calculate profit margins and ROI</p>
                      </div>
                    </li>
                    <li className="flex items-start">
                      <span className="text-green-400 mr-3 mt-1">✓</span>
                      <div>
                        <span className="text-white font-medium">Basic Analysis</span>
                        <p className="text-sm text-gray-400">Limited competition data</p>
                      </div>
                    </li>
                  </ul>
                </div>

                {/* Premium Features */}
                <div className="bg-gradient-to-br from-accent/10 to-blue-500/10 border border-accent/20 rounded-lg p-6">
                  <h4 className="text-lg font-semibold text-white mb-4 flex items-center">
                    <span className="mr-2">⭐</span>
                    {userPlan?.plan === 'founding' ? 'Founding Member Features' : 'Premium Features'}
                  </h4>
                  <ul className="space-y-3">
                    <li className="flex items-start">
                      <span className="text-accent mr-3 mt-1">✓</span>
                      <div>
                        <span className="text-white font-medium">Buy Gauge</span>
                        <p className="text-sm text-gray-400">Proprietary scoring system</p>
                      </div>
                    </li>
                    <li className="flex items-start">
                      <span className="text-accent mr-3 mt-1">✓</span>
                      <div>
                        <span className="text-white font-medium">Advanced Analysis</span>
                        <p className="text-sm text-gray-400">Complete competition breakdown</p>
                      </div>
                    </li>
                    <li className="flex items-start">
                      <span className="text-accent mr-3 mt-1">✓</span>
                      <div>
                        <span className="text-white font-medium">Google Sheets Export</span>
                        <p className="text-sm text-gray-400">One-click data export</p>
                      </div>
                    </li>
                    <li className="flex items-start">
                      <span className="text-accent mr-3 mt-1">✓</span>
                      <div>
                        <span className="text-white font-medium">Product Variations</span>
                        <p className="text-sm text-gray-400">Analyze all product variants</p>
                      </div>
                    </li>
                    <li className="flex items-start">
                      <span className="text-accent mr-3 mt-1">✓</span>
                      <div>
                        <span className="text-white font-medium">Listing Export</span>
                        <p className="text-sm text-gray-400">Export optimized listings</p>
                      </div>
                    </li>
                  </ul>
                  
                  {userPlan?.plan?.toLowerCase() === 'free' && (
                    <div className="mt-6 pt-4 border-t border-accent/20">
                      <a
                        href={stripeLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-primary w-full text-center"
                      >
                        Upgrade to Founding Member - $29
                      </a>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Founding Member Bonus Section - Only shown to founding member plan users */}
            {userPlan?.plan?.toLowerCase() === 'founding' && (
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
              <div className="card p-6 text-center bg-gradient-to-br from-blue-500/10 to-blue-600/10 border border-blue-500/20">
                <div className="text-4xl font-bold text-blue-400 mb-2">0</div>
                <div className="text-gray-300 font-medium">Products Analyzed</div>
                <div className="text-xs text-gray-500 mt-1">Start analyzing to see your progress</div>
              </div>
              <div className="card p-6 text-center bg-gradient-to-br from-green-500/10 to-green-600/10 border border-green-500/20">
                <div className="text-4xl font-bold text-green-400 mb-2">0</div>
                <div className="text-gray-300 font-medium">Profitable Finds</div>
                <div className="text-xs text-gray-500 mt-1">Products with good profit potential</div>
              </div>
              <div className="card p-6 text-center bg-gradient-to-br from-purple-500/10 to-purple-600/10 border border-purple-500/20">
                <div className="text-4xl font-bold text-purple-400 mb-2">0</div>
                <div className="text-gray-300 font-medium">Saved Products</div>
                <div className="text-xs text-gray-500 mt-1">Added to your product list</div>
              </div>
            </div>

            {/* Extension Download Section */}
            <div id="extension-download" className="card p-8 bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-blue-500/20">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h3 className="text-2xl font-bold mb-2 gradient-text flex items-center">
                    <span className="mr-3">🔧</span>
                    Chrome Extension
                  </h3>
                  <p className="text-gray-300 text-lg">
                    Your secret weapon for finding profitable products on Walmart Marketplace
                  </p>
                </div>
                <div className="flex items-center space-x-2 bg-green-500/20 border border-green-500/30 rounded-full px-3 py-1">
                  <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                  <span className="text-green-400 text-sm font-medium">Ready</span>
                </div>
              </div>

              {/* Extension Features */}
              <div className="grid md:grid-cols-2 gap-6 mb-8">
                <div className="bg-slate-700/50 rounded-lg p-4">
                  <h4 className="font-semibold text-white mb-2 flex items-center">
                    <span className="text-green-400 mr-2">✓</span>
                    Instant Analysis
                  </h4>
                  <p className="text-sm text-gray-400">See profit margins and ROI in real-time on any Walmart product</p>
                </div>
                <div className="bg-slate-700/50 rounded-lg p-4">
                  <h4 className="font-semibold text-white mb-2 flex items-center">
                    <span className="text-green-400 mr-2">✓</span>
                    Buy Gauge
                  </h4>
                  <p className="text-sm text-gray-400">Our proprietary scoring system shows product buyability</p>
                </div>
                <div className="bg-slate-700/50 rounded-lg p-4">
                  <h4 className="font-semibold text-white mb-2 flex items-center">
                    <span className="text-green-400 mr-2">✓</span>
                    Competition Data
                  </h4>
                  <p className="text-sm text-gray-400">View buy box ownership and seller performance</p>
                </div>
                <div className="bg-slate-700/50 rounded-lg p-4">
                  <h4 className="font-semibold text-white mb-2 flex items-center">
                    <span className="text-green-400 mr-2">✓</span>
                    Google Sheets Export
                  </h4>
                  <p className="text-sm text-gray-400">One-click export of profitable finds to your spreadsheet</p>
                </div>
              </div>

              {/* Download CTA */}
              <div className="bg-gradient-to-r from-accent/20 to-blue-500/20 border border-accent/30 rounded-lg p-6 text-center">
                <h4 className="text-xl font-semibold text-white mb-2">Ready to Start Finding Profitable Products?</h4>
                <p className="text-gray-300 mb-4">Install the extension and analyze your first product in under 30 seconds</p>
                <a
                  href="https://chromewebstore.google.com/detail/nexsellpro/oeoabefdhedmaeoghdmbcechbiepmfpc"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-primary inline-flex items-center gap-3 text-lg px-8 py-4"
                >
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                  Install Extension
                </a>
                <p className="text-sm text-gray-400 mt-3">Free • No credit card required • 30-second setup</p>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="card p-8 bg-gradient-to-br from-slate-800/50 to-slate-700/50 border border-slate-600/30">
              <h3 className="text-2xl font-bold mb-4 gradient-text flex items-center">
                <span className="mr-3">📊</span>
                Recent Activity
              </h3>
              <div className="text-center py-12 text-gray-400">
                <div className="text-6xl mb-6">🚀</div>
                <h4 className="text-xl font-semibold text-white mb-2">Ready to Start Your Journey?</h4>
                <p className="text-gray-400 mb-6">Install the extension and analyze your first product to see your activity here</p>
                <a
                  href="#extension-download"
                  className="btn-accent inline-flex items-center gap-2"
                >
                  <span>Get Started</span>
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </a>
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