import { useCallback, useEffect, useState } from 'react'
import { api } from '../api'
import { useAuth } from '../auth'
import { Field, Icon, ICONS, Modal, Spinner, Topbar, useToast } from '../ui'

const VAZIO = { conta_xp: '', nome: '', assessor: '', lider: '', filial: '', regional: '', quem_atende: '' }

function ClienteModal({ c, onClose, onSaved }) {
  const toast = useToast()
  const [f, setF] = useState({ ...VAZIO, ...c })
  const [err, setErr] = useState('')
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }))
  const save = async () => {
    if (!f.conta_xp.trim() || !f.nome.trim()) return setErr('Conta XP e nome são obrigatórios.')
    const body = Object.fromEntries(Object.entries(f).filter(([k]) => k !== 'id').map(([k, v]) => [k, v === '' ? null : v]))
    try {
      if (c.id) { delete body.conta_xp; await api.patch(`/api/clientes/${c.id}`, body) } else await api.post('/api/clientes/', body)
      toast('Cliente salvo.'); onSaved()
    } catch (e) { setErr(e.message) }
  }
  return (
    <Modal title={c.id ? 'Editar cliente' : 'Novo cliente'} onClose={onClose}
      footer={<><button className="btn btn-ghost" onClick={onClose}>Cancelar</button><button className="btn btn-primary" onClick={save}>Salvar</button></>}>
      <div className="form-grid">
        <Field label="Conta XP *"><input type="text" value={f.conta_xp || ''} readOnly={!!c.id} onChange={(e) => set('conta_xp', e.target.value)} /></Field>
        <Field label="Nome do cliente *"><input type="text" value={f.nome || ''} onChange={(e) => set('nome', e.target.value)} /></Field>
        <Field label="Assessor"><input type="text" value={f.assessor || ''} onChange={(e) => set('assessor', e.target.value)} /></Field>
        <Field label="Líder"><input type="text" value={f.lider || ''} onChange={(e) => set('lider', e.target.value)} /></Field>
        <Field label="Filial"><input type="text" value={f.filial || ''} onChange={(e) => set('filial', e.target.value)} /></Field>
        <Field label="Regional"><input type="text" value={f.regional || ''} onChange={(e) => set('regional', e.target.value)} /></Field>
        <Field label="Quem atende"><select value={f.quem_atende || ''} onChange={(e) => set('quem_atende', e.target.value)}><option value="">—</option><option>Banker</option><option>Advisor</option></select></Field>
      </div>
      {err && <div className="alert err" style={{ marginTop: 12 }}>{err}</div>}
    </Modal>
  )
}

export default function Clientes() {
  const { user } = useAuth()
  const toast = useToast()
  const [q, setQ] = useState('')
  const [data, setData] = useState(null)
  const [edit, setEdit] = useState(null)

  const load = useCallback(() => {
    api.get(`/api/clientes/?q=${encodeURIComponent(q)}&limit=300`).then(setData).catch((e) => toast(e.message, 'error'))
  }, [q, toast])
  useEffect(() => { const t = setTimeout(load, 250); return () => clearTimeout(t) }, [load])

  const importar = async (e) => {
    const file = e.target.files[0]; e.target.value = ''
    if (!file) return
    const fd = new FormData(); fd.append('arquivo', file)
    try {
      const r = await api.upload('/api/clientes/importar?atualizar_existentes=true', fd)
      toast(`Importação: ${r.criados} novos, ${r.atualizados} atualizados, ${r.pulados} ignorados.`); load()
    } catch (er) { toast(er.message, 'error') }
  }
  const del = async (c) => {
    if (!window.confirm(`Excluir ${c.nome}?`)) return
    try { await api.del(`/api/clientes/${c.id}`); load() } catch (e) { toast(e.message, 'error') }
  }

  return (
    <div className="page active" style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      <Topbar title="Clientes" sub={data ? `${data.total} cadastrados` : ''} right={<>
        <input type="text" placeholder="Buscar conta, nome ou assessor" value={q} onChange={(e) => setQ(e.target.value)} style={{ width: 260 }} />
        {user.nivel >= 3 && <label className="btn btn-ghost btn-sm" style={{ cursor: 'pointer' }}><Icon d={ICONS.upload} /> Importar planilha<input type="file" accept=".xlsx,.xlsm,.csv" hidden onChange={importar} /></label>}
        <button className="btn btn-primary btn-sm" onClick={() => setEdit({ ...VAZIO })}><Icon d={ICONS.plus} /> Novo</button>
      </>} />
      <div className="page-body">
        {!data ? <Spinner /> : (
          <div className="table-container" style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead><tr><th>Conta XP</th><th>Nome</th><th>Assessor</th><th>Líder</th><th>Filial</th><th>Regional</th><th>Quem atende</th><th /></tr></thead>
              <tbody>
                {data.itens.map((c) => (
                  <tr key={c.id} className="click" onClick={() => setEdit(c)}>
                    <td className="mono">{c.conta_xp}</td><td>{c.nome}</td><td>{c.assessor || '—'}</td><td>{c.lider || '—'}</td><td>{c.filial || '—'}</td><td>{c.regional || '—'}</td>
                    <td>{c.quem_atende ? <span className="chip chip-coral">{c.quem_atende}</span> : '—'}</td>
                    <td>{user.nivel >= 3 && <button className="btn btn-danger-ghost btn-sm" onClick={(e) => { e.stopPropagation(); del(c) }}>Excluir</button>}</td>
                  </tr>
                ))}
                {data.itens.length === 0 && <tr><td colSpan={8} className="muted" style={{ textAlign: 'center', padding: 30 }}>Nenhum cliente encontrado.</td></tr>}
              </tbody>
            </table>
          </div>
        )}
        {user.nivel >= 3 && <p className="muted small" style={{ marginTop: 10 }}>Importação: colunas reconhecidas — Conta XP, Nome cliente, Assessor, Líder, Filial, Regional, Quem atende. Clientes já existentes (mesma conta) são atualizados.</p>}
      </div>
      {edit && <ClienteModal c={edit} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); load() }} />}
    </div>
  )
}
