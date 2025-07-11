# Authentication Flow Documentation

## Table of Contents
1. [Complete Auth Flow Diagram](#complete-auth-flow-diagram)
2. [Auth States and Handling](#auth-states-and-handling)
3. [Common Issues and Solutions](#common-issues-and-solutions)
4. [Local Testing Guide](#local-testing-guide)
5. [Supabase Configuration Checklist](#supabase-configuration-checklist)
6. [Environment Variables](#environment-variables)
7. [Production Debugging](#production-debugging)

---

## Complete Auth Flow Diagram

### Signup Flow
```
User → /signup → Form Validation → Supabase Auth → Email Confirmation → /auth/callback → /dashboard
  ↓
  ├── Validation Errors → Show Errors
  ├── Auth Errors → Show Specific Messages
  ├── Profile Save Errors → Continue (User can update later)
  └── Success → Show Confirmation → Auto-redirect to /login
```

### Login Flow
```
User → /login → Form Validation → Supabase Auth → Session Creation → /dashboard
  ↓
  ├── Validation Errors → Show Errors
  ├── Email Not Confirmed → Show Resend Option
  ├── Invalid Credentials → Show Generic Error
  ├── Too Many Attempts → Show Rate Limit Message
  └── Success → Create Session → Redirect to Dashboard
```

### Email Confirmation Flow
```
Email Link → /auth/callback → Parse URL → Establish Session → Redirect
  ↓
  ├── Invalid/Expired Link → Show Error → Redirect to Login
  ├── Session Error → Retry Logic → Handle Failure
  └── Success → Redirect to Dashboard
```

### Password Reset Flow
```
User → /reset-password-request → Email Sent → Email Link → /auth/callback → /reset-password → New Password → /login
```

---

## Auth States and Handling

### Signup States
| State | Description | UI Behavior | Next Action |
|-------|-------------|-------------|-------------|
| `idle` | Initial form state | Show form | User fills form |
| `loading` | Processing signup | Show spinner, disable form | Wait for response |
| `success` | Signup successful | Show confirmation message | Auto-redirect to login |
| `error` | Signup failed | Show error message | User can retry |
| `resent` | Email resent | Show success message | User checks email |

### Login States
| State | Description | UI Behavior | Next Action |
|-------|-------------|-------------|-------------|
| `idle` | Initial form state | Show form | User fills form |
| `validating` | Client-side validation | Show validation errors | User corrects form |
| `checking` | Verifying credentials | Show spinner, disable form | Wait for response |
| `logging` | Creating session | Show "logging in" message | Redirect to dashboard |
| `error` | Login failed | Show specific error | User can retry |
| `emailNotConfirmed` | Email not verified | Show resend option | User confirms email |

### Auth Callback States
| State | Description | UI Behavior | Next Action |
|-------|-------------|-------------|-------------|
| `processing` | Handling auth callback | Show spinner | Wait for completion |
| `confirmed` | Auth successful | Show success message | Redirect to dashboard |
| `error` | Auth failed | Show error message | Redirect to login |

### Session States
| State | Description | Middleware Action | User Experience |
|-------|-------------|-------------------|-----------------|
| `authenticated` | Valid session | Allow access | Full app access |
| `unauthenticated` | No session | Redirect to login | Limited access |
| `expired` | Expired token | Refresh or redirect | Seamless refresh |
| `error` | Auth error | Allow with warning | Graceful degradation |

---

## Common Issues and Solutions

### 1. Email Confirmation Issues

**Problem**: User doesn't receive confirmation email
- **Solution**: Check spam folder, verify email address, use resend function
- **Debug**: Check Supabase logs, verify email template configuration

**Problem**: Confirmation link expires
- **Solution**: Use resend function to get new link
- **Debug**: Check email template expiration settings

**Problem**: Confirmation link doesn't work
- **Solution**: Verify URL format, check callback handler
- **Debug**: Check browser console, verify redirect URLs

### 2. Login Issues

**Problem**: "Invalid credentials" error
- **Solution**: Verify email/password, check caps lock
- **Debug**: Check Supabase auth logs, verify user exists

**Problem**: "Email not confirmed" error
- **Solution**: Confirm email first, use resend function
- **Debug**: Check user confirmation status in Supabase

**Problem**: "Too many requests" error
- **Solution**: Wait 5-15 minutes, check rate limiting
- **Debug**: Check Supabase rate limit settings

### 3. Session Issues

**Problem**: User logged out unexpectedly
- **Solution**: Check token expiration, refresh session
- **Debug**: Check browser storage, verify auto-refresh settings

**Problem**: Session not persisting
- **Solution**: Check cookie settings, verify persistSession config
- **Debug**: Check browser cookies, verify domain settings

**Problem**: Middleware redirect loops
- **Solution**: Check route configuration, verify auth state
- **Debug**: Check middleware logs, verify route matchers

### 4. Network Issues

**Problem**: Connection timeouts
- **Solution**: Check internet connection, retry operation
- **Debug**: Check network tab, verify Supabase URL

**Problem**: CORS errors
- **Solution**: Verify Supabase configuration, check domain settings
- **Debug**: Check browser console, verify allowed origins

---

## Local Testing Guide

### Prerequisites
1. Node.js 18+ installed
2. Supabase project created
3. Environment variables configured
4. Database schema set up

### Setup Steps
```bash
# 1. Clone and install dependencies
git clone <repository>
cd nexsellpro-site
npm install

# 2. Set up environment variables
cp .env.example .env.local
# Edit .env.local with your Supabase credentials

# 3. Start development server
npm run dev
```

### Testing Scenarios

#### 1. Signup Flow Testing
```bash
# Test new user signup
1. Navigate to /signup
2. Fill form with valid data
3. Submit form
4. Check email for confirmation
5. Click confirmation link
6. Verify redirect to dashboard
```

#### 2. Login Flow Testing
```bash
# Test existing user login
1. Navigate to /login
2. Enter valid credentials
3. Submit form
4. Verify redirect to dashboard
5. Check session persistence
```

#### 3. Email Confirmation Testing
```bash
# Test email confirmation
1. Complete signup process
2. Check email inbox
3. Click confirmation link
4. Verify callback handling
5. Check session establishment
```

#### 4. Password Reset Testing
```bash
# Test password reset
1. Navigate to /reset-password-request
2. Enter email address
3. Check email for reset link
4. Click reset link
5. Set new password
6. Verify login with new password
```

#### 5. Error Handling Testing
```bash
# Test various error scenarios
1. Invalid email format
2. Weak password
3. Non-matching passwords
4. Already registered email
5. Invalid login credentials
6. Network errors (disable internet)
```

### Browser Testing
- **Chrome**: Primary testing browser
- **Firefox**: Cross-browser compatibility
- **Safari**: Mac-specific testing
- **Edge**: Windows-specific testing

### Mobile Testing
- **iOS Safari**: Mobile responsiveness
- **Android Chrome**: Mobile functionality
- **Tablet browsers**: Responsive design

---

## Supabase Configuration Checklist

### Project Setup
- [ ] Create Supabase project
- [ ] Note project URL and anon key
- [ ] Configure authentication settings
- [ ] Set up email templates
- [ ] Configure redirect URLs

### Authentication Settings
- [ ] Enable email confirmations
- [ ] Set email confirmation template
- [ ] Configure password reset template
- [ ] Set session timeout (default: 3600 seconds)
- [ ] Enable secure cookie settings

### Email Templates
- [ ] Customize confirmation email template
- [ ] Customize password reset template
- [ ] Test email delivery
- [ ] Verify email formatting

### Database Schema
```sql
-- User profiles table
CREATE TABLE user_profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  business_name TEXT,
  how_did_you_hear TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view own profile" ON user_profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile" ON user_profiles
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile" ON user_profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);
```

### Redirect URLs Configuration
```
Development:
- http://localhost:3000/auth/callback
- http://localhost:3000/login

Production:
- https://yourdomain.com/auth/callback
- https://yourdomain.com/login
```

---

## Environment Variables

### Required Variables
```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Application Configuration
NODE_ENV=development
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Optional Variables
```bash
# Email Configuration (if using custom SMTP)
SMTP_HOST=your_smtp_host
SMTP_PORT=587
SMTP_USER=your_smtp_user
SMTP_PASS=your_smtp_password

# Analytics (if using)
NEXT_PUBLIC_GA_ID=your_google_analytics_id

# Feature Flags
NEXT_PUBLIC_ENABLE_ANALYTICS=true
NEXT_PUBLIC_ENABLE_DEBUG=true
```

### Environment File Structure
```
.env.local          # Local development (gitignored)
.env.production     # Production environment
.env.example        # Example template
```

### Security Notes
- Never commit `.env.local` to version control
- Use `NEXT_PUBLIC_` prefix only for client-side variables
- Keep sensitive keys secure and rotate regularly
- Use different keys for development and production

---

## Production Debugging

### Logging Strategy
```javascript
// Development logging
if (process.env.NODE_ENV === 'development') {
  console.log('[Auth]', message, data);
}

// Production logging
console.error('[Auth Error]', error);
```

### Debug Tools
1. **Browser DevTools**
   - Network tab for API calls
   - Console for JavaScript errors
   - Application tab for storage

2. **Supabase Dashboard**
   - Authentication logs
   - Database logs
   - Real-time logs

3. **Application Logs**
   - Server-side logs
   - Client-side error tracking
   - Performance monitoring

### Common Production Issues

#### 1. CORS Errors
```javascript
// Check Supabase configuration
const supabase = createClient(url, key, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
});
```

#### 2. Session Persistence Issues
```javascript
// Verify cookie settings
const response = NextResponse.next();
response.cookies.set('sb-access-token', token, {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  maxAge: 3600
});
```

#### 3. Email Delivery Issues
- Check Supabase email logs
- Verify email template configuration
- Test with different email providers
- Check spam folder settings

#### 4. Performance Issues
- Monitor API response times
- Check database query performance
- Optimize bundle size
- Use CDN for static assets

### Monitoring and Alerts
1. **Error Tracking**: Set up error monitoring (Sentry, LogRocket)
2. **Performance Monitoring**: Track Core Web Vitals
3. **Uptime Monitoring**: Monitor application availability
4. **User Analytics**: Track authentication funnel

### Rollback Strategy
1. **Database Migrations**: Always test migrations in staging
2. **Code Deployments**: Use blue-green deployment
3. **Configuration Changes**: Document all changes
4. **Emergency Procedures**: Have rollback procedures ready

---

## Troubleshooting Checklist

### Before Contacting Support
- [ ] Check browser console for errors
- [ ] Verify environment variables
- [ ] Test in incognito/private mode
- [ ] Clear browser cache and cookies
- [ ] Check Supabase dashboard logs
- [ ] Verify network connectivity
- [ ] Test with different browser
- [ ] Check email spam folder

### Support Information to Provide
- Browser and version
- Operating system
- Error messages (screenshots)
- Steps to reproduce
- Environment (dev/prod)
- User ID (if applicable)
- Timestamp of issue

---

*Last updated: [Current Date]*
*Version: 1.0*
*Maintained by: Development Team* 