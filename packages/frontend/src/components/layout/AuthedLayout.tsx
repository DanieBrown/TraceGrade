import { Outlet, useLocation } from 'react-router-dom'
import TopNav from './TopNav'
import WorkspaceHeader from './WorkspaceHeader'

export default function AuthedLayout() {
  const location = useLocation()

  return (
    <div className="app-shell min-h-screen lg:flex">
      <TopNav />
      <div className="min-w-0 flex-1 bg-base lg:h-screen lg:overflow-y-auto">
        <WorkspaceHeader />
        <div key={location.pathname} className="route-transition min-h-full">
          <Outlet />
        </div>
      </div>
    </div>
  )
}
