import { Navigate, Route, Routes } from 'react-router-dom'
import AdminPage from './pages/AdminPage.jsx'
import LeaderboardPage from './pages/LeaderboardPage.jsx'
import JudgePage from './pages/JudgePage.jsx'
import PodiumPage from './pages/PodiumPage.jsx'

function App() {
  return (
    <div className="min-h-dvh bg-zinc-950 text-zinc-100">
      <Routes>
        <Route path="/" element={<LeaderboardPage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/judge" element={<JudgePage />} />
        <Route path="/podium" element={<PodiumPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  )
}

export default App
