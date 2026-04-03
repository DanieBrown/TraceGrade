import { useEffect, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import TopNav from './TopNav'
import WorkspaceHeader from './WorkspaceHeader'
import { appendNavigationHistory, type NavigationHistoryEntry } from './workspaceNavigation'

export default function AuthedLayout() {
  const location = useLocation()
  const [recentHistory, setRecentHistory] = useState<NavigationHistoryEntry[]>([])

  useEffect(() => {
    setRecentHistory((currentHistory) => appendNavigationHistory(currentHistory, location.pathname))
  }, [location.pathname])

  return (
    <div className="app-shell min-h-screen lg:flex">
      <TopNav />
      <div className="min-w-0 flex-1 bg-base lg:h-screen lg:overflow-y-auto">
        <WorkspaceHeader recentHistory={recentHistory} />
        <div key={location.pathname} className="route-transition min-h-full">
          <Outlet />
        </div>
      </div>
    </div>
  )
}
