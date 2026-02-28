import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import TopNav from './components/layout/TopNav'
import PaperExamsPage from './pages/PaperExamsPage'
import ManualReviewQueuePage from './pages/ManualReviewQueuePage'
import DashboardPage from './pages/DashboardPage'
import ClassesPage from './pages/ClassesPage'
import ExamsPage from './pages/ExamsPage'
import StudentsPage from './pages/StudentsPage'
import HomeworkPage from './pages/HomeworkPage'
import GradesPage from './pages/GradesPage'
import SettingsPage from './pages/SettingsPage'

function ComingSoon({ title }: { title: string }) {
  return (
    <div style={{ padding: '48px 40px' }}>
      <p
        className="font-mono"
        style={{ fontSize: '10px', letterSpacing: '0.15em', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '10px' }}
      >
        Coming Soon
      </p>
      <h1
        className="font-display"
        style={{ fontSize: '28px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px' }}
      >
        {title}
      </h1>
      <p style={{ fontSize: '14px', color: 'var(--text-secondary)', fontFamily: 'Lora, serif' }}>
        This section is under construction and will be available soon.
      </p>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
        <TopNav />
        <main style={{ flex: 1, overflowY: 'auto', backgroundColor: 'var(--bg-base)' }}>
          <Routes>
            <Route path="/"            element={<DashboardPage />} />
            <Route path="/classes"     element={<ClassesPage />} />
            <Route path="/students"    element={<StudentsPage />} />
            <Route path="/exams"       element={<ExamsPage />} />
            <Route path="/homework"    element={<HomeworkPage />} />
            <Route path="/grades"      element={<GradesPage />} />
            <Route path="/paper-exams" element={<PaperExamsPage />} />
            <Route path="/review"      element={<ManualReviewQueuePage />} />
            <Route path="/settings"    element={<SettingsPage />} />
            <Route path="*"            element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}
