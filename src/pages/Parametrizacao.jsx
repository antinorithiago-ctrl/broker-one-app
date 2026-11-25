import { useCallback, useEffect, useState } from 'react'
import { api } from '../api'
import { Field, Spinner, Topbar, useToast } from '../ui'
import { dbr, parseBR, toMoneyText, toPctText } from '../format'

const GERAL = [
  ['aliquota_impostos', 'IR / outros impostos (% sobre volume)', 'pct', 6],
  ['corretagem_fixa', 'Corretagem fixa (R$)', 'money'],
  ['garantia_b3_fator', 'Fator da garantia B3 (Bullet)', 'num'],
  ['garantia_parcelado_fator', 'Fator da garantia (Parcelado)', 'num'],
  ['corretagem_cheia', 'Corretagem cheia (%)', 'pct'],
  ['corretagem_termo_ref', 'Corretagem Termo de referência (%)', 'pct'],
  ['ir_beneficio_fiscal', 'Benefício fiscal – IR (%)', 'pct'],
  ['rendimento_lft_aa', 'Rendimento LFT a.a. (%)', 'pct'],
  ['corretagem_btc_min', 'Corretagem BTC mínima (%)', 'pct'],
  ['corretagem_btc_max', 'Corretagem BTC máxima (%)', 'pct'],
]
const toTxt = (v, t, c) => (t === 'pct' ? toPctText(v, c || 4) : t === 'money' ? toMoneyText(v) : String(v).replace('.', ','))
const fromTxt = (s, t) => { const n = parseBR(s); return n === null ? null : t === 'pct' ? n / 100 : n }

function Geral() {
  const toast = useToast()
  const [p, setP] = useState(null)
  const [f, setF] = useState({})
  useEffect(() => { api.get('/api/param/geral').then((r) => { setP(r); setF(Object.fromEntries(GERAL.map(([k, , t, c]) => [k, toTxt(r[k], t, c)]).concat([['email_mesa_termo', r.email_mesa_termo]]))) }) }, [])
  const save = async () => {
    const body = { email_mesa_termo: f.email_mesa_termo }
    for (const [k, , t] of GERAL) { const v = fromTxt(f[k], t); if (v === null) return toast(`Valor inválido: ${k}`, 'error'); body[k] = v }
    try { await api.put('/api/param/geral', body); toast('Parâmetros salvos.') } catch (e) { toast(e.message, 'error') }
  }
  if (!p) return <Spinner />
  return (
    <div className="card" style={{ maxWidth: 760 }}>
      <h3>Parâmetros gerais do Termo Caixa</h3>
      <div className="form-grid">
        {GERAL.map(([k, l, t]) => <Field key={k} label={l}><input type="text" value={f[k] ?? ''} onChange={(e) => setF({ ...f, [k]: e.target.value })} /></Field>)}
        <Field label="E-mail da mesa de Termo (auditoria)" style={{ gridColumn: '1 / -1' }}><input type="text" value={f.email_mesa_termo || ''} onChange={(e) => setF({ ...f, email_mesa_termo: e.target.value })} /></Field>
      </div>
      <button className="btn btn-primary" style={{ marginTop: 14 }} onClick={save}>Salvar</button>
    </div>
  )
}

function Emolumentos() {
  const toast = useToast()
  const [e, setE] = useState(null)
  useEffect(() => { api.get('/api/param/geral').then((r) => setE(Object.fromEntries(Object.entries(r.emol).map(([pf, prods]) => [pf, Object.fromEntries(Object.entries(prods).map(([pr, v]) => [pr, v.map((x) => toPctText(x, 6))]))])))) }, [])
  const set = (pf, pr, i, v) => setE((s) => ({ ...s, [pf]: { ...s[pf], [pr]: s[pf][pr].map((x, j) => (j === i ? v : x)) } }))
  const save = async () => {
    const emol = {}
    for (const [pf, prods] of Object.entries(e)) { emol[pf] = {}; for (const [pr, v] of Object.entries(prods)) { const n = v.map((x) => parseBR(x)); if (n.some((x) => x === null)) return toast(`Valor inválido em ${pf} / ${pr}`, 'error'); emol[pf][pr] = n.map((x) => x / 100) } }
    try { await api.put('/api/param/emolumentos', { emol }); toast('Emolumentos salvos.') } catch (er) { toast(er.message, 'error') }
  }
  if (!e) return <Spinner />
  return (
    <div className="card">
      <h3>Emolumentos B3 (% por componente)</h3>
      {Object.entries(e).map(([pf, prods]) => (
        <div key={pf} style={{ marginBottom: 16 }}>
          <div className="form-section-label">{pf}</div>
          <table className="data-table"><thead><tr><th>Produto</th><th>Negociação</th><th>Liquidação</th><th>Registro</th></tr></thead>
            <tbody>{Object.entries(prods).map(([pr, v]) => <tr key={pr}><td>{pr}</td>{v.map((x, i) => <td key={i}><input type="text" value={x} onChange={(ev) => set(pf, pr, i, ev.target.value)} style={{ width: 110 }} /></td>)}</tr>)}</tbody></table>
        </div>
      ))}
      <button className="btn btn-primary" onClick={save}>Salvar emolumentos</button>
    </div>
  )
}

