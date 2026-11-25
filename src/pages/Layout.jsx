import { useEffect, useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth, avatarKey } from '../auth'
import { api } from '../api'
import { Icon, ICONS, Modal, Field, useToast } from '../ui'
import { initials } from '../format'

const I = {
  home: 'M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2zM9 22V12h6v10',
  calc: 'M4 2h16a2 2 0 012 2v16a2 2 0 01-2 2H4a2 2 0 01-2-2V4a2 2 0 012-2zM8 6h8M8 10h.01M12 10h.01M16 10h.01M8 14h.01M12 14h.01M16 14h.01M8 18h8',
  users: 'M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75',
  cog: 'M12 15a3 3 0 100-6 3 3 0 000 6z',
  pilott: 'M3 4h6v16H3zM10.5 4h6v10h-6zM18 4h3v7h-3z',
  logout: 'M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9',
}

function Item({ to, icon, children, end }) {
  return (
    <NavLink to={to} end={end} className={({ isActive }) => 'nav-item' + (isActive ? ' active' : '')}>
      <Icon d={icon} sw={1.9} />{children}
    </NavLink>
  )
}
const Soon = ({ children }) => (
  <div className="nav-item disabled"><Icon d={I.calc} sw={1.9} />{children}<span className="nav-soon">em breve</span></div>
)

export function Avatar({ user, size }) {
  const img = localStorage.getItem(avatarKey(user))
  return img ? <img src={img} alt="" /> : <span style={{ fontFamily: 'var(--font-mono)' }}>{initials(user.name)}</span>
}

function PerfilModal({ onClose }) {
  const { user, refresh } = useAuth()
  const toast = useToast()
  const [name, setName] = useState(user.name)
  const [email, setEmail] = useState(user.email || '')
  const [pa, setPa] = useState(''); const [pn, setPn] = useState(''); const [pc, setPc] = useState('')
  const [err, setErr] = useState('')
  const [, force] = useState(0)

  const onFile = (e) => {
    const f = e.target.files[0]
    if (!f) return
    if (f.size > 1.5 * 1024 * 1024) return setErr('Imagem muito grande (máx. 1,5 MB).')
    const r = new FileReader()
    r.onload = () => { localStorage.setItem(avatarKey(user), r.result); force((n) => n + 1) }
    r.readAsDataURL(f)
  }
  const save = async () => {
    setErr('')
    try {
      await api.patch('/api/auth/me', { name, email })
      if (pa || pn || pc) {
        if (pn !== pc) return setErr('A confirmação da nova senha não confere.')
        await api.post('/api/auth/change-password', { senha_atual: pa, nova_senha: pn })
      }
      await refresh(); toast('Perfil atualizado.'); onClose()
    } catch (ex) { setErr(ex.message) }
  }
  return (
    <Modal title="Meu perfil" onClose={onClose} width={440}
      footer={<><button className="btn btn-ghost" onClick={onClose}>Cancelar</button><button className="btn btn-primary" onClick={save}>Salvar</button></>}>
      <div className="row" style={{ marginBottom: 16 }}>
        <div className="avatar-big"><Avatar user={user} /></div>
        <label className="btn btn-ghost btn-sm" style={{ cursor: 'pointer' }}>Trocar foto<input type="file" accept="image/*" hidden onChange={onFile} /></label>
        <span className="muted small">A foto fica salva só neste navegador.</span>
      </div>
      <Field label="Nome"><input type="text" value={name} onChange={(e) => setName(e.target.value)} /></Field>
      <Field label="E-mail" style={{ marginTop: 10 }}><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
      <Field label="Nível de acesso" style={{ marginTop: 10 }}><input type="text" readOnly value={user.nivel_label + (user.frente_label ? ` · ${user.frente_label}` : '')} /></Field>
      <div className="form-section-label" style={{ margin: '16px 0 8px' }}>Alterar senha (opcional)</div>
      <Field label="Senha atual"><input type="password" value={pa} onChange={(e) => setPa(e.target.value)} autoComplete="current-password" /></Field>
      <div className="grid-2" style={{ marginTop: 10 }}>
        <Field label="Nova senha"><input type="password" value={pn} onChange={(e) => setPn(e.target.value)} autoComplete="new-password" /></Field>
        <Field label="Confirmar"><input type="password" value={pc} onChange={(e) => setPc(e.target.value)} autoComplete="new-password" /></Field>
      </div>
      {err && <div className="alert err" style={{ marginTop: 12 }}>{err}</div>}
    </Modal>
  )
}

export default function Layout() {
  const { user, logout, restore } = useAuth()
  const [perfil, setPerfil] = useState(false)
  const nav = useNavigate()
  return (
    <div id="app-shell" style={{ display: 'flex', width: '100%', height: '100vh', overflow: 'hidden' }}>
      <nav className="sidebar">
        <div className="brand">
          <img src="/logo.png" alt="" style={{ width: 32, height: 32, borderRadius: 9, flexShrink: 0 }} />
          <div><div className="brand-text">BROKER <span>ONE</span></div><div className="brand-sub">Mesa Corporate</div></div>
        </div>
        <div className="sidebar-scroll">
          <Item to="/" end icon={I.home}>Home</Item>
          <div className="nav-section-label">Soluções de Crédito</div>
          <Item to="/termo-caixa" icon={I.calc}>Termo Caixa</Item>
          <div className="nav-section-label">Câmbio e Derivativos</div>
          <Soon>Em construção</Soon>
          <div className="nav-section-label">Investor Corporate</div>
          <Soon>Em construção</Soon>
          <div className="nav-section-label">Produtividade</div>
          <Item to="/pilott" icon={I.pilott}>Pilott</Item>
          <div className="nav-section-label">Cadastros</div>
          <Item to="/clientes" icon={I.users}>Clientes</Item>
          {user.nivel >= 5 && <Item to="/parametrizacao" icon={I.cog}>Parametrização</Item>}
          {user.nivel >= 5 && <Item to="/usuarios" icon={I.users}>Gerenciar Usuários</Item>}
        </div>
        <div className="sidebar-footer">
          <div className="sidebar-avatar" onClick={() => setPerfil(true)} style={{ cursor: 'pointer', overflow: 'hidden' }} title="Meu perfil"><Avatar user={user} /></div>
          <div className="sidebar-user-info">
            <div className="sidebar-user-name">{user.name || user.username}</div>
            <div className="sidebar-user-role">{user.nivel_label}</div>
          </div>
          <button className="sidebar-icon-btn" onClick={() => { logout(); nav('/') }} title="Sair"><Icon d={I.logout} /></button>
        </div>
      </nav>
      <div className="main" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0 }}>
        <Outlet />
      </div>
      {user.impersonado_por && (
        <div className="imp-bar">
          <span>Visualizando como: <strong>{user.name}</strong> (sessão de {user.impersonado_por})</span>
          <button onClick={async () => { await restore(); nav('/usuarios') }}>Restaurar minha sessão</button>
        </div>
      )}
      {perfil && <PerfilModal onClose={() => setPerfil(false)} />}
    </div>
  )
}
