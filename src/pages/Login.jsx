import { useState } from 'react'
import { useAuth } from '../auth'

const inp = { width: '100%', boxSizing: 'border-box' }
const lbl = { display: 'block', fontFamily: 'var(--font-mono)', fontSize: 10, color: '#6B7685', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 5 }

export default function Login() {
  const { login } = useAuth()
  const [u, setU] = useState('')
  const [p, setP] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const [show, setShow] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    if (!u.trim() || !p) return setErr('Informe usuário e senha.')
    setBusy(true); setErr('')
    try { await login(u.trim(), p) } catch (ex) { setErr(ex.message) } finally { setBusy(false) }
  }

  return (
    <div className="login-shell">
      <form onSubmit={submit} style={{ background: '#111519', border: '1px solid #252C35', borderRadius: 16, padding: '40px 36px 36px', width: '100%', maxWidth: 360, boxShadow: '0 24px 64px rgba(0,0,0,.6)', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 32 }}>
          <img src="/logo.png" alt="" style={{ width: 44, height: 44, borderRadius: 12 }} />
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, color: '#E8EBF0', letterSpacing: '-.02em', lineHeight: 1.1 }}>BROKER <span style={{ color: '#E05A3A' }}>ONE</span></div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: '#6B7685', letterSpacing: '.1em', textTransform: 'uppercase', marginTop: 2 }}>Mesa Corporate · Blue3 Empresas</div>
          </div>
        </div>
        <div style={{ fontSize: 22, fontWeight: 800, color: '#E05A3A', letterSpacing: '-.02em', marginBottom: 6 }}>Bem-vindo de volta</div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#6B7685', letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: 28 }}>Acesse sua plataforma</div>
        <div style={{ marginBottom: 14 }}>
          <label style={lbl} htmlFor="lu">Usuário</label>
          <input id="lu" type="text" value={u} onChange={(e) => setU(e.target.value)} placeholder="seu.usuario" autoComplete="username" autoFocus style={inp} />
        </div>
        <div style={{ marginBottom: 20 }}>
          <label style={lbl} htmlFor="lp">Senha</label>
          <div style={{ position: 'relative' }}>
            <input id="lp" type={show ? 'text' : 'password'} value={p} onChange={(e) => setP(e.target.value)} placeholder="••••••••" autoComplete="current-password" style={{ ...inp, paddingRight: 56 }} />
            <button type="button" onClick={() => setShow(!show)} style={{ position: 'absolute', right: 8, top: 6, background: 'none', border: 'none', color: '#6B7685', fontSize: 11, cursor: 'pointer' }}>{show ? 'ocultar' : 'mostrar'}</button>
          </div>
        </div>
        {err && <div className="alert err" role="alert">{err}</div>}
        <button className="btn btn-primary" disabled={busy} type="submit" style={{ borderRadius: 100, padding: 13, width: '100%', justifyContent: 'center', fontSize: 14, fontWeight: 800 }}>
          {busy ? 'Entrando...' : 'Entrar'}
        </button>
      </form>
    </div>
  )
}
