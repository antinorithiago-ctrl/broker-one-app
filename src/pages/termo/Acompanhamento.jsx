import { useCallback, useEffect, useMemo, useState } from 'react'
import { api } from '../../api'
import { useAuth } from '../../auth'
import { Field, Icon, ICONS, Modal, Spinner, useCopy, useToast } from '../../ui'
import { brl, brlShort, dbr, dtime, pct } from '../../format'
import Simulador from './Simulador'

const ETAPAS = [
  ['simulacao', 'Simulação'], ['proposta_enviada', 'Proposta enviada'], ['aguardando_docs', 'Aguardando docs/garantias'],
  ['ordem_enviada', 'Ordem enviada à mesa'], ['executada', 'Executada'], ['ganha', 'Ganha'], ['perdida', 'Perdida'],
]
const LABEL = Object.fromEntries(ETAPAS)
const COR = { ganha: 'chip-green', perdida: 'chip-red', executada: 'chip-coral' }

function MotivoModal({ onClose, onOk }) {
  const [m, setM] = useState('')
  return (
    <Modal title="Motivo da perda" onClose={onClose} width={440}
      footer={<><button className="btn btn-ghost" onClick={onClose}>Cancelar</button><button className="btn btn-danger" disabled={!m.trim()} onClick={() => onOk(m.trim())}>Marcar como perdida</button></>}>
      <Field label="Por que a operação foi perdida? *"><textarea rows={3} value={m} onChange={(e) => setM(e.target.value)} autoFocus placeholder="Ex.: taxa acima da concorrência, cliente desistiu, sem garantias..." /></Field>
    </Modal>
  )
}

