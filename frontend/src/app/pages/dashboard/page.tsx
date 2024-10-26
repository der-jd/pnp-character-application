'use client'

import { withAuth } from '../../components/withAuth'

function Dashboard() {
  return (
    <div>
      <h1>Welcome to your Dashboard</h1>
      {/* Add your dashboard content here */}
    </div>
  )
}

export default withAuth(Dashboard)