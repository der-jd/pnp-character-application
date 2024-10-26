'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { AuthProvider, useAuth } from '../context/AuthContext'
import Header from '../components/Header'
import Footer from '../components/Footer'

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
        <AuthProvider>
            <Header />
                <main>{children}</main>
            <Footer />
        </AuthProvider>
    </>
  )
}