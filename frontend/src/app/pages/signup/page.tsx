'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { SignUpCommand } from "@aws-sdk/client-cognito-identity-provider"
import { cognitoClient, CLIENT_ID } from '../../../cognitoConfig'

export default function SignUp() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    try {
      const command = new SignUpCommand({
        ClientId: CLIENT_ID,
        Username: email,
        Password: password,
        UserAttributes: [
          {
            Name: "name",
            Value: name,
          },
          {
            Name: "email",
            Value: email,
          },
        ],
      });

      const response = await cognitoClient.send(command);
      
      if (response.UserSub) {
        console.log("User signed up successfully:", response.UserSub);
        router.push('/confirm-signup?email=' + encodeURIComponent(email))
      } else {
        throw new Error("Sign up failed");
      }
    } catch (error) {
      setError('Failed to sign up. Please try again.')
      console.error('Error signing up:', error)
    }
  }

  return (
    <div className="flex h-screen">
      <div className="w-1/2 relative">
        <Image
          src="/signup-image.jpg"
          alt="Sign Up Image"
          layout="fill"
          objectFit="cover"
        />
      </div>
      <div className="w-1/2 flex items-center justify-center bg-gray-100">
        <div className="w-full max-w-md p-8 space-y-8 bg-white rounded-lg shadow-md">
          <div className="flex justify-center">
            <Image src="/logo.png" alt="Logo" width={100} height={100} />
          </div>
          <h1 className="text-2xl font-bold text-center text-gray-900">Sign Up</h1>
          {error && <p className="text-red-500 text-center">{error}</p>}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                Name
              </label>
              <input
                id="name"
                name="name"
                type="text"
                required
                className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <div>
              <button
                type="submit"
                className="w-full px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                Sign Up
              </button>
            </div>
          </form>
          <div className="text-sm text-center">
            <Link href="/signin" className="font-medium text-blue-600 hover:text-blue-500">
              Already have an account? Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}