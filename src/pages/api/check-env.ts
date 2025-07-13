import { NextApiRequest, NextApiResponse } from 'next';

/**
 * Environment Configuration Check API Endpoint
 * 
 * This endpoint provides information about the environment configuration
 * without exposing sensitive values like API keys or URLs.
 * 
 * Use this to verify that:
 * - Required environment variables are set
 * - Environment is properly configured
 * - Callback URLs are correctly formatted
 * 
 * Security: This endpoint does NOT expose actual values of sensitive
 * environment variables, only whether they are configured.
 */

interface EnvCheckResponse {
  success: boolean;
  timestamp: string;
  environment: {
    nodeEnv: string;
    isDevelopment: boolean;
    isProduction: boolean;
  };
  supabase: {
    urlConfigured: boolean;
    anonKeyConfigured: boolean;
    fullyConfigured: boolean;
  };
  callbackUrl: {
    expectedFormat: string;
    example: string;
    notes: string[];
  };
  recommendations: string[];
  errors: string[];
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<EnvCheckResponse>
) {
  const startTime = Date.now();
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  // Initialize response object
  const response: EnvCheckResponse = {
    success: false,
    timestamp: new Date().toISOString(),
    environment: {
      nodeEnv: process.env.NODE_ENV || 'unknown',
      isDevelopment: isDevelopment,
      isProduction: process.env.NODE_ENV === 'production'
    },
    supabase: {
      urlConfigured: false,
      anonKeyConfigured: false,
      fullyConfigured: false
    },
    callbackUrl: {
      expectedFormat: '',
      example: '',
      notes: []
    },
    recommendations: [],
    errors: []
  };

  try {
    if (isDevelopment) {
      console.log('[Check Env API] Starting environment configuration check...');
    }

    // Check Supabase environment variables
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    response.supabase.urlConfigured = !!supabaseUrl;
    response.supabase.anonKeyConfigured = !!supabaseAnonKey;
    response.supabase.fullyConfigured = !!supabaseUrl && !!supabaseAnonKey;

    // Validate Supabase URL format if present
    if (supabaseUrl) {
      try {
        const url = new URL(supabaseUrl);
        if (!url.hostname.includes('supabase.co')) {
          response.errors.push('NEXT_PUBLIC_SUPABASE_URL does not appear to be a valid Supabase URL');
        }
      } catch (error) {
        response.errors.push('NEXT_PUBLIC_SUPABASE_URL is not a valid URL format');
      }
    }

    // Validate Supabase anon key format if present
    if (supabaseAnonKey) {
      // Supabase anon keys are typically long strings starting with 'eyJ'
      if (!supabaseAnonKey.startsWith('eyJ') || supabaseAnonKey.length < 100) {
        response.errors.push('NEXT_PUBLIC_SUPABASE_ANON_KEY does not appear to be in the correct format');
      }
    }

    // Set up callback URL information
    if (response.supabase.fullyConfigured) {
      response.callbackUrl.expectedFormat = `${req.headers.host}/auth/callback`;
      response.callbackUrl.example = `https://${req.headers.host}/auth/callback`;
      response.callbackUrl.notes = [
        'This URL should be configured in your Supabase project settings',
        'Make sure to include the protocol (https://) in Supabase settings',
        'The path must be exactly /auth/callback'
      ];
    } else {
      response.callbackUrl.expectedFormat = 'Cannot determine - Supabase not fully configured';
      response.callbackUrl.example = 'https://yourdomain.com/auth/callback';
      response.callbackUrl.notes = [
        'Configure Supabase environment variables first',
        'Then set the callback URL in your Supabase project settings'
      ];
    }

    // Generate recommendations based on current state
    if (!response.supabase.urlConfigured) {
      response.recommendations.push('Set NEXT_PUBLIC_SUPABASE_URL in your environment variables');
    }

    if (!response.supabase.anonKeyConfigured) {
      response.recommendations.push('Set NEXT_PUBLIC_SUPABASE_ANON_KEY in your environment variables');
    }

    if (response.supabase.fullyConfigured) {
      response.recommendations.push('Environment appears to be properly configured');
      
      if (isDevelopment) {
        response.recommendations.push('For development, ensure your .env.local file contains both variables');
        response.recommendations.push('Restart your development server after changing environment variables');
      } else {
        response.recommendations.push('For production, ensure environment variables are set in your hosting platform');
        response.recommendations.push('Verify callback URL is configured in Supabase project settings');
      }
    }

    // Check for common development issues
    if (isDevelopment) {
      if (!response.supabase.fullyConfigured) {
        response.recommendations.push('Create a .env.local file in your project root');
        response.recommendations.push('Add your Supabase project URL and anon key to .env.local');
        response.recommendations.push('Example .env.local content:');
        response.recommendations.push('  NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co');
        response.recommendations.push('  NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here');
      }
    }

    // Determine overall success
    response.success = response.supabase.fullyConfigured && response.errors.length === 0;

    if (isDevelopment) {
      console.log('[Check Env API] Environment check completed:', {
        success: response.success,
        supabaseConfigured: response.supabase.fullyConfigured,
        errors: response.errors.length,
        recommendations: response.recommendations.length,
        totalTime: Date.now() - startTime
      });
    }

    // Return success response
    return res.status(200).json(response);

  } catch (error) {
    console.error('[Check Env API] Unexpected error:', error);
    
    response.errors.push(
      error instanceof Error ? error.message : 'Unknown error occurred during environment check'
    );
    
    return res.status(500).json(response);
  }
} 