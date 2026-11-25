import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { api, getToken, setToken, setUnauthorizedHandler } from './api'

const Ctx = createContext(null)
export const useAuth = () => useContext(Ctx)
const ADMIN_BACKUP = 'b3e_admin_token'

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(!!getToken())

  const logout = useCallback(() => {
    setToken(null); sessionStorage.removeItem(ADMIN_BACKUP); setUser(null)
  }, [])

  useEffect(() => { setUnauthorizedHandler(logout) }, [logout])
  useEffect(() => {
    if (!getToken()) return
    api.get('/api/auth/me').then(setUser).catch(() => setToken(null)).finally(() => setLoading(false))
  }, [])

  const login = async (username, password) => {
    const r = await api.login(username, password)
    setToken(r.access_token)
    setUser(await api.get('/api/auth/me'))
  }

  const impersonate = async (id) => {
    const r = await api.post(`/api/users/${id}/impersonar`)
    sessionStorage.setItem(ADMIN_BACKUP, getToken())
    setToken(r.access_token)
    setUser(await api.get('/api/auth/me'))
  }
  const restore = async () => {
    const t = sessionStorage.getItem(ADMIN_BACKUP)
    if (!t) return logout()
    setToken(t); sessionStorage.removeItem(ADMIN_BACKUP)
    setUser(await api.get('/api/auth/me'))
  }
  const refresh = async () => setUser(await api.get('/api/auth/me'))

  return <Ctx.Provider value={{ user, loading, login, logout, impersonate, restore, refresh }}>{children}</Ctx.Provider>
}

// avatar fica só no navegador (como no Broker ONE original)
export const avatarKey = (u) => `bo_avatar_${u?.id || u?.username || 'user'}`
