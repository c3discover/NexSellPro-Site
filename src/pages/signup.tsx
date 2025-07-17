import React, { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import ReCAPTCHA from 'react-google-recaptcha';
import { supabase, upsertUserProfile } from '@/lib/supabase';

// TypeScript types for form data and errors
interface SignupForm {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
  businessName?: string;
  howDidYouHear?: string;
}

interface FormError {
  firstName?: string;
  lastName?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
  businessName?: string;
  howDidYouHear?: string;
  captcha?: string;
  general?: string;
}

// Extended error types for better error handling
interface SignupState {
  loading: boolean;
  success: boolean;
  resent: boolean;
  showPassword: boolean;
  showConfirmPassword: boolean;
  redirectCountdown: number;
  captchaToken: string;
}

const initialForm: SignupForm = {
  firstName: '',
  lastName: '',
  email: '',
  password: '',
  confirmPassword: '',
  businessName: '',
  howDidYouHear: ''
};

export default function SignupPage() {
  const router = useRouter();
  const captchaRef = useRef<ReCAPTCHA>(null);
  const [form, setForm] = useState<SignupForm>(initialForm);
  const [errors, setErrors] = useState<FormError>({});
  const [state, setState] = useState<SignupState>({
    loading: false,
    success: false,
    resent: false,
    showPassword: false,
    showConfirmPassword: false,
    redirectCountdown: 30,
    captchaToken: ''
  });

  // Handle automatic redirect to login after successful signup
  useEffect(() => {
    let countdownInterval: NodeJS.Timeout;
    
    if (state.success && state.redirectCountdown > 0) {
      countdownInterval = setInterval(() => {
        setState(prev => ({
          ...prev,
          redirectCountdown: prev.redirectCountdown - 1
        }));
      }, 1000);
    } else if (state.success && state.redirectCountdown === 0) {
      router.push('/login');
    }

    return () => {
      if (countdownInterval) {
        clearInterval(countdownInterval);
      }
    };
  }, [state.success, state.redirectCountdown, router]);

  // Clear errors when user starts typing
  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    setForm({ ...form, [e.target.name]: e.target.value });
    setErrors((prev) => ({ ...prev, [e.target.name]: undefined, general: undefined, captcha: undefined }));
  }

  // Google reCAPTCHA callbacks
  const handleCaptchaVerify = (token: string | null) => {
    if (token) {
      console.log("reCAPTCHA passed:", token);
      setState(prev => ({ ...prev, captchaToken: token }));
      setErrors(prev => ({ ...prev, captcha: undefined }));
    } else {
      setState(prev => ({ ...prev, captchaToken: '' }));
      setErrors(prev => ({ ...prev, captcha: 'Please complete the security check.' }));
    }
  };

  const handleCaptchaExpire = () => {
    setState(prev => ({ ...prev, captchaToken: '' }));
    setErrors(prev => ({ ...prev, captcha: 'Security check expired. Please try again.' }));
  };

  const handleCaptchaError = () => {
    setState(prev => ({ ...prev, captchaToken: '' }));
    setErrors(prev => ({ ...prev, captcha: 'Security check failed. Please try again.' }));
    console.error('reCAPTCHA error occurred');
  };

  // Validate form fields with detailed explanations for each rule
  function validate(values: SignupForm): FormError {
    const errs: FormError = {};

    // Required fields validation
    if (!values.firstName?.trim()) {
      errs.firstName = 'First name is required.'; // Required for personalization and account identification
    }
    if (!values.lastName?.trim()) {
      errs.lastName = 'Last name is required.'; // Required for account identification and support
    }
    
    // Email validation with comprehensive checks
    if (!values.email) {
      errs.email = 'Email is required.'; // Required for account creation and communication
    } else if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(values.email)) {
      errs.email = 'Enter a valid email address.'; // Basic email format validation
    }
    
    // Password strength validation
    if (!values.password) {
      errs.password = 'Password is required.'; // Required for account security
    } else if (values.password.length < 8) {
      errs.password = 'Password must be at least 8 characters.'; // Minimum length for security
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(values.password)) {
      errs.password = 'Password must contain at least one uppercase letter, one lowercase letter, and one number.'; // Complexity requirement for security
    }
    
    // Password confirmation validation
    if (!values.confirmPassword) {
      errs.confirmPassword = 'Please confirm your password.'; // Prevents typos in password
    } else if (values.password !== values.confirmPassword) {
      errs.confirmPassword = 'Passwords do not match.'; // Ensures user typed password correctly
    }

    return errs;
  }

  // Handle form submission with comprehensive error handling
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});
    setState(prev => ({ ...prev, resent: false }));
    
    // Validate form before submission
    const validation = validate(form);
    if (Object.keys(validation).length > 0) {
      setErrors(validation);
      return;
    }

    // Check if captcha token exists
    if (!state.captchaToken) {
      setErrors({ captcha: 'Please complete the security check.' });
      return;
    }
    
    setState(prev => ({ ...prev, loading: true }));
    
    try {
      // Step 1: Attempt to create user account with Supabase Auth
      const { data, error } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?type=signup`,
          data: {
            first_name: form.firstName,
            last_name: form.lastName,
            business_name: form.businessName,
            how_did_you_hear: form.howDidYouHear,
            captcha_token: state.captchaToken, // Include captcha token for backend verification
          }
        },
      });

      if (error) {
        // Handle specific error cases
        if (error.message.includes('already registered') || error.message.includes('already exists')) {
          setErrors({ 
            email: 'An account with this email already exists. Please sign in instead.' 
          });
        } else {
          setErrors({ general: error.message || 'Signup failed. Please try again.' });
        }
        setState(prev => ({ ...prev, loading: false, captchaToken: '' }));
        return;
      }

      // Step 2: Store user profile data if signup was successful
      if (data.user) {
        try {
          // Use a retry mechanism to ensure profile data is saved
          let profileSaved = false;
          let retryCount = 0;
          const maxRetries = 3;
          
          while (!profileSaved && retryCount < maxRetries) {
            try {
              await upsertUserProfile({
                user_id: data.user.id,
                first_name: form.firstName,
                last_name: form.lastName,
                business_name: form.businessName || undefined,
                how_did_you_hear: form.howDidYouHear || undefined,
              });
              profileSaved = true;
            } catch (profileError) {
              retryCount++;
              if (retryCount >= maxRetries) {
                console.error('Failed to save user profile after retries:', profileError);
                // Don't fail the signup if profile save fails - user can update later
              } else {
                // Wait before retrying
                await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
              }
            }
          }

          // Step 3: Set user plan to "free" after successful profile creation
          if (profileSaved) {
            try {
              const planResponse = await fetch('/api/set-user-plan', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                  userId: data.user.id,
                  plan: 'free'
                })
              });

              if (!planResponse.ok) {
                console.warn('Failed to set user plan, but signup continues:', await planResponse.text());
                // Don't fail the signup if plan assignment fails - user can be updated later
              } else {
                console.log('Successfully set user plan to free');
              }
            } catch (planError) {
              console.error('Error setting user plan:', planError);
              // Don't fail the signup if plan assignment fails - user can be updated later
            }
          }
        } catch (profileError) {
          console.error('Error saving user profile:', profileError);
          // Don't fail the signup if profile save fails - user can update later
        }
      }

      // Step 3: Show success state
      setState(prev => ({ 
        ...prev, 
        success: true, 
        loading: false,
        redirectCountdown: 30,
        captchaToken: '' // Clear captcha token after successful signup
      }));
      
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unexpected error. Please try again.';
      setErrors({ general: errorMessage });
      setState(prev => ({ ...prev, loading: false, captchaToken: '' }));
    }
  }

  // Resend confirmation email with improved feedback
  async function handleResend() {
    setState(prev => ({ ...prev, resent: false, loading: true }));
    setErrors({});
    
    try {
      const { error } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?type=signup`,
          data: {
            first_name: form.firstName,
            last_name: form.lastName,
            business_name: form.businessName,
            how_did_you_hear: form.howDidYouHear,
          }
        },
      });
      
      if (error) {
        if (error.message.includes('already registered') || error.message.includes('already exists')) {
          setErrors({ 
            email: 'An account with this email already exists. Please sign in instead.' 
          });
        } else {
          setErrors({ general: error.message || 'Could not resend confirmation email.' });
        }
      } else {
        setState(prev => ({ ...prev, resent: true }));
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unexpected error. Please try again.';
      setErrors({ general: errorMessage });
    } finally {
      setState(prev => ({ ...prev, loading: false }));
    }
  }

  return (
    <>
      <Head>
        <title>Sign Up | NexSellPro</title>
      </Head>
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-700 px-4">
        <div className="card max-w-lg w-full mx-auto p-8 md:p-10 glass animate-fadeIn shadow-xl">
          <h1 className="text-3xl font-bold text-center mb-2 gradient-text">Create your NexSellPro account</h1>
          <p className="text-center text-gray-400 mb-6">Join thousands of sellers finding profitable products on Walmart Marketplace</p>
          
          {state.success ? (
            <div className="text-center">
              <div className="text-2xl mb-4 text-accent">Check your email, {form.firstName}!</div>
              
              {/* Enhanced success message with detailed instructions */}
              <div className="bg-slate-800/50 rounded-lg p-4 mb-4 text-left">
                <p className="text-gray-300 mb-3">
                  We&rsquo;ve sent a confirmation link to <span className="font-semibold text-white">{form.email}</span>.
                </p>
                
                <div className="space-y-2 text-sm text-gray-400">
                  <div className="flex items-start gap-2">
                    <span className="text-accent mt-0.5">•</span>
                    <span>Click the link in your email to activate your account</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-accent mt-0.5">•</span>
                    <span>Check your spam/junk folder if you don&rsquo;t see it</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-accent mt-0.5">•</span>
                    <span>The link expires in 1 hour for security</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-accent mt-0.5">•</span>
                    <span>You&rsquo;ll be redirected to login in {state.redirectCountdown} seconds</span>
                  </div>
                </div>
              </div>

              {/* Feedback messages */}
              {state.resent && (
                <div className="text-green-400 text-sm mb-3 bg-green-400/10 rounded-lg p-2">
                  ✓ Confirmation email resent successfully!
                </div>
              )}
              {errors.general && (
                <div className="text-red-400 text-sm mb-3 bg-red-400/10 rounded-lg p-2">
                  {errors.general}
                </div>
              )}

              {/* Action buttons */}
              <div className="space-y-2">
                <button
                  className="btn-primary w-full"
                  onClick={handleResend}
                  disabled={state.loading}
                  type="button"
                >
                  {state.loading ? 'Resending...' : 'Resend Email'}
                </button>
                
                <button
                  className="btn-accent w-full"
                  onClick={() => { 
                    setState(prev => ({ ...prev, success: false })); 
                    setForm(initialForm); 
                  }}
                  type="button"
                >
                  Start Over
                </button>
                
                <button
                  className="btn-secondary w-full"
                  onClick={() => router.push('/login')}
                  type="button"
                >
                  Go to Login
                </button>
              </div>

              <div className="mt-6 text-gray-400 text-sm">
                Already have an account?{' '}
                <Link href="/login" className="text-accent hover:underline hover-underline">Sign in</Link>
              </div>
            </div>
          ) : (
            <>
              {/* Debug section - only show in development */}
              {process.env.NODE_ENV === 'development' && (
                <div className="mb-4 p-3 bg-slate-800/50 rounded-lg border border-slate-700">
                  <div className="text-xs text-gray-400 mb-2">Debug Info:</div>
                  <div className="space-y-1 text-xs">
                    <div>Origin: {typeof window !== 'undefined' ? window.location.origin : 'SSR'}</div>
                    <div>Redirect URL: {typeof window !== 'undefined' ? `${window.location.origin}/auth/callback?type=signup` : 'SSR'}</div>
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          const response = await fetch('/api/supabase-config');
                          const data = await response.json();
                          console.log('[Debug] Supabase config:', data);
                          alert(`Supabase Config: ${JSON.stringify(data, null, 2)}`);
                        } catch (error) {
                          console.error('[Debug] Config check failed:', error);
                          alert('Config check failed');
                        }
                      }}
                      className="text-xs text-accent hover:underline"
                    >
                      Check Supabase Config
                    </button>
                  </div>
                </div>
              )}
              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Name Fields */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="relative">
                    <label htmlFor="firstName" className="block text-sm font-medium text-gray-200 mb-1">First Name *</label>
                    <input
                      id="firstName"
                      name="firstName"
                      type="text"
                      autoComplete="given-name"
                      className={`w-full px-4 py-3 rounded-lg bg-slate-800 text-white border border-slate-700 focus:outline-none focus:ring-2 focus:ring-accent transition relative z-10 ${errors.firstName ? 'border-red-500' : ''}`}
                      value={form.firstName}
                      onChange={handleChange}
                      disabled={state.loading}
                      required
                      placeholder="John"
                    />
                    {errors.firstName && <p className="text-red-400 text-xs mt-1">{errors.firstName}</p>}
                  </div>
                  <div className="relative">
                    <label htmlFor="lastName" className="block text-sm font-medium text-gray-200 mb-1">Last Name *</label>
                    <input
                      id="lastName"
                      name="lastName"
                      type="text"
                      autoComplete="family-name"
                      className={`w-full px-4 py-3 rounded-lg bg-slate-800 text-white border border-slate-700 focus:outline-none focus:ring-2 focus:ring-accent transition relative z-10 ${errors.lastName ? 'border-red-500' : ''}`}
                      value={form.lastName}
                      onChange={handleChange}
                      disabled={state.loading}
                      required
                      placeholder="Doe"
                    />
                    {errors.lastName && <p className="text-red-400 text-xs mt-1">{errors.lastName}</p>}
                  </div>
                </div>

                {/* Email Field */}
                <div className="relative">
                  <label htmlFor="email" className="block text-sm font-medium text-gray-200 mb-1">Email *</label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    className={`w-full px-4 py-3 rounded-lg bg-slate-800 text-white border border-slate-700 focus:outline-none focus:ring-2 focus:ring-accent transition relative z-10 ${errors.email ? 'border-red-500' : ''}`}
                    value={form.email}
                    onChange={handleChange}
                    disabled={state.loading}
                    required
                    placeholder="john@example.com"
                  />
                  {errors.email && <p className="text-red-400 text-xs mt-1">{errors.email}</p>}
                </div>

                {/* Business Name (Optional) */}
                <div className="relative">
                  <label htmlFor="businessName" className="block text-sm font-medium text-gray-200 mb-1">Business Name (Optional)</label>
                  <input
                    id="businessName"
                    name="businessName"
                    type="text"
                    autoComplete="organization"
                    className={`w-full px-4 py-3 rounded-lg bg-slate-800 text-white border border-slate-700 focus:outline-none focus:ring-2 focus:ring-accent transition relative z-10 ${errors.businessName ? 'border-red-500' : ''}`}
                    value={form.businessName}
                    onChange={handleChange}
                    disabled={state.loading}
                    placeholder="My Online Store"
                  />
                  {errors.businessName && <p className="text-red-400 text-xs mt-1">{errors.businessName}</p>}
                </div>

                {/* Password Fields */}
                <div className="relative">
                  <label htmlFor="password" className="block text-sm font-medium text-gray-200 mb-1">Password *</label>
                  <div className="relative">
                    <input
                      id="password"
                      name="password"
                      type={state.showPassword ? "text" : "password"}
                      autoComplete="new-password"
                      className={`w-full px-4 py-3 pr-12 rounded-lg bg-slate-800 text-white border border-slate-700 focus:outline-none focus:ring-2 focus:ring-accent transition relative z-10 ${errors.password ? 'border-red-500' : ''}`}
                      value={form.password}
                      onChange={handleChange}
                      disabled={state.loading}
                      required
                      placeholder="Create a strong password"
                    />
                    <button
                      type="button"
                      onClick={() => setState(prev => ({ ...prev, showPassword: !prev.showPassword }))}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-300 transition-colors z-20"
                      disabled={state.loading}
                    >
                      {state.showPassword ? (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      )}
                    </button>
                  </div>
                  {errors.password && <p className="text-red-400 text-xs mt-1">{errors.password}</p>}
                </div>

                <div className="relative">
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-200 mb-1">Confirm Password *</label>
                  <div className="relative">
                    <input
                      id="confirmPassword"
                      name="confirmPassword"
                      type={state.showConfirmPassword ? "text" : "password"}
                      autoComplete="new-password"
                      className={`w-full px-4 py-3 pr-12 rounded-lg bg-slate-800 text-white border border-slate-700 focus:outline-none focus:ring-2 focus:ring-accent transition relative z-10 ${errors.confirmPassword ? 'border-red-500' : ''}`}
                      value={form.confirmPassword}
                      onChange={handleChange}
                      disabled={state.loading}
                      required
                      placeholder="Confirm your password"
                    />
                    <button
                      type="button"
                      onClick={() => setState(prev => ({ ...prev, showConfirmPassword: !prev.showConfirmPassword }))}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-300 transition-colors z-20"
                      disabled={state.loading}
                    >
                      {state.showConfirmPassword ? (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      )}
                    </button>
                  </div>
                  {errors.confirmPassword && <p className="text-red-400 text-xs mt-1">{errors.confirmPassword}</p>}
                </div>

                {/* How did you hear about us */}
                <div className="relative">
                  <label htmlFor="howDidYouHear" className="block text-sm font-medium text-gray-200 mb-1">How did you hear about us?</label>
                  <select
                    id="howDidYouHear"
                    name="howDidYouHear"
                    className={`w-full px-4 py-3 rounded-lg bg-slate-800 text-white border border-slate-700 focus:outline-none focus:ring-2 focus:ring-accent transition relative z-10 ${errors.howDidYouHear ? 'border-red-500' : ''}`}
                    value={form.howDidYouHear}
                    onChange={handleChange}
                    disabled={state.loading}
                  >
                    <option value="">Select an option</option>
                    <option value="google">Google Search</option>
                    <option value="social-media">Social Media</option>
                    <option value="youtube">YouTube</option>
                    <option value="friend">Friend/Colleague</option>
                    <option value="forum">Online Forum/Community</option>
                    <option value="advertisement">Advertisement</option>
                    <option value="other">Other</option>
                  </select>
                  {errors.howDidYouHear && <p className="text-red-400 text-xs mt-1">{errors.howDidYouHear}</p>}
                </div>

                {/* Google reCAPTCHA Component */}
                <ReCAPTCHA
                  ref={captchaRef}
                  sitekey={process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY!}
                  onChange={handleCaptchaVerify}
                  onExpired={handleCaptchaExpire}
                  onError={handleCaptchaError}
                />
                
                {/* Error messages */}
                {errors.captcha && <div className="text-red-400 text-sm text-center">{errors.captcha}</div>}
                {errors.general && <div className="text-red-500 text-sm text-center">{errors.general}</div>}
                
                <button
                  type="submit"
                  className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                  disabled={state.loading}
                >
                  {state.loading && (
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
                    </svg>
                  )}
                  {state.loading ? 'Signing up...' : 'Sign Up'}
                </button>
                
                <div className="mt-4 text-xs text-gray-400 text-center">
                  By signing up, you agree to our{' '}
                  <Link href="/terms" className="text-accent hover:underline hover-underline">Terms of Service</Link>.
                </div>
                
                <div className="mt-6 text-center text-gray-400 text-sm">
                  Already have an account?{' '}
                  <Link href="/login" className="text-accent hover:underline hover-underline">Sign in</Link>
                </div>
              </form>
            </>
          )}
        </div>
      </div>
    </>
  );
} 