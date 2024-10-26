import Link from 'next/link'
import { useAuth } from '../context/AuthContext'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { useState } from 'react'
import "../styles/globals.css"

export default function Header() {
  const { logout } = useAuth()
  const router = useRouter()
  const [dropdownOpen, setDropdownOpen] = useState(false)

  const handleLogout = () => {
    logout()
    router.push('/')
  }

  const toggleDropdown = () => {
    setDropdownOpen((prev) => !prev)
  }

  return (
    <header className="bg-gray-800 text-white p-4 w-full">
      <div className="flex justify-between items-center w-full px-4">
        {/* Logo and Title */}
        <Link href="/protected/dashboard" className="flex items-center space-x-2content-start">
          <Image src="/images/logo.png" alt="Logo" width={40} height={40} className="rounded-full" />
          <span className="text-2xl font-bold">XXX</span>
        </Link>

        {/* Navigation */}
        <nav className="relative">
          <ul className="flex space-x-4 items-center content-end">
            <li>
              <Link href="/protected/dashboard" className="hover:text-gray-300">Home</Link>
            </li>
            <li>
              <Link href="/protected/talente" className="hover:text-gray-300">Talente</Link>
            </li>
            <li>
              <Link href="/protected/kampftalente" className="hover:text-gray-300">Kampftalente</Link>
            </li>
            <li>
              <Link href="/protected/inventar" className="hover:text-gray-300">Inventar</Link>
            </li>
            <li>
              <Link href="/protected/kampfsimulator" className="hover:text-gray-300">Kampfsimulator</Link>
            </li>
            {/* Avatar with Dropdown */}
            <li className="relative">
              <div onClick={toggleDropdown} className="cursor-pointer rounded-full w-10 h-10 bg-white flex items-center justify-center">
                <Image src="/images/logo.png" alt="Avatar" width={40} height={40} className="rounded-full" />
              </div>
              {dropdownOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-gray-800 rounded shadow-lg z-10">
                  <ul className="py-1">
                    <li className="px-4 py-2 hover:bg-gray-700 cursor-pointer">Profile</li>
                    <li className="px-4 py-2 hover:bg-gray-700 cursor-pointer">Diary</li>
                    <li className="px-4 py-2 hover:bg-gray-700 cursor-pointer" onClick={handleLogout}>Logout</li>
                  </ul>
                </div>
              )}
            </li>
          </ul>
        </nav>
      </div>
    </header>
  )
}
