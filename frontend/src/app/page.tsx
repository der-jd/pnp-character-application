'use client'

import { useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from './context/AuthContext'

export default function SplashScreen() {
  const { isAuthenticated, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && isAuthenticated) {
      router.push('protected/dashboard');
    }
  }, [isAuthenticated, loading, router]);

  if (loading) {
    return <div>Loading...</div>;
  }

  if (isAuthenticated) {
    return null;
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <div className="w-1/2 relative">
        <Image
          src="/images/splash-image.png"
          alt="Splash Image"
          layout="fill"
          objectFit="cover"
          priority
        />
      </div>
      <div className="w-1/2 flex flex-col items-center justify-center bg-gray-100 overflow-y-auto">
        <div className="w-full max-w-md p-8 space-y-8">
          <div className="flex justify-center">
            <Image src="/images/logo.png" alt="Logo" width={100} height={100} />
          </div>
          <h1 className="text-3xl font-bold text-center text-gray-900">Welcome to XXX</h1>
          <p className="text-center text-gray-600">Your ultimate character management companion</p>
          <div className="space-y-4">
            <Link href="/auth/signin" className="block w-full px-4 py-2 text-center text-white bg-blue-600 rounded-md hover:bg-blue-700">
              Sign In
            </Link>
            <Link href="/auth/signup" className="block w-full px-4 py-2 text-center text-blue-600 bg-white border border-blue-600 rounded-md hover:bg-blue-50">
              Sign Up
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}