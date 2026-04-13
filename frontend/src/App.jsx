import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import Layout from './components/Layout'
import LoginPage from './pages/LoginPage'
import AuthCallbackPage from './pages/AuthCallbackPage'
import DashboardPage from './pages/DashboardPage'
import DeckPage from './pages/DeckPage'
import CollectionPage from './pages/CollectionPage'
import ProfilePage from './pages/ProfilePage'
import ImportDeckPage from './pages/ImportDeckPage'
import LeaguesPage from './pages/LeaguesPage'
import LeaguePage from './pages/LeaguePage'
import LogGamePage from './pages/LogGamePage'
import JoinLeaguePage from './pages/JoinLeaguePage'
import HelpPage from './pages/HelpPage'
import IconShowcasePage from './pages/IconShowcasePage'

function AnimatedRoutes() {
  const location = useLocation()
  
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/deck/:deckId" element={<DeckPage />} />
        <Route path="/collection" element={<CollectionPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/help" element={<HelpPage />} />
        {import.meta.env.DEV && <Route path="/icons-dev" element={<IconShowcasePage />} />}
        <Route path="/decks/import" element={<ImportDeckPage />} />
        <Route path="/leagues" element={<LeaguesPage />} />
        <Route path="/leagues/:leagueId" element={<LeaguePage />} />
        <Route path="/leagues/:leagueId/log-game" element={<LogGamePage />} />
        <Route path="/leagues/join/:inviteToken" element={<JoinLeaguePage />} />
      </Routes>
    </AnimatePresence>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/auth/callback" element={<AuthCallbackPage />} />
          <Route
            path="/*"
            element={
              <ProtectedRoute>
                <Layout>
                  <AnimatedRoutes />
                </Layout>
              </ProtectedRoute>
            }
          />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