function DetalheModal({ id, onClose, onChanged }) {
  const toast = useToast(); const copy = useCopy()
  const [op, setOp] = useState(null)
  const [nova, setNova] = useState(false)
  const [obs, setObs] = useState('')
  const [lucro, setLucro] = useState(false)
  const [motivo, setMotivo] = useState(false)
  const [verSaidas, setVerSaidas] = useState(null)

  const load = useCallback(() => api.get(`/api/termo/operacoes/${id}`).then((r) => { setOp(r); setObs(r.observacoes) }).catch((e) => toast(e.message, 'error')), [id, toast])
  useEffect(() => { load() }, [load])

  const patch = async (body) => { try { const r = await api.patch(`/api/termo/operacoes/${id}`, body); setOp(r); setObs(r.observacoes); onChanged(); return true } catch (e) { toast(e.message, 'error'); return false } }
  const mover = (et) => { if (et === 'perdida') setMotivo(true); else patch({ etapa: et }) }
  const saidas = async (s) => { try { setVerSaidas({ s, ...(await api.get(`/api/termo/simulacoes/${s.id}/saidas?incluir_lucro_real=${lucro}`)) }) } catch (e) { toast(e.message, 'error') } }
  const pdf = async (s) => { try { const b = await api.blobGet(`/api/termo/simulacoes/${s.id}/pdf?incluir_lucro_real=${lucro}`); window.open(URL.createObjectURL(b), '_blank') } catch (e) { toast(e.message, 'error') } }
  const excluir = async () => {
    if (!window.confirm('Excluir esta operação e todas as simulações?')) return
    try { await api.del(`/api/termo/operacoes/${id}`); onChanged(); onClose() } catch (e) { toast(e.message, 'error') }
  }

  if (!op) return <Modal title="Operação" onClose={onClose}><Spinner /></Modal>
  const cli = op.cliente ? `${op.cliente.nome} · ${op.cliente.conta_xp}` : `Conta ${op.conta_avulsa}`
  const ultima = op.simulacoes[op.simulacoes.length - 1]
  const resumoSim = (s) => s.tipo === 'bullet'
    ? `Líquido D+2 ${brl(s.resultado.fluxo_d2.total_liquido)} · CET ${pct(s.resultado.cet)} · ${s.resultado.entrada.prazo_dc}d`
    : `Líquido ${brl(s.resultado.total.liquido_d2)} · CET mediana ${pct(s.resultado.total.cet_mediana)} · ${s.resultado.entrada.parcelas}x`

  if (nova) return (
    <Modal title={`Nova versão – ${op.ativo_base || ''} · ${cli}`} onClose={() => setNova(false)} width={1180}>
      <Simulador operacao={op} base={{ tipo: op.tipo, entrada: ultima.entrada }} onCancel={() => setNova(false)} onSaved={(r) => { setOp(r); setNova(false); onChanged() }} />
    </Modal>
  )

  return (
    <>
      <Modal title={`${op.tipo === 'bullet' ? 'Bullet' : 'Parcelado'} · ${op.ativo_base || '—'} · ${cli}`} onClose={onClose} width={760}
        footer={<><button className="btn btn-danger-ghost" onClick={excluir}>Excluir</button><span className="spacer" /><button className="btn btn-ghost" onClick={onClose}>Fechar</button><button className="btn btn-primary" onClick={() => setNova(true)}>Nova simulação (versão)</button></>}>
        <div className="row wrap" style={{ marginBottom: 12 }}>
          <span className={'chip ' + (COR[op.etapa] || 'chip-gray')}>{LABEL[op.etapa]}</span>
          <span className="muted small">Responsável: {op.owner.name} · criada {dtime(op.created_at)}</span>
        </div>
        <div className="kpis">
          <div className="kpi-card"><div className="kpi-label">Volume</div><div className="kpi-value">{brlShort(op.volume)}</div></div>
          <div className="kpi-card"><div className="kpi-label">Receita bruta</div><div className="kpi-value">{brl(op.receita_bruta)}</div></div>
          <div className="kpi-card"><div className="kpi-label">CET</div><div className="kpi-value">{pct(op.cet)}</div></div>
        </div>
        <Field label="Etapa">
          <select value={op.etapa} onChange={(e) => mover(e.target.value)}>{ETAPAS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
        </Field>
        {op.etapa === 'perdida' && op.motivo_perda && <div className="alert err" style={{ marginTop: 10 }}>Motivo da perda: {op.motivo_perda}</div>}
        <Field label="Observações" style={{ marginTop: 10 }}>
          <textarea rows={2} value={obs} onChange={(e) => setObs(e.target.value)} onBlur={() => obs !== op.observacoes && patch({ observacoes: obs })} />
        </Field>

        <div className="form-section-label" style={{ margin: '16px 0 8px' }}>Versões da simulação</div>
        <label className="broker-checkbox-label" style={{ marginBottom: 8 }}><input type="checkbox" checked={lucro} onChange={(e) => setLucro(e.target.checked)} /> Incluir Lucro Real nas saídas (Bullet)</label>
        {[...op.simulacoes].reverse().map((s) => (
          <div key={s.id} className="card" style={{ marginBottom: 8, padding: '10px 14px' }}>
            <div className="row wrap">
              <strong>v{s.versao}</strong><span className="muted small">{dtime(s.created_at)}</span>
              <span className="small">{resumoSim(s)}</span><span className="spacer" />
              <button className="btn btn-ghost btn-sm" onClick={() => saidas(s)}>Textos</button>
              <button className="btn btn-ghost btn-sm" onClick={() => pdf(s)}>PDF</button>
            </div>
          </div>
        ))}

        <div className="form-section-label" style={{ margin: '16px 0 8px' }}>Histórico</div>
        <ul className="timeline">{[...op.eventos].reverse().map((e) => <li key={e.id}>{e.detalhe}<small>{e.user_nome} · {dtime(e.created_at)}</small></li>)}</ul>
      </Modal>
      {motivo && <MotivoModal onClose={() => setMotivo(false)} onOk={async (m) => { if (await patch({ etapa: 'perdida', motivo_perda: m })) setMotivo(false) }} />}
      {verSaidas && (
        <Modal title={`Saídas – v${verSaidas.s.versao}`} onClose={() => setVerSaidas(null)} width={720}
          footer={<><button className="btn btn-ghost" onClick={() => copy(verSaidas.whatsapp, 'Simulação comercial')}><Icon d={ICONS.copy} /> Copiar WhatsApp</button>
            <button className="btn btn-ghost" onClick={() => copy(verSaidas.auditoria, 'Modelo de auditoria')}><Icon d={ICONS.copy} /> Copiar auditoria</button>
            <a className="btn btn-primary" style={{ textDecoration: 'none' }} href={`mailto:${verSaidas.email_para}?subject=${encodeURIComponent(verSaidas.email_assunto)}&body=${encodeURIComponent(verSaidas.auditoria)}`}><Icon d={ICONS.mail} /> E-mail à mesa</a></>}>
          <div className="form-section-label">WhatsApp</div><div className="pre">{verSaidas.whatsapp}</div>
          <div className="form-section-label" style={{ marginTop: 12 }}>Auditoria</div><div className="pre">{verSaidas.auditoria}</div>
        </Modal>
      )}
    </>
  )
}

export default function Acompanhamento({ reloadKey, onNova }) {
  const { user } = useAuth()
  const toast = useToast()
  const [ops, setOps] = useState(null)
  const [q, setQ] = useState('')
  const [resp, setResp] = useState('')
  const [users, setUsers] = useState([])
  const [open, setOpen] = useState(null)
  const [over, setOver] = useState(null)
  const [perda, setPerda] = useState(null)

  const load = useCallback(() => {
    const p = new URLSearchParams(); if (q.trim()) p.set('q', q.trim()); if (resp) p.set('owner_id', resp)
    api.get('/api/termo/operacoes?' + p).then(setOps).catch((e) => toast(e.message, 'error'))
  }, [q, resp, toast])
  useEffect(() => { const t = setTimeout(load, 250); return () => clearTimeout(t) }, [load, reloadKey])
  useEffect(() => { if (user.nivel >= 2) api.get('/api/users/lista-simples').then(setUsers).catch(() => {}) }, [user.nivel])

  const cols = useMemo(() => {
    const m = Object.fromEntries(ETAPAS.map(([k]) => [k, []])); (ops || []).forEach((o) => m[o.etapa]?.push(o)); return m
  }, [ops])
  const mover = async (id, etapa, motivo) => {
    const antes = ops
    setOps((os) => os.map((o) => (o.id === id ? { ...o, etapa, motivo_perda: motivo || null } : o)))
    try { await api.patch(`/api/termo/operacoes/${id}`, { etapa, motivo_perda: motivo }); load() } catch (e) { toast(e.message, 'error'); setOps(antes) }
  }
  const drop = (e, etapa) => {
    e.preventDefault(); setOver(null)
    const id = Number(e.dataTransfer.getData('text/plain')); const o = ops.find((x) => x.id === id)
    if (!o || o.etapa === etapa) return
    if (etapa === 'perdida') setPerda({ id, etapa }); else mover(id, etapa)
  }

  return (
    <div>
      <div className="row wrap" style={{ marginBottom: 14 }}>
        <input type="text" placeholder="Buscar cliente, conta ou ativo" value={q} onChange={(e) => setQ(e.target.value)} style={{ width: 280 }} />
        {user.nivel >= 2 && <select value={resp} onChange={(e) => setResp(e.target.value)} style={{ width: 220 }}><option value="">Todos os responsáveis</option>{users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}</select>}
        <span className="spacer" />
        <button className="btn btn-primary btn-sm" onClick={onNova}><Icon d={ICONS.plus} /> Nova simulação</button>
      </div>
      {!ops ? <Spinner /> : (
        <div style={{ overflowX: 'auto', paddingBottom: 8 }}>
          <div className="crm-board">
            {ETAPAS.map(([k, label]) => {
              const vol = cols[k].reduce((s, o) => s + (o.volume || 0), 0)
              return (
                <div key={k} className={'k-col crm-col' + (over === k ? ' drag-over' : '')} onDragOver={(e) => { e.preventDefault(); setOver(k) }} onDragLeave={() => setOver(null)} onDrop={(e) => drop(e, k)}>
                  <div className="k-col-header"><div className="k-col-header-left"><span className="k-col-name">{label}</span></div><span className="k-col-count">{cols[k].length}</span></div>
                  <div className="muted small" style={{ padding: '0 12px 4px' }}>{brlShort(vol)}</div>
                  <div className="k-col-body">
                    {cols[k].map((o) => (
                      <div key={o.id} className="k-card" draggable onDragStart={(e) => e.dataTransfer.setData('text/plain', String(o.id))} onClick={() => setOpen(o.id)}>
                        <div className="k-card-title">{o.cliente ? o.cliente.nome : `Conta ${o.conta_avulsa}`}</div>
                        <div className="sub">{o.ativo_base || '—'} · {o.tipo === 'bullet' ? 'Bullet' : 'Parcelado'} · {o.n_simulacoes} sim.</div>
                        <div className="money">{brlShort(o.volume)}</div>
                        <div className="row" style={{ marginTop: 6 }}><span className="chip chip-gray">{o.owner.name.split(' ')[0]}</span><span className="muted small">{dbr(o.updated_at || o.created_at)}</span></div>
                        {o.etapa === 'perdida' && o.motivo_perda && <div className="sub" style={{ color: 'var(--red)' }}>{o.motivo_perda}</div>}
                      </div>
                    ))}
                    {cols[k].length === 0 && <div className="k-col-empty">Vazio</div>}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
      {open && <DetalheModal id={open} onClose={() => setOpen(null)} onChanged={load} />}
      {perda && <MotivoModal onClose={() => setPerda(null)} onOk={(m) => { mover(perda.id, 'perdida', m); setPerda(null) }} />}
    </div>
  )
}
