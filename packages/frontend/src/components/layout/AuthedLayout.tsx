import { Outlet } from 'react-router-dom'
import TopNav from './TopNav'

export default function AuthedLayout() {
  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <TopNav />
      <main style={{ flex: 1, overflowY: 'auto', backgroundColor: 'var(--bg-base)' }}>
        <Outlet />
      </main>
    </div>
  )
}
