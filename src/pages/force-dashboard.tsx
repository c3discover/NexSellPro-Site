import { useEffect } from 'react';
import { useRouter } from 'next/router';

// Production redirect - remove debug pages from production builds
if (process.env.NODE_ENV === 'production') {
  // This will be executed at build time in production
  // The page will not be included in the production bundle
  return null;
}

export default function ForceDashboard() {
  const router = useRouter();
  
  useEffect(() => {
    // Force navigation to dashboard without any checks
    router.push('/dashboard');
  }, [router]);
  
  return <div>Forcing redirect to dashboard...</div>;
} 