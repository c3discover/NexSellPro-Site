# NexSellPro - Walmart Marketplace Product Analysis Tool

A Next.js application that helps Walmart Marketplace sellers find profitable products through instant analysis of listings, profit margins, ROI, and competition data.

## Features

- 🔐 **Authentication**: Complete auth flow with Supabase (signup, login, password reset)
- 📊 **Product Analysis**: Instant profit margin and ROI calculations
- 🎯 **Landing Page**: Marketing site with features, pricing, and FAQs
- 📱 **Responsive Design**: Mobile-first design with Tailwind CSS
- 🔒 **Security**: Production-ready with proper environment guards

## Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript
- **Styling**: Tailwind CSS
- **Authentication**: Supabase Auth
- **Database**: Supabase (PostgreSQL)
- **Package Manager**: pnpm

## Getting Started

### Prerequisites

1. Node.js 18+ installed
2. Supabase project created
3. Environment variables configured

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd nexsellpro-site
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Set up environment variables**
   Create a `.env.local` file in the project root:
   ```bash
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. **Set up database schema**
   Run the SQL commands from `database_setup.sql` in your Supabase SQL editor.

5. **Configure Supabase**
   - Go to Authentication → URL Configuration
   - Set Site URL: `http://localhost:3000` (dev) / `https://nexsellpro.com` (prod)
   - Add redirect URLs:
     - `http://localhost:3000/auth/callback`
     - `https://nexsellpro.com/auth/callback`
     - `http://localhost:3000/reset-password`
     - `https://nexsellpro.com/reset-password`

6. **Start development server**
   ```bash
   pnpm dev
   ```

   Open [http://localhost:3000](http://localhost:3000) to see the application.

## Available Scripts

- `pnpm dev` - Start the development server
- `pnpm build` - Build the production application
- `pnpm start` - Start the production server
- `pnpm lint` - Run ESLint

## Project Structure

```
src/
├── lib/                 # Utility libraries
│   ├── supabase.ts     # Supabase client configuration
│   └── auth-helpers.ts # Authentication helper functions
├── pages/              # Next.js pages
│   ├── api/           # API routes (with production guards)
│   ├── auth/          # Authentication pages
│   └── ...            # Other pages
└── styles/            # Global styles
```

## Security Features

- ✅ Production guards on debug API endpoints
- ✅ Environment variable validation
- ✅ TypeScript strict mode
- ✅ Source maps disabled in production
- ✅ Proper error handling without information leakage

## Deployment

The application is configured for deployment on Vercel with:
- Automatic environment variable handling
- Production optimizations enabled
- Security headers configured

## Support

For issues and questions, please refer to the documentation in the project files or contact the development team.
