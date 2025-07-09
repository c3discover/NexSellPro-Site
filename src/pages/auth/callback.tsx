// src/pages/auth/callback.tsx
import { useEffect } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '@/lib/supabase'

export default function AuthCallback() {
  const router = useRouter()

  useEffect(() => {
    const handleAuth = async () => {
      const { data, error } = await supabase.auth.getSession()

      if (data?.session) {
        // Logged in successfully
        router.replace('/dashboard')
      } else {
        console.error('Auth error:', error)
        router.replace('/login')
      }
    }

    handleAuth()
  }, [router])

  return <p>Redirecting...</p>
} 