function Feriados() {
  const toast = useToast()
  const ano0 = new Date().getFullYear()
  const [ano, setAno] = useState(ano0)
  const [l, setL] = useState(null)
  const [d, setD] = useState(''); const [desc, setDesc] = useState('')
  const load = useCallback(() => { api.get(`/api/param/feriados?ano=${ano}`).then(setL) }, [ano])
  useEffect(load, [load])
  const add = async () => { if (!d) return; try { await api.post('/api/param/feriados', { data: d, descricao: desc }); setD(''); setDesc(''); load() } catch (e) { toast(e.message, 'error') } }
  const gerar = async () => { try { const r = await api.post(`/api/param/feriados/gerar/${ano}`); toast(`${r.adicionados ?? 0} feriados adicionados.`); load() } catch (e) { toast(e.message, 'error') } }
  return (
    <div className="card" style={{ maxWidth: 640 }}>
      <h3>Feriados / dias sem pregão (dias úteis)</h3>
      <div className="row wrap" style={{ marginBottom: 12 }}>
        <select value={ano} onChange={(e) => setAno(Number(e.target.value))} style={{ width: 100 }}>{Array.from({ length: 12 }, (_, i) => 2024 + i).map((a) => <option key={a}>{a}</option>)}</select>
        <button className="btn btn-ghost btn-sm" onClick={gerar}>Gerar feriados de {ano}</button>
      </div>
      <div className="row" style={{ marginBottom: 12 }}>
        <input type="date" value={d} onChange={(e) => setD(e.target.value)} style={{ width: 160 }} />
        <input type="text" value={desc} placeholder="Descrição" onChange={(e) => setDesc(e.target.value)} />
        <button className="btn btn-primary btn-sm" onClick={add}>Adicionar</button>
      </div>
      {!l ? <Spinner /> : <table className="data-table"><tbody>{l.map((x) => <tr key={x.data}><td className="mono">{dbr(x.data)}</td><td>{x.descricao}</td><td><button className="btn btn-danger-ghost btn-sm" onClick={async () => { await api.del(`/api/param/feriados/${x.data}`); load() }}>Remover</button></td></tr>)}
        {l.length === 0 && <tr><td className="muted">Nenhum feriado em {ano}.</td></tr>}</tbody></table>}
      <p className="muted small" style={{ marginTop: 10 }}>Revise a lista com a mesa: o calendário nacional é gerado automaticamente, mas dias sem pregão da B3 podem variar.</p>
    </div>
  )
}

function Desagios() {
  const toast = useToast()
  const [q, setQ] = useState('')
  const [r, setR] = useState(null)
  const [txt, setTxt] = useState('')
  const [subst, setSubst] = useState(false)
  const load = useCallback(() => { api.get(`/api/param/desagios?q=${encodeURIComponent(q)}&limit=100`).then(setR) }, [q])
  useEffect(() => { const t = setTimeout(load, 250); return () => clearTimeout(t) }, [load])
  const done = (x) => { toast(`${x.importados} ativos importados.`); setTxt(''); load() }
  const colar = async () => { try { done(await api.post('/api/param/desagios/importar', { texto: txt, substituir: subst })) } catch (e) { toast(e.message, 'error') } }
  const pdf = async (ev) => {
    const f = ev.target.files[0]; ev.target.value = ''
    if (!f) return
    const fd = new FormData(); fd.append('arquivo', f)
    try { done(await api.upload(`/api/param/desagios/pdf?substituir=${subst}`, fd)) } catch (e) { toast(e.message, 'error') }
  }
  return (
    <div className="grid-2" style={{ alignItems: 'start' }}>
      <div className="card">
        <h3>Importar deságios B3</h3>
        <label className="btn btn-ghost btn-sm" style={{ cursor: 'pointer' }}>Enviar PDF<input type="file" accept=".pdf" hidden onChange={pdf} /></label>
        <div className="muted small" style={{ margin: '10px 0 6px' }}>…ou cole o texto (formato: ATIVO  Aceito  23,33%)</div>
        <textarea value={txt} onChange={(e) => setTxt(e.target.value)} rows={8} />
        <label className="broker-checkbox-label" style={{ margin: '8px 0' }}><input type="checkbox" checked={subst} onChange={(e) => setSubst(e.target.checked)} /> Substituir a lista atual</label>
        <button className="btn btn-primary btn-sm" disabled={!txt.trim()} onClick={colar}>Importar texto</button>
      </div>
      <div className="card">
        <h3>Ativos carregados {r ? `(${r.total})` : ''}</h3>
        <input type="text" placeholder="Buscar ativo" value={q} onChange={(e) => setQ(e.target.value)} style={{ marginBottom: 8 }} />
        {r && <div style={{ maxHeight: 360, overflow: 'auto' }}><table className="data-table"><tbody>{r.itens.map((x) => <tr key={x.ativo}><td className="mono">{x.ativo}</td><td>{x.margem}</td><td>{x.desagio === null ? '—' : (x.desagio * 100).toFixed(2).replace('.', ',') + '%'}</td></tr>)}</tbody></table></div>}
      </div>
    </div>
  )
}

const ABAS = [['geral', 'Parâmetros', Geral], ['emol', 'Emolumentos B3', Emolumentos], ['fer', 'Feriados', Feriados], ['des', 'Deságios', Desagios]]
export default function Parametrizacao() {
  const [a, setA] = useState('geral')
  const Comp = ABAS.find((x) => x[0] === a)[2]
  return (
    <div className="page active" style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      <Topbar title="Parametrização" sub="Termo Caixa" />
      <div className="tabs">{ABAS.map(([k, l]) => <button key={k} className={'tab' + (a === k ? ' active' : '')} onClick={() => setA(k)}>{l}</button>)}</div>
      <div className="page-body"><Comp /></div>
    </div>
  )
}
