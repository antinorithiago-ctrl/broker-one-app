import { useCallback, useEffect, useState } from 'react'
import { api } from '../api'
import { useAuth } from '../auth'
import { Field, Icon, ICONS, Modal, Spinner, Topbar, useToast } from '../ui'

const NIVEIS = { 1: 'Colaborador', 2: 'Líder de frente', 3: 'Gerência Mesa Corporate', 4: 'Head', 5: 'Admin' }
const FRENTES = { '': '—', credito: 'Soluções de Crédito', cambio_derivativos: 'Câmbio e Derivativos', investor: 'Investor Corporate' }

function UserModal({ u, onClose, onSaved }) {
  const toast = useToast()
  const [f, setF] = useState(u.id ? { name: u.name, email: u.email || '', nivel: u.nivel, frente: u.frente || '', ativo: u.ativo, password: '' } : { username: '', name: '', email: '', nivel: 1, frente: '', password: '', ativo: true })
  const [err, setErr] = useState('')
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }))
  const save = async () => {
    try {
      const body = { ...f, nivel: Number(f.nivel), frente: f.frente || '' }
      if (u.id) { if (!body.password) delete body.password; await api.patch(`/api/users/${u.id}`, body) }
      else { if (!body.username.trim() || !body.name.trim()) return setErr('Usuário e nome são obrigatórios.'); await api.post('/api/users/', { ...body, frente: body.frente || null }) }
      toast('Usuário salvo.'); onSaved()
    } catch (e) { setErr(e.message) }
  }
  return (
    <Modal title={u.id ? `Editar ${u.username}` : 'Novo usuário'} onClose={onClose}
      footer={<><button className="btn btn-ghost" onClick={onClose}>Cancelar</button><button className="btn btn-primary" onClick={save}>Salvar</button></>}>
      <div className="form-grid">
        {!u.id && <Field label="Usuário *"><input type="text" value={f.username} onChange={(e) => set('username', e.target.value)} /></Field>}
        <Field label="Nome *"><input type="text" value={f.name} onChange={(e) => set('name', e.target.value)} /></Field>
        <Field label="E-mail"><input type="email" value={f.email} onChange={(e) => set('email', e.target.value)} /></Field>
        <Field label="Nível"><select value={f.nivel} onChange={(e) => set('nivel', e.target.value)}>{Object.entries(NIVEIS).map(([k, v]) => <option key={k} value={k}>{k} – {v}</option>)}</select></Field>
        <Field label="Frente" hint="Usada na visibilidade do Líder de frente."><select value={f.frente} onChange={(e) => set('frente', e.target.value)}>{Object.entries(FRENTES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Field>
        <Field label={u.id ? 'Nova senha (opcional)' : 'Senha * (mín. 6)'}><input type="password" value={f.password} onChange={(e) => set('password', e.target.value)} autoComplete="new-password" /></Field>
        {u.id && <Field label="Situação"><select value={f.ativo ? '1' : '0'} onChange={(e) => set('ativo', e.target.value === '1')}><option value="1">Ativo</option><option value="0">Inativo</option></select></Field>}
      </div>
      {err && <div className="alert err" style={{ marginTop: 12 }}>{err}</div>}
    </Modal>
  )
}

export default function Usuarios() {
  const { user, impersonate } = useAuth()
  const toast = useToast()
  const [list, setList] = useState(null)
  const [edit, setEdit] = useState(null)
  const load = useCallback(() => { api.get('/api/users/').then(setList).catch((e) => toast(e.message, 'error')) }, [toast])
  useEffect(load, [load])

  const reset = async (u) => {
    const nova = window.prompt(`Nova senha para ${u.username} (mín. 6 caracteres):`)
    if (!nova) return
    try { await api.post(`/api/users/${u.id}/reset-password`, { new_password: nova }); toast('Senha redefinida.') } catch (e) { toast(e.message, 'error') }
  }
  const del = async (u) => {
    if (!window.confirm(`Excluir ${u.username}?`)) return
    try { await api.del(`/api/users/${u.id}`); load() } catch (e) { toast(e.message, 'error') }
  }
  const imp = async (u) => { try { await impersonate(u.id); window.location.hash = '#/' } catch (e) { toast(e.message, 'error') } }

  return (
    <div className="page active" style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      <Topbar title="Gerenciar Usuários" right={<button className="btn btn-primary btn-sm" onClick={() => setEdit({})}><Icon d={ICONS.plus} /> Novo usuário</button>} />
      <div className="page-body">
        <div className="alert warn">Usuários migrados da versão anterior mantêm o número de nível antigo. Revise o nível de cada um (1 Colaborador · 2 Líder de frente · 3 Gerência · 4 Head · 5 Admin).</div>
        {!list ? <Spinner /> : (
          <div className="table-container" style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead><tr><th>Usuário</th><th>Nome</th><th>E-mail</th><th>Nível</th><th>Frente</th><th>Situação</th><th /></tr></thead>
              <tbody>{list.map((u) => (
                <tr key={u.id}>
                  <td className="mono">{u.username}</td><td>{u.name}</td><td>{u.email || '—'}</td>
                  <td><span className="chip chip-coral">{u.nivel} · {u.nivel_label}</span></td><td>{u.frente_label || '—'}</td>
                  <td><span className={'chip ' + (u.ativo ? 'chip-green' : 'chip-gray')}>{u.ativo ? 'Ativo' : 'Inativo'}</span></td>
                  <td><div className="row">
                    <button className="btn btn-ghost btn-sm" onClick={() => setEdit(u)}>Editar</button>
                    <button className="btn btn-ghost btn-sm" onClick={() => reset(u)}>Redefinir senha</button>
                    {u.id !== user.id && u.ativo && <button className="btn btn-ghost btn-sm" onClick={() => imp(u)}>Acessar como</button>}
                    {u.id !== user.id && <button className="btn btn-danger-ghost btn-sm" onClick={() => del(u)}>Excluir</button>}
                  </div></td>
                </tr>))}</tbody>
            </table>
          </div>
        )}
      </div>
      {edit && <UserModal u={edit} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); load() }} />}
    </div>
  )
}
