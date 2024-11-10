import Link from 'next/link'
import { useAuth } from '../context/AuthContext'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { useState } from 'react'

import { Button } from "@/components/ui/button";

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
    <header className="p-4 w-full bg-gray-300">
    <div className="container max-w-5xl mx-auto flex justify-center items-center px-4">
      {/* Navigation */}
      <nav className="relative">
        <ul className="flex space-x-4 items-center">
          <li>
            <Link href="/protected/dashboard">
              <Button className="bg-black text-white hover:bg-gray-300 hover:text-black px-4 py-2">
                Dashboard
              </Button>
            </Link>
          </li>
          <li>
            <Link href="/protected/talente">
              <Button className="bg-black text-white hover:bg-gray-300 hover:text-black px-4 py-2">
                Skills
              </Button>
            </Link>
          </li>
          <li>
            <Link href="/protected/kampftalente">
              <Button className="bg-black text-white hover:bg-gray-300 hover:text-black px-4 py-2">
                Combat Skills
              </Button>
            </Link>
          </li>
          <li>
            <Link href="/protected/inventar">
              <Button className="bg-black text-white hover:bg-gray-300 hover:text-black px-4 py-2">
                Inventory
              </Button>
            </Link>
          </li>
        </ul>
      </nav>
    </div>
  </header>
  )
}
