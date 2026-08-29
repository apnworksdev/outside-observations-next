'use client'

import {useEffect} from 'react'
import {useRouter} from 'next/navigation'

const REFRESH_MS = 1500

export default function PreviewRefresher() {
  const router = useRouter()

  useEffect(() => {
    const timer = setInterval(() => router.refresh(), REFRESH_MS)
    return () => clearInterval(timer)
  }, [router])

  return null
}
