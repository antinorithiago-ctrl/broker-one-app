import { useState } from 'react'
import { useAuth } from '../auth'

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
    <div className="lg-shell">
      <div className="lg-brand">
        <img className="lg-brand-mark" src="/blue3-mark-white.png" alt="" aria-hidden="true" />
        <div className="lg-logo-row">
          <img src="/blue3-wordmark-white.png" alt="Blue3" />
          <span>Empresas</span>
        </div>
        <div className="lg-hero">
          <div className="lg-kicker">Mesa Corporate</div>
          <h1>Crédito, câmbio e liquidez para empresas.</h1>
          <p>Simule, acompanhe e execute as operações da mesa em um só lugar.</p>
        </div>
        <div className="lg-foot">Blue3 Investimentos · Assessoria XP</div>
      </div>

      <div className="lg-form-wrap">
        <form className="lg-card" onSubmit={submit}>
          <div>
            <img className="lg-icon" src="/logo.png" alt="" />
            <h2>Acesse sua conta</h2>
            <p className="lg-sub">Entre com seu usuário para acessar a mesa.</p>
          </div>
          <div>
            <label className="lg-field" htmlFor="lu">Usuário
              <input id="lu" type="text" value={u} onChange={(e) => setU(e.target.value)} placeholder="seu.usuario" autoComplete="username" autoFocus />
            </label>
            <label className="lg-field" htmlFor="lp">Senha
              <div style={{ position: 'relative' }}>
                <input id="lp" type={show ? 'text' : 'password'} value={p} onChange={(e) => setP(e.target.value)} placeholder="••••••••" autoComplete="current-password" style={{ paddingRight: 72 }} />
                <button type="button" onClick={() => setShow(!show)} style={{ position: 'absolute', right: 10, top: 14, background: 'none', border: 'none', color: 'var(--coral)', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>{show ? 'ocultar' : 'mostrar'}</button>
              </div>
            </label>
            {err && <div className="alert err" role="alert">{err}</div>}
            <button className="btn btn-primary lg-submit" disabled={busy} type="submit">{busy ? 'Entrando...' : 'Entrar'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}
