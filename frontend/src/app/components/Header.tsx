import Link from 'next/link'
import "../styles/globals.css"


export default function Header() {
  return (
    <header className="bg-gray-800 text-white">
      <nav className="container mx-auto px-4 py-4">
        <ul className="flex justify-between items-center">
          <li>
            <Link href="/" className="text-xl font-bold">
              XXX
            </Link>
          </li>
          <li className="flex space-x-4">
            <Link href="../pages/dashboard" className="hover:text-gray-300">
              Dashboard
            </Link>
            <Link href="../pages/talente" className="hover:text-gray-300">
              Talente
            </Link>
            <Link href="../pages/kampftalente" className="hover:text-gray-300">
              Kampftalente
            </Link>
            <Link href="../pages/inventar" className="hover:text-gray-300">
              Inventar
            </Link>
            <Link href="../pages/kampfsimulator" className="hover:text-gray-300">
              Kampfsimulator
            </Link>
          </li>
        </ul>
      </nav>
    </header>
  )
}