# Next.js Middleware for Route Protection

This middleware provides comprehensive route protection for the NexSellPro application using Supabase authentication.

## Features

- ✅ **Protected Routes**: `/dashboard`, `/profile`, `/settings` require authentication
- ✅ **Auth Routes**: `/login`, `/signup` redirect authenticated users to dashboard
- ✅ **Public Routes**: Home page and marketing pages are publicly accessible
- ✅ **Session Refresh**: Automatically refreshes expired sessions
- ✅ **Redirect Preservation**: Saves original URL for post-login redirect
- ✅ **Security**: Validates redirect URLs to prevent open redirects

## Route Configuration

### Protected Routes
- `/dashboard` - Main dashboard (requires auth)
- `/profile` - User profile page (requires auth)
- `/settings` - Account settings (requires auth)
- `/dashboard/*` - Any dashboard sub-routes (requires auth)

### Auth Routes
- `/login` - Login page (redirects authenticated users)
- `/signup` - Signup page (redirects authenticated users)

### Public Routes
- `/` - Home page
- `/pricing` - Pricing page
- `/features` - Features page
- `/about` - About page
- `/contact` - Contact page
- `/terms` - Terms of service
- `/privacy` - Privacy policy
- `/thank-you` - Thank you page

## How It Works

1. **Request Interception**: Middleware runs on all routes except static assets
2. **Session Check**: Verifies authentication status using Supabase
3. **Route Classification**: Determines if route is protected, auth, or public
4. **Redirect Logic**: 
   - Unauthenticated users → `/login` (with redirect parameter)
   - Authenticated users on auth routes → `/dashboard`
   - Public routes → Allow access

## Environment Variables Required

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Usage Examples

### Accessing Protected Route (Unauthenticated)
```
User visits: /dashboard
Middleware redirects to: /login?redirect=http://localhost:3000/dashboard
```

### Login with Redirect
```
User logs in successfully
Redirects to: /dashboard (or original URL if redirect parameter exists)
```

### Authenticated User on Login Page
```
User visits: /login (while authenticated)
Middleware redirects to: /dashboard
```

## Development

The middleware includes debug logging in development mode. Check the console for:
- Current pathname
- Authentication status
- Route classification
- Redirect decisions

## Security Features

- **Open Redirect Prevention**: Validates redirect URLs to same origin
- **Session Validation**: Uses Supabase's secure session management
- **Error Handling**: Graceful fallback on auth errors
- **Cookie Security**: Proper cookie handling for session management

## Customization

To add new routes:

1. **Protected Routes**: Add to `protectedRoutes` array
2. **Auth Routes**: Add to `authRoutes` array  
3. **Public Routes**: Add to `publicRoutes` array

Example:
```typescript
const protectedRoutes = ['/dashboard', '/profile', '/settings', '/new-protected-route'];
const authRoutes = ['/login', '/signup', '/new-auth-route'];
const publicRoutes = ['/', '/pricing', '/new-public-route'];
```

## Troubleshooting

### Common Issues

1. **Infinite Redirects**: Check if route is properly classified
2. **Session Not Persisting**: Verify Supabase environment variables
3. **Middleware Not Running**: Check matcher configuration

### Debug Mode

Enable debug logging by setting `NODE_ENV=development` and check console output.

## Dependencies

- `@supabase/ssr` - Supabase server-side rendering utilities
- `next/server` - Next.js server utilities 