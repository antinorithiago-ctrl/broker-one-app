import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './auth'
import Login from './pages/Login'
import Layout from './pages/Layout'
import Home from './pages/Home'
import TermoCaixa from './pages/termo/TermoCaixa'
import Pilott from './pages/Pilott'
import Clientes from './pages/Clientes'
import Usuarios from './pages/Usuarios'
import Parametrizacao from './pages/Parametrizacao'
import { Spinner } from './ui'

export default function App() {
  const { user, loading } = useAuth()
  if (loading) return <Spinner />
  if (!user) return <Login />
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="termo-caixa" element={<TermoCaixa />} />
        <Route path="pilott" element={<Pilott />} />
        <Route path="clientes" element={<Clientes />} />
        <Route path="parametrizacao" element={user.nivel >= 5 ? <Parametrizacao /> : <Navigate to="/" replace />} />
        <Route path="usuarios" element={user.nivel >= 5 ? <Usuarios /> : <Navigate to="/" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
