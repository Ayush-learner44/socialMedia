import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import Login from './pages/Login'
import Feed from './pages/Feed'
import Profile from './pages/Profile'
import DM from './pages/DM'

function PrivateRoute({ children }) {
  const { token } = useAuth()
  return token ? children : <Navigate to="/login" replace />
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/feed" element={<PrivateRoute><Feed /></PrivateRoute>} />
          <Route path="/profile/:userId" element={<PrivateRoute><Profile /></PrivateRoute>} />
          <Route path="/dm/:userId" element={<PrivateRoute><DM /></PrivateRoute>} />
          <Route path="*" element={<Navigate to="/feed" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
