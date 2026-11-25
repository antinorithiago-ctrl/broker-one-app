export const API_BASE = (import.meta.env.VITE_API_URL || 'https://broker-one-backend-production-90c9.up.railway.app').replace(/\/$/, '')

const KEY = 'b3e_token'
let onUnauthorized = () => {}
export const setUnauthorizedHandler = (fn) => { onUnauthorized = fn }
export const getToken = () => sessionStorage.getItem(KEY)
export const setToken = (t) => (t ? sessionStorage.setItem(KEY, t) : sessionStorage.removeItem(KEY))

export class ApiError extends Error {
  constructor(message, status) { super(message); this.status = status }
}

function errMsg(body, status) {
  const d = body && body.detail
  if (typeof d === 'string') return d
  if (Array.isArray(d)) return d.map((x) => x.msg).join('; ')
  return `Erro ${status}`
}

async function raw(path, { method = 'GET', body, form, headers = {}, blob } = {}) {
  const h = { ...headers }
  const t = getToken()
  if (t) h.Authorization = `Bearer ${t}`
  let payload
  if (form) payload = form
  else if (body !== undefined) { h['Content-Type'] = 'application/json'; payload = JSON.stringify(body) }
  let res
  try {
    res = await fetch(API_BASE + path, { method, headers: h, body: payload })
  } catch {
    throw new ApiError('Não foi possível conectar ao servidor. Verifique sua internet.', 0)
  }
  if (res.status === 401 && path !== '/api/auth/login') { onUnauthorized(); throw new ApiError('Sessão expirada. Entre novamente.', 401) }
  if (!res.ok) {
    let b = null
    try { b = await res.json() } catch { /* sem corpo */ }
    throw new ApiError(errMsg(b, res.status), res.status)
  }
  if (blob) return res.blob()
  if (res.status === 204) return null
  return res.json()
}

export const api = {
  get: (p) => raw(p),
  post: (p, body) => raw(p, { method: 'POST', body }),
  put: (p, body) => raw(p, { method: 'PUT', body }),
  patch: (p, body) => raw(p, { method: 'PATCH', body }),
  del: (p) => raw(p, { method: 'DELETE' }),
  upload: (p, form) => raw(p, { method: 'POST', form }),
  blobPost: (p, body) => raw(p, { method: 'POST', body, blob: true }),
  blobGet: (p) => raw(p, { blob: true }),
  login: async (username, password) => {
    const f = new URLSearchParams({ username, password })
    return raw('/api/auth/login', { method: 'POST', form: f })
  },
}
