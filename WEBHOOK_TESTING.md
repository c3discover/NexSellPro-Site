# Webhook Testing Guide

This guide explains how to test the payment webhook functionality without going through Stripe.

## Overview

The payment flow has been fixed and improved with:
- ✅ Correct plan values ('free', 'premium', 'enterprise')
- ✅ Proper redirectTo URLs
- ✅ Better error logging
- ✅ Robust existing user handling
- ✅ Upgrade button for free users

## Test Endpoint

A test endpoint has been created at `/api/test-webhook` that simulates the Stripe webhook without requiring actual payments.

### Features
- ✅ Simulates successful payment processing
- ✅ Handles both new and existing users
- ✅ Updates user plans correctly
- ✅ Sends password reset emails
- ✅ Comprehensive error logging
- ✅ Production-safe (blocked in production)

## How to Test

### Method 1: Using the Test Script

1. **Start your development server:**
   ```bash
   npm run dev
   ```

2. **Run the test script:**
   ```bash
   node test-webhook.js
   ```

3. **Check the output:**
   - Console will show test results
   - Server logs will show detailed processing
   - Check your email for password reset link

### Method 2: Using curl

```bash
curl -X POST http://localhost:3000/api/test-webhook \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "firstName": "Test",
    "lastName": "User"
  }'
```

### Method 3: Using Postman/Insomnia

**URL:** `POST http://localhost:3000/api/test-webhook`

**Headers:**
```
Content-Type: application/json
```

**Body:**
```json
{
  "email": "test@example.com",
  "firstName": "Test",
  "lastName": "User",
  "customerName": "Test User"
}
```

## Test Scenarios

### 1. New User Test
- Use a completely new email address
- Should create new auth user
- Should add user to user_plan with 'premium' plan
- Should send password reset email

### 2. Existing User Test
- Use an email that already has a user_plan record
- Should update existing user's plan to 'premium'
- Should not create duplicate records

### 3. Auth User Without Plan Test
- Use an email that exists in auth but not in user_plan
- Should find existing auth user
- Should add user to user_plan with 'premium' plan
- Should send password reset email

## Expected Results

### Successful Response
```json
{
  "success": true,
  "message": "Test webhook processed successfully",
  "data": {
    "userId": "uuid-here",
    "plan": "premium",
    "email": "test@example.com"
  }
}
```

### Error Response
```json
{
  "success": false,
  "message": "Test webhook processing failed",
  "error": "Error details here"
}
```

## Logging

The test endpoint provides detailed logging:

- 🧪 Test start information
- 📧 Email and name processing
- 🔍 User existence checks
- 👤 Existing user updates
- 🆕 New user creation
- 📨 Password reset email sending
- ✅ Success confirmations
- ❌ Error details

## Production Safety

- The test endpoint is automatically blocked in production
- Returns 404 in production environments
- Only available in development/testing

## Troubleshooting

### Common Issues

1. **Server not running:**
   ```
   Error: connect ECONNREFUSED 127.0.0.1:3000
   ```
   Solution: Start your development server with `npm run dev`

2. **Invalid email format:**
   ```
   "message": "Invalid email format"
   ```
   Solution: Use a valid email address with @ symbol

3. **Missing email:**
   ```
   "message": "Email is required"
   ```
   Solution: Include email in the request body

4. **Database connection issues:**
   Check your Supabase environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`

### Debug Steps

1. Check server console logs for detailed error information
2. Verify Supabase connection and permissions
3. Check email service configuration
4. Verify database schema matches expected structure

## Integration with Real Stripe

When testing with real Stripe:

1. **Webhook URL:** `https://yourdomain.com/api/stripe/webhook`
2. **Events:** `checkout.session.completed`
3. **Secret:** Use your Stripe webhook secret
4. **Test Mode:** Use Stripe test mode for safe testing

The real webhook uses the same logic as the test endpoint, so successful test results indicate the production webhook will work correctly. 