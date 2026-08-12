import { Routes, Route } from 'react-router-dom'
import { ProgressProvider } from './contexts/ProgressContext'
import HomePage from './pages/HomePage'
import LibraryPage from './pages/LibraryPage'
import StatsPage from './pages/StatsPage'
import DashboardPage from './pages/admin/DashboardPage'
import ArticleManagePage from './pages/admin/ArticleManagePage'
import UserManagePage from './pages/admin/UserManagePage'

function App() {
  return (
    <ProgressProvider>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/article/:id" element={<HomePage />} />
        <Route path="/library" element={<LibraryPage />} />
        <Route path="/stats" element={<StatsPage />} />
        <Route path="/admin" element={<DashboardPage />} />
        <Route path="/admin/articles" element={<ArticleManagePage />} />
        <Route path="/admin/users" element={<UserManagePage />} />
      </Routes>
    </ProgressProvider>
  )
}

export default App
