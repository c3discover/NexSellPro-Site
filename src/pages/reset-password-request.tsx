import React, { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

export default function ResetPasswordRequestPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    
    // Validate email
    if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      setError('Please enter a valid email address.');
      return;
    }

    setLoading(true);
    
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/callback?type=recovery`,
      });

      if (error) {
        setError(error.message);
      } else {
        setSuccess(true);
      }
    } catch {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Head>
        <title>Reset Password | NexSellPro</title>
      </Head>
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-700 px-4">
        <div className="card max-w-md w-full mx-auto p-8 md:p-10 glass animate-fadeIn shadow-xl">
          {!success ? (
            <>
              <h1 className="text-3xl font-bold text-center mb-2 gradient-text">Reset Your Password</h1>
              <p className="text-center text-gray-400 mb-6">
                Enter your email address and we&apos;ll send you a link to reset your password.
              </p>
              
              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-200 mb-1">
                    Email Address
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-3 rounded-lg bg-slate-800 text-white border border-slate-700 focus:outline-none focus:ring-2 focus:ring-accent transition"
                    placeholder="Enter your email"
                    disabled={loading}
                    required
                  />
                </div>
                
                {error && (
                  <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                    <p className="text-red-400 text-sm">{error}</p>
                  </div>
                )}
                
                <button
                  type="submit"
                  className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                  disabled={loading}
                >
                  {loading && (
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
                    </svg>
                  )}
                  {loading ? 'Sending...' : 'Send Reset Link'}
                </button>
              </form>
              
              <div className="mt-6 text-center text-gray-400 text-sm">
                Remember your password?{' '}
                <Link href="/login" className="text-accent hover:underline">
                  Back to login
                </Link>
              </div>
            </>
          ) : (
            <div className="text-center">
              <div className="text-5xl mb-4">✉️</div>
              <h2 className="text-2xl font-bold mb-4 gradient-text">Check Your Email</h2>
              <p className="text-gray-400 mb-6">
                We&apos;ve sent a password reset link to <strong className="text-white">{email}</strong>
              </p>
              <p className="text-gray-400 text-sm mb-6">
                Click the link in the email to reset your password. If you don&apos;t see it, check your spam folder.
              </p>
              <Link href="/login" className="btn-primary inline-block">
                Back to Login
              </Link>
            </div>
          )}
        </div>
      </div>
    </>
  );
} 