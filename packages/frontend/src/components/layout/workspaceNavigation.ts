export interface WorkspaceNavigationItem {
  label: string
  to: string
  description: string
  end: boolean
}

export interface NavigationHistoryEntry {
  label: string
  path: string
}

export const WORKSPACE_NAVIGATION_ITEMS: WorkspaceNavigationItem[] = [
  { label: 'Dashboard', to: '/', description: 'Overview and workload', end: true },
  { label: 'Exams', to: '/exams', description: 'Assessments and grading', end: false },
  { label: 'Homework', to: '/homework', description: 'Assignments and submissions', end: false },
  { label: 'Classes', to: '/classes', description: 'Class rosters and activity', end: false },
  { label: 'Students', to: '/students', description: 'Learner profiles and progress', end: false },
  { label: 'Grades', to: '/grades', description: 'Performance reporting', end: false },
  { label: 'Review Queue', to: '/review', description: 'Confidence-based checks', end: false },
  { label: 'Settings', to: '/settings', description: 'Thresholds and preferences', end: false },
]

export function getSectionMeta(pathname: string): { eyebrow: string; title: string } {
  if (pathname.startsWith('/classes')) {
    return { eyebrow: 'Teacher workspace', title: 'Classes' }
  }

  if (pathname.startsWith('/students')) {
    return { eyebrow: 'Teacher workspace', title: 'Students' }
  }

  if (pathname.startsWith('/exams')) {
    return { eyebrow: 'Teacher workspace', title: 'Exams' }
  }

  if (pathname.startsWith('/homework')) {
    return { eyebrow: 'Teacher workspace', title: 'Homework' }
  }

  if (pathname.startsWith('/grades')) {
    return { eyebrow: 'Teacher workspace', title: 'Grades' }
  }

  if (pathname.startsWith('/review')) {
    return { eyebrow: 'Teacher workspace', title: 'Review Queue' }
  }

  if (pathname.startsWith('/settings')) {
    return { eyebrow: 'Teacher workspace', title: 'Settings' }
  }

  return { eyebrow: 'Teacher workspace', title: 'Dashboard' }
}

export function getTrackedNavigationEntry(pathname: string): NavigationHistoryEntry | null {
  const matchedItem = WORKSPACE_NAVIGATION_ITEMS.find((item) => item.to === pathname)
  if (!matchedItem) {
    return null
  }

  return {
    label: matchedItem.label,
    path: matchedItem.to,
  }
}

export function appendNavigationHistory(
  history: NavigationHistoryEntry[],
  pathname: string,
  maxEntries = 5,
): NavigationHistoryEntry[] {
  const nextEntry = getTrackedNavigationEntry(pathname)
  if (!nextEntry) {
    return history
  }

  const previousEntry = history[history.length - 1]
  if (previousEntry?.path === nextEntry.path) {
    return history
  }

  const nextHistory = [...history, nextEntry]
  if (nextHistory.length <= maxEntries) {
    return nextHistory
  }

  return nextHistory.slice(nextHistory.length - maxEntries)
}