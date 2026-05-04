'use client'
import { useApp } from '@/contexts/AppContext'

export default function Toast() {
  const { toast } = useApp()
  return (
    <div className={`toast${toast ? ' show' : ''}`}>
      {toast?.msg}
    </div>
  )
}
