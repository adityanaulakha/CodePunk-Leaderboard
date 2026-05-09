import { Navigate, Route, Routes } from 'react-router-dom'
import AdminPage from './pages/AdminPage.jsx'
import LeaderboardPage from './pages/LeaderboardPage.jsx'
import JudgePage from './pages/JudgePage.jsx'
import PodiumPage from './pages/PodiumPage.jsx'
import DashboardPage from './pages/DashboardPage.jsx'
import LandingPage from './pages/LandingPage.jsx'
import AuthPage from './pages/AuthPage.jsx'
import DocsPage from './pages/DocsPage.jsx'
import JudgingAssignmentsPage from './pages/JudgingAssignmentsPage.jsx'

function App() {
  return (
    <div className="min-h-dvh bg-zinc-950 text-zinc-100">
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<AuthPage />} />
        <Route path="/docs" element={<DocsPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/assignments" element={<JudgingAssignmentsPage />} />
        <Route path="/:hackathonId" element={<LeaderboardPage />} />
        <Route path="/:hackathonId/admin" element={<AdminPage />} />
        <Route path="/:hackathonId/judge" element={<JudgePage />} />
        <Route path="/:hackathonId/podium" element={<PodiumPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  )
}

export default App
