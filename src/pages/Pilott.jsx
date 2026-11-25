import { useCallback, useEffect, useMemo, useState } from 'react'
import { api } from '../api'
import { useAuth } from '../auth'
import { Field, Icon, ICONS, Modal, Spinner, Topbar, useToast } from '../ui'
import { dbr, todayISO } from '../format'

const COLS = [
  { id: 'a_fazer', label: 'A fazer' },
  { id: 'em_andamento', label: 'Em andamento' },
  { id: 'aguardando', label: 'Aguardando' },
  { id: 'concluido', label: 'Concluído' },
]
const PRIO = { alta: 'chip-red', media: 'chip-yellow', baixa: 'chip-gray' }
const VAZIO = { title: '', description: '', status: 'a_fazer', priority: 'media', due_date: '', cliente_id: null, assessor: '', envolvidos: [] }

function TaskModal({ task, users, onClose, onSaved, onDeleted, me }) {
  const toast = useToast()
  const [f, setF] = useState(task.id ? { ...task, due_date: task.due_date || '', assessor: task.assessor || '', cliente_id: task.cliente?.id || null } : task)
  const [q, setQ] = useState(task.cliente ? `${task.cliente.conta_xp} · ${task.cliente.nome}` : '')
  const [sug, setSug] = useState([])
  const [err, setErr] = useState('')
  const dono = !task.id || task.owner?.id === me.id || me.nivel >= 3
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }))

  useEffect(() => {
    if (!q || q.includes(' · ')) return setSug([])
    const t = setTimeout(() => api.get(`/api/clientes/?q=${encodeURIComponent(q)}&limit=8`).then((r) => setSug(r.itens)).catch(() => {}), 250)
    return () => clearTimeout(t)
  }, [q])

  const save = async () => {
    if (!f.title.trim()) return setErr('Informe o título.')
    const body = { title: f.title, description: f.description, status: f.status, priority: f.priority, due_date: f.due_date || null, cliente_id: f.cliente_id, assessor: f.assessor || null }
    if (dono) body.envolvidos = f.envolvidos
    try {
      const r = task.id ? await api.patch(`/api/pilott/tasks/${task.id}`, body) : await api.post('/api/pilott/tasks', body)
      onSaved(r); toast('Tarefa salva.')
    } catch (e) { setErr(e.message) }
  }
  const del = async () => {
    if (!window.confirm('Excluir esta tarefa?')) return
    try { await api.del(`/api/pilott/tasks/${task.id}`); onDeleted(task.id) } catch (e) { setErr(e.message) }
  }
  const toggleEnv = (id) => set('envolvidos', f.envolvidos.includes(id) ? f.envolvidos.filter((x) => x !== id) : [...f.envolvidos, id])

  return (
    <Modal title={task.id ? 'Editar tarefa' : 'Nova tarefa'} onClose={onClose} width={560}
      footer={<>{task.id && dono && <button className="btn btn-danger-ghost" onClick={del}>Excluir</button>}<span className="spacer" /><button className="btn btn-ghost" onClick={onClose}>Cancelar</button><button className="btn btn-primary" onClick={save}>Salvar</button></>}>
      <Field label="Título *"><input type="text" value={f.title} onChange={(e) => set('title', e.target.value)} autoFocus /></Field>
      <Field label="Descrição" style={{ marginTop: 10 }}><textarea value={f.description} onChange={(e) => set('description', e.target.value)} /></Field>
      <div className="form-grid" style={{ marginTop: 10 }}>
        <Field label="Status"><select value={f.status} onChange={(e) => set('status', e.target.value)}><option value="urgente">Urgência</option>{COLS.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}</select></Field>
        <Field label="Prioridade"><select value={f.priority} onChange={(e) => set('priority', e.target.value)}><option value="alta">Alta</option><option value="media">Média</option><option value="baixa">Baixa</option></select></Field>
        <Field label="Prazo"><input type="date" value={f.due_date} onChange={(e) => set('due_date', e.target.value)} /></Field>
        <Field label="Assessor"><input type="text" value={f.assessor} onChange={(e) => set('assessor', e.target.value)} /></Field>
      </div>
      <Field label="Cliente" style={{ marginTop: 10 }}>
        <div style={{ position: 'relative' }}>
          <input type="text" value={q} placeholder="Buscar por conta ou nome" onChange={(e) => { setQ(e.target.value); set('cliente_id', null) }} />
          {sug.length > 0 && <div className="suggest">{sug.map((c) => <div key={c.id} onClick={() => { set('cliente_id', c.id); set('assessor', f.assessor || c.assessor || ''); setQ(`${c.conta_xp} · ${c.nome}`); setSug([]) }}><span>{c.nome}</span><span className="muted mono small">{c.conta_xp}</span></div>)}</div>}
        </div>
      </Field>
      {dono && (
        <Field label="Envolvidos" style={{ marginTop: 10 }}>
          <div className="row wrap">{users.filter((u) => u.id !== me.id).map((u) => (
            <label key={u.id} className="broker-checkbox-label"><input type="checkbox" checked={f.envolvidos.includes(u.id)} onChange={() => toggleEnv(u.id)} /> {u.name}</label>
          ))}</div>
        </Field>
      )}
      {err && <div className="alert err" style={{ marginTop: 12 }}>{err}</div>}
    </Modal>
  )
}

