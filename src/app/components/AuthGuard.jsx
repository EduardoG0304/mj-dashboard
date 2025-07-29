'use client'
import { useEffect } from 'react'
import { supabase } from '@/app/lib/supabase'
import { useRouter } from 'next/navigation'

// Lista de usuarios permitidos
const ALLOWED_USERS = [
  'renegarciagarcia11@gmail.com',
  'mjfotografiasport@gmail.com'
]

export default function AuthGuard({ children }) {
  const router = useRouter()

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      
      // Redirige si no está autenticado o no está en la lista permitida
      if (!user || !ALLOWED_USERS.includes(user.email)) {
        router.push('/login')
      }
    }

    checkAuth()
  }, [router])

  return <>{children}</>
}