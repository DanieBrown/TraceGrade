import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'sonner'
import AuthedLayout from './components/layout/AuthedLayout'
import ProtectedRoute from './components/auth/ProtectedRoute'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import ExamRubricPage from './pages/ExamRubricPage'
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
      <Toaster
        position="top-right"
        theme="dark"
        toastOptions={{
          unstyled: true,
          classNames: {
            toast: 'w-[min(32rem,calc(100vw-2rem))] max-w-none rounded-2xl border px-4 py-3 shadow-[0_16px_40px_rgba(0,0,0,0.28)]',
            title: 'break-words whitespace-normal pr-6 font-display text-sm font-semibold leading-5 text-inherit',
            description: 'break-words whitespace-normal pr-6 font-body text-sm leading-5 text-inherit/90',
            actionButton: 'rounded-lg bg-gold-500 px-3 py-2 font-display text-xs font-semibold text-[var(--bg-base)] transition-colors hover:bg-gold-600',
            cancelButton: 'rounded-lg border border-current/20 px-3 py-2 font-display text-xs font-semibold text-inherit transition-colors hover:border-current/40',
            closeButton: 'border border-current/15 bg-black/10 text-inherit transition-colors hover:bg-black/20',
            success: 'border-teal-400 bg-teal-500 text-navy-950',
            error: 'border-crimson-400 bg-crimson-500 text-white',
            warning: 'border-gold-400 bg-gold-500 text-navy-950',
          },
        }}
      />
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
          <Route path='/exams/:examId/rubrics' element={<ExamRubricPage />} />
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
