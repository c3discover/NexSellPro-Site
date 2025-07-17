import { useEffect } from 'react';
import { useRouter } from 'next/router';

function ForceDashboard() {
  const router = useRouter();
  
  useEffect(() => {
    // Force navigation to dashboard without any checks
    router.push('/dashboard');
  }, [router]);
  
  return <div>Forcing redirect to dashboard...</div>;
}

// Production redirect - remove debug pages from production builds
export default process.env.NODE_ENV === 'production' ? null : ForceDashboard; 