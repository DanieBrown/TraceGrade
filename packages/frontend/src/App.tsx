import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import AuthedLayout from './components/layout/AuthedLayout'
import ProtectedRoute from './components/auth/ProtectedRoute'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import PaperExamsPage from './pages/PaperExamsPage'
import ManualReviewQueuePage from './pages/ManualReviewQueuePage'
import DashboardPage from './pages/DashboardPage'
import ClassesPage from './pages/ClassesPage'
import ExamsPage from './pages/ExamsPage'
import StudentsPage from './pages/StudentsPage'
import HomeworkPage from './pages/HomeworkPage'
import GradesPage from './pages/GradesPage'
import SettingsPage from './pages/SettingsPage'
import BatchGradingPage from './pages/BatchGradingPage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes — no TopNav */}
        <Route path='/login' element={<LoginPage />} />
        <Route path='/register' element={<RegisterPage />} />
        {/* Authenticated routes — ProtectedRoute + AuthedLayout layout */}
        <Route element={<ProtectedRoute><AuthedLayout /></ProtectedRoute>}>
          <Route path='/' element={<DashboardPage />} />
          <Route path='/classes' element={<ClassesPage />} />
          <Route path='/students' element={<StudentsPage />} />
          <Route path='/exams' element={<ExamsPage />} />
          <Route path='/exams/:examId' element={<PaperExamsPage />} />
          <Route path='/homework' element={<HomeworkPage />} />
          <Route path='/grades' element={<GradesPage />} />
          <Route path='/classes/:classId/batch-grading' element={<BatchGradingPage />} />
          <Route path='/review' element={<ManualReviewQueuePage />} />
          <Route path='/settings' element={<SettingsPage />} />
          <Route path='*' element={<Navigate to='/' replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
