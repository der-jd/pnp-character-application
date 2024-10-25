import Image from 'next/image'
import Link from 'next/link'

export default function SplashScreen() {
  return (
    <div className="flex h-screen">
      <div className="w-1/2 relative">
        <Image
          src="/splash-image.jpg"
          alt="Splash Image"
          layout="fill"
          objectFit="cover"
        />
      </div>
      <div className="w-1/2 flex flex-col items-center justify-center bg-gray-100">
        <div className="w-full max-w-md p-8 space-y-8">
          <div className="flex justify-center">
            <Image src="/logo.png" alt="Logo" width={100} height={100} />
          </div>
          <h1 className="text-3xl font-bold text-center text-gray-900">Welcome to DSA</h1>
          <p className="text-center text-gray-600">Your ultimate companion for Das Schwarze Auge</p>
          <div className="space-y-4">
            <Link href="/signin" className="block w-full px-4 py-2 text-center text-white bg-blue-600 rounded-md hover:bg-blue-700">
              Sign In
            </Link>
            <Link href="/signup" className="block w-full px-4 py-2 text-center text-blue-600 bg-white border border-blue-600 rounded-md hover:bg-blue-50">
              Sign Up
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}