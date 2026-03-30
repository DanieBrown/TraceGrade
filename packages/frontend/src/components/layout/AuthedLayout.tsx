import { Outlet, useLocation } from 'react-router-dom'
import TopNav from './TopNav'

export default function AuthedLayout() {
  const location = useLocation()

  return (
    <div className="app-shell min-h-screen lg:flex">
      <TopNav />
      <main className="min-w-0 flex-1 bg-base lg:h-screen lg:overflow-y-auto">
        <div key={location.pathname} className="route-transition min-h-full">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
