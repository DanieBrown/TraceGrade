import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import TopNav from './components/layout/TopNav'
import PaperExamsPage from './pages/PaperExamsPage'

function Placeholder({ title }: { title: string }) {
  return (
    <div className="max-w-7xl mx-auto px-6 py-12">
      <h1 className="text-2xl font-semibold text-gray-900">{title}</h1>
      <p className="mt-2 text-gray-500">Coming soon.</p>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <TopNav />
        <main className="flex-1">
          <Routes>
            <Route path="/"            element={<Placeholder title="Dashboard" />} />
            <Route path="/students"    element={<Placeholder title="Students" />} />
            <Route path="/exams"       element={<Placeholder title="Exams" />} />
            <Route path="/homework"    element={<Placeholder title="Homework" />} />
            <Route path="/grades"      element={<Placeholder title="Grades" />} />
            <Route path="/paper-exams" element={<PaperExamsPage />} />
            <Route path="*"            element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}