function Card({ t, onOpen, onDragStart }) {
  const venc = t.due_date && t.due_date < todayISO() && t.status !== 'concluido'
  return (
    <div className="k-card" draggable onDragStart={(e) => onDragStart(e, t)} onClick={() => onOpen(t)}>
      <div className="k-card-title">{t.title}</div>
      {t.cliente && <div className="sub">{t.cliente.nome} · {t.cliente.conta_xp}</div>}
      <div className="row wrap" style={{ marginTop: 8 }}>
        <span className={'chip ' + PRIO[t.priority]}>{t.priority}</span>
        {t.due_date && <span className={'chip ' + (venc ? 'chip-red' : 'chip-gray')}>{dbr(t.due_date)}</span>}
        {t.assessor && <span className="chip chip-gray">{t.assessor}</span>}
        {t.envolvidos.length > 0 && <span className="chip chip-gray">+{t.envolvidos.length}</span>}
      </div>
    </div>
  )
}

export default function Pilott() {
  const { user } = useAuth()
  const toast = useToast()
  const [tasks, setTasks] = useState(null)
  const [users, setUsers] = useState([])
  const [alvo, setAlvo] = useState('')
  const [edit, setEdit] = useState(null)
  const [over, setOver] = useState(null)

  const load = useCallback(() => {
    api.get('/api/pilott/tasks' + (alvo ? `?user_id=${alvo}` : '')).then(setTasks).catch((e) => toast(e.message, 'error'))
  }, [alvo, toast])
  useEffect(load, [load])
  useEffect(() => { api.get('/api/users/lista-simples').then(setUsers).catch(() => {}) }, [])

  const byCol = useMemo(() => {
    const m = { urgente: [] }; COLS.forEach((c) => (m[c.id] = []))
    ;(tasks || []).forEach((t) => (m[t.status] || m.a_fazer).push(t))
    return m
  }, [tasks])

  const onDragStart = (e, t) => e.dataTransfer.setData('text/plain', String(t.id))
  const drop = async (e, status) => {
    e.preventDefault(); setOver(null)
    const id = Number(e.dataTransfer.getData('text/plain'))
    const t = tasks.find((x) => x.id === id)
    if (!t || t.status === status) return
    setTasks((ts) => ts.map((x) => (x.id === id ? { ...x, status } : x)))
    try { await api.patch(`/api/pilott/tasks/${id}`, { status }) } catch (er) { toast(er.message, 'error'); load() }
  }
  const saved = (r) => { setTasks((ts) => (ts.some((x) => x.id === r.id) ? ts.map((x) => (x.id === r.id ? r : x)) : [r, ...ts])); setEdit(null) }
  const limpar = async () => {
    if (!window.confirm('Remover todas as tarefas concluídas?')) return
    await api.post('/api/pilott/limpar-concluidas'); load()
  }
  const colProps = (id) => ({ onDragOver: (e) => { e.preventDefault(); setOver(id) }, onDragLeave: () => setOver(null), onDrop: (e) => drop(e, id) })

  return (
    <div className="page active" style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      <Topbar title="Pilott" sub="suas tarefas" right={<>
        {user.nivel >= 3 && <select value={alvo} onChange={(e) => setAlvo(e.target.value)} style={{ width: 200 }}><option value="">Minhas tarefas</option>{users.filter((u) => u.id !== user.id).map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}</select>}
        <button className="btn btn-ghost btn-sm" onClick={limpar}>Limpar concluídas</button>
        <button className="btn btn-primary btn-sm" onClick={() => setEdit({ ...VAZIO })}><Icon d={ICONS.plus} /> Nova tarefa</button>
      </>} />
      <div className="page-body">
        {!tasks ? <Spinner /> : (
          <>
            <div className={'card'} style={{ marginBottom: 14, borderColor: over === 'urgente' ? 'var(--coral)' : undefined }} {...colProps('urgente')}>
              <h3>🔥 Urgências ({byCol.urgente.length})</h3>
              <div className="row wrap">{byCol.urgente.length === 0 ? <span className="muted small">Arraste uma tarefa para cá para marcá-la como urgente.</span> :
                byCol.urgente.map((t) => <div key={t.id} style={{ minWidth: 240 }}><Card t={t} onOpen={setEdit} onDragStart={onDragStart} /></div>)}</div>
            </div>
            <div className="board" style={{ minWidth: 0 }}>
              {COLS.map((c) => (
                <div key={c.id} className={'k-col' + (over === c.id ? ' drag-over' : '')} {...colProps(c.id)}>
                  <div className="k-col-header"><div className="k-col-header-left"><span className="k-col-name">{c.label}</span></div><span className="k-col-count">{byCol[c.id].length}</span></div>
                  <div className="k-col-body">{byCol[c.id].map((t) => <Card key={t.id} t={t} onOpen={setEdit} onDragStart={onDragStart} />)}
                    {byCol[c.id].length === 0 && <div className="k-col-empty">Sem tarefas</div>}</div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
      {edit && <TaskModal task={edit} users={users} me={user} onClose={() => setEdit(null)} onSaved={saved} onDeleted={(id) => { setTasks((ts) => ts.filter((x) => x.id !== id)); setEdit(null) }} />}
    </div>
  )
}
