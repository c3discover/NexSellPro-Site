import { useEffect } from 'react';
import { useRouter } from 'next/router';

export default function ForceDashboard() {
  const router = useRouter();
  
  useEffect(() => {
    // Force navigation to dashboard without any checks
    router.push('/dashboard');
  }, [router]);
  
  return <div>Forcing redirect to dashboard...</div>;
} 