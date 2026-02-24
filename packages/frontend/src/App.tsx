import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import TopNav from './components/layout/TopNav'
import PaperExamsPage from './pages/PaperExamsPage'
import ManualReviewQueuePage from './pages/ManualReviewQueuePage'
import DashboardPage from './pages/DashboardPage'
import ExamsPage from './pages/ExamsPage'
import StudentsPage from './pages/StudentsPage'
import HomeworkPage from './pages/HomeworkPage'
import GradesPage from './pages/GradesPage'

export default function App() {
  return (
    <BrowserRouter>
      <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
        <TopNav />
        <main style={{ flex: 1, overflowY: 'auto', backgroundColor: 'var(--bg-base)' }}>
          <Routes>
            <Route path="/"            element={<DashboardPage />} />
            <Route path="/students"    element={<StudentsPage />} />
            <Route path="/exams"       element={<ExamsPage />} />
            <Route path="/homework"    element={<HomeworkPage />} />
            <Route path="/grades"      element={<GradesPage />} />
            <Route path="/paper-exams" element={<PaperExamsPage />} />
            <Route path="/review"      element={<ManualReviewQueuePage />} />
            <Route path="*"            element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}
