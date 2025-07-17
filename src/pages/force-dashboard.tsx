import { useEffect } from 'react';
import { useRouter } from 'next/router';

export default function ForceDashboard() {
  const router = useRouter();
  
  useEffect(() => {
    // Production redirect
    if (process.env.NODE_ENV === 'production') {
      router.replace('/');
      return;
    }
    
    // Force navigation to dashboard without any checks (development only)
    router.push('/dashboard');
  }, [router]);
  
  // Show loading while redirecting
  return (
    <div className="min-h-screen bg-neutral-dark text-white flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-4">Redirecting...</h1>
        <p className="text-gray-400">
          {process.env.NODE_ENV === 'production' 
            ? 'This page is not available in production.' 
            : 'Forcing redirect to dashboard...'
          }
        </p>
      </div>
    </div>
  );
} 