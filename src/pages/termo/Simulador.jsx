import { useEffect, useMemo, useRef, useState } from 'react'
import { api } from '../../api'
import { Field, Icon, ICONS, Modal, Spinner, useCopy, useToast } from '../../ui'
import { brl, dbr, num, parseBR, parsePct, pct, toMoneyText, toPctText, todayISO } from '../../format'

const HUB = 'https://hub.xpi.com.br/new/renda-variavel/#/termos/termo-caixa-btc/solicitacao'
const DEF = {
  bullet: { ativo: '', preco: '', prazo_dc: '', taxa_termo: '', volume: '', taxa_btc: '0,25', corretagem_btc: '0,40', corretagem_termo: '1,00', perfil: 'Pessoa Física', data_inicio: '', lft_aa: '', usar_feriados: true },
  parcelado: { ativo: '', preco: '', volume: '', parcelas: '12', carencia: '0', taxa_btc: '0,25', corretagem_btc: '3,00', corretagem_termo: '1,00', perfil: 'Pessoa Física', data_base: '', usar_feriados: true },
}

// entrada salva (decimais) -> textos do formulário
function fromEntrada(tipo, e) {
  const d = { ...DEF[tipo] }
  d.ativo = e.ativo || ''; d.perfil = e.perfil || d.perfil; d.usar_feriados = e.usar_feriados !== false
  d.preco = String(e.preco).replace('.', ','); d.volume = toMoneyText(e.volume)
  d.taxa_btc = toPctText(e.taxa_btc); d.corretagem_btc = toPctText(e.corretagem_btc); d.corretagem_termo = toPctText(e.corretagem_termo)
  if (tipo === 'bullet') { d.prazo_dc = String(e.prazo_dc); d.taxa_termo = toPctText(e.taxa_termo); d.data_inicio = e.data_inicio || ''; d.lft_aa = e.lft_aa != null ? toPctText(e.lft_aa) : '' }
  else { d.parcelas = String(e.parcelas); d.carencia = String(e.carencia || 0); d.data_base = e.data_base || '' }
  return d
}

function montarEntrada(tipo, f, conta) {
  const n = (k) => parseBR(f[k]); const p = (k) => parsePct(f[k])
  const base = { ativo: f.ativo.trim(), conta: conta || null, preco: n('preco'), volume: n('volume'), taxa_btc: p('taxa_btc'),
    corretagem_btc: p('corretagem_btc'), corretagem_termo: p('corretagem_termo'), perfil: f.perfil, usar_feriados: f.usar_feriados }
  let e
  if (tipo === 'bullet') {
    e = { ...base, prazo_dc: n('prazo_dc'), taxa_termo: p('taxa_termo') }
    if (f.data_inicio) e.data_inicio = f.data_inicio
    if (f.lft_aa.trim()) e.lft_aa = p('lft_aa')
    if (e.prazo_dc !== null) e.prazo_dc = Math.round(e.prazo_dc)
  } else {
    e = { ...base, parcelas: n('parcelas'), carencia: n('carencia') ?? 0 }
    if (f.data_base) e.data_base = f.data_base
    if (e.parcelas !== null) e.parcelas = Math.round(e.parcelas)
    e.carencia = Math.round(e.carencia)
  }
  const obrig = tipo === 'bullet' ? ['preco', 'volume', 'prazo_dc', 'taxa_termo', 'taxa_btc', 'corretagem_btc', 'corretagem_termo'] : ['preco', 'volume', 'parcelas', 'taxa_btc', 'corretagem_btc', 'corretagem_termo']
  if (obrig.some((k) => e[k] === null || e[k] === undefined)) return null
  return e
}

const Tx = ({ label, k, f, set, suffix, hint, ph, type = 'text' }) => (
  <Field label={label} hint={hint}>
    <div style={{ position: 'relative' }}>
      <input type={type} value={f[k]} placeholder={ph} onChange={(e) => set(k, e.target.value)} style={suffix ? { paddingRight: 30 } : undefined} />
      {suffix && <span className="muted small" style={{ position: 'absolute', right: 10, top: 10 }}>{suffix}</span>}
    </div>
  </Field>
)

function CurvaModal({ onClose, onSaved }) {
  const toast = useToast()
  const [t, setT] = useState(''); const [err, setErr] = useState('')
  const save = async () => { try { const r = await api.post('/api/termo/curva', { texto: t }); toast(`Curva salva (${r.pontos.length} vértices).`); onSaved(r) } catch (e) { setErr(e.message) } }
  return (
    <Modal title="Colar curva de taxas do dia" onClose={onClose} width={620}
      footer={<><button className="btn btn-ghost" onClick={onClose}>Cancelar</button><button className="btn btn-primary" onClick={save} disabled={!t.trim()}>Salvar curva</button></>}>
      <p className="muted small" style={{ marginBottom: 8 }}>Cole as colunas Prazo (dias), Taxa %, Vencimento e Call/Put (copie direto da tela de taxas, com ou sem cabeçalho). Vale para todos os usuários.</p>
      <textarea rows={14} value={t} onChange={(e) => setT(e.target.value)} placeholder={'Dias\tTaxa\tVencimento\tC/P\n29\t1,35%\t...'} className="mono" />
      {err && <div className="alert err" style={{ marginTop: 10 }}>{err}</div>}
    </Modal>
  )
}

function Fluxo({ titulo, linhas, total }) {
  return (
    <div className="card">
      <h3>{titulo}</h3>
      <table className="kv"><tbody>
        {linhas.map(([l, v]) => <tr key={l}><td>{l}</td><td className={v < 0 ? 'neg' : ''}>{brl(v)}</td></tr>)}
        <tr className="total"><td>Total líquido</td><td>{brl(total)}</td></tr>
      </tbody></table>
    </div>
  )
}

function ResultadoBullet({ r, lucro }) {
  const l = r.lucro_real
  return (
    <>
      <div className="kpis">
        <div className="kpi-card"><div className="kpi-label">Líquido em D+2</div><div className="kpi-value coral">{brl(r.fluxo_d2.total_liquido)}</div><div className="kpi-sub">cai em 2 dias úteis</div></div>
        <div className="kpi-card"><div className="kpi-label">Pago no vencimento</div><div className="kpi-value">{brl(-r.fluxo_vencimento.total_liquido)}</div><div className="kpi-sub">{dbr(r.data_vencimento)}</div></div>
        <div className="kpi-card"><div className="kpi-label">CET no período</div><div className="kpi-value">{pct(r.cet)}</div><div className="kpi-sub">{pct(r.cet_am)} a.m.</div></div>
        <div className="kpi-card"><div className="kpi-label">Receita bruta</div><div className="kpi-value">{brl(r.receita_bruta)}</div><div className="kpi-sub">ROA {pct(r.roa)}</div></div>
      </div>
      <div className="grid-2" style={{ marginBottom: 12 }}>
        <Fluxo titulo="Fluxo em D+2" total={r.fluxo_d2.total_liquido} linhas={[['Venda à vista', r.fluxo_d2.venda_a_vista], ['Corretagem Termo Caixa', r.fluxo_d2.corretagem_termo_caixa], ['Corretagem BTC', r.fluxo_d2.corretagem_btc], ['Emolumentos B3', r.fluxo_d2.emolumentos_b3], ['Impostos (aprox.)', r.fluxo_d2.impostos]]} />
        <Fluxo titulo="Fluxo no vencimento" total={r.fluxo_vencimento.total_liquido} linhas={[['Compra a termo', r.fluxo_vencimento.compra_a_termo], ['Taxa tomador BTC', r.fluxo_vencimento.taxa_tomador_btc], ['Emolumentos BTC', r.fluxo_vencimento.emolumentos_btc]]} />
      </div>
      <div className="grid-2" style={{ marginBottom: 12 }}>
        <div className="card"><h3>Operação</h3><table className="kv"><tbody>
          <tr><td>Quantidade</td><td>{num(r.quantidade, 2)}</td></tr><tr><td>Preço a termo</td><td>{brl(r.preco_termo)}</td></tr><tr><td>Volume a termo</td><td>{brl(r.volume_termo)}</td></tr>
          <tr><td>Garantia B3 necessária</td><td>{brl(r.garantia_b3)}</td></tr><tr><td>Dias úteis</td><td>{r.dias_uteis}</td></tr><tr><td>Início → vencimento</td><td>{dbr(r.data_inicio)} → {dbr(r.data_vencimento)}</td></tr>
        </tbody></table></div>
        <div className="card"><h3>Custos (% do volume)</h3><table className="kv"><tbody>
          {[['Juros do termo', 'juros_termo'], ['Emolumentos termo', 'emolumentos_termo'], ['Corretagem Termo Caixa', 'corretagem_termo_caixa'], ['Taxa BTC', 'taxa_btc'], ['Corretagem BTC', 'corretagem_btc'], ['Emolumentos BTC', 'emolumentos_btc'], ['Impostos', 'impostos']].map(([lb, k]) => <tr key={k}><td>{lb}</td><td>{pct(r.custos[k], 4)}</td></tr>)}
        </tbody></table></div>
      </div>
      <details className="card" open={lucro}>
        <summary>Lucro Real (benefício fiscal + rendimento da garantia em LFT)</summary>
        <table className="kv" style={{ marginTop: 10 }}><tbody>
          <tr><td>Custo da operação</td><td>{brl(l.custo_operacao)}</td></tr><tr><td>Benefício fiscal (IR {num(34, 0)}%)</td><td>{brl(l.beneficio_fiscal)}</td></tr>
          <tr><td>Custo pós-benefício</td><td>{brl(l.custo_pos_beneficio)}</td></tr><tr><td>CET pós-benefício</td><td>{pct(l.cet_pos_beneficio)} ({pct(l.cet_pos_beneficio_am)} a.m.)</td></tr>
          <tr><td>Rendimento LFT ({pct(l.lft_aa)} a.a.)</td><td>{brl(l.rendimento_lft)}</td></tr>
          <tr className="total"><td>Resultado líquido (NET)</td><td className={l.net < 0 ? 'neg' : ''}>{brl(l.net)} · {pct(l.net_aa)} a.a.</td></tr>
        </tbody></table>
      </details>
    </>
  )
}

function ResultadoParcelado({ r }) {
  const t = r.total
  return (
    <>
      <div className="kpis">
        <div className="kpi-card"><div className="kpi-label">Líquido total D+2</div><div className="kpi-value coral">{brl(t.liquido_d2)}</div></div>
        <div className="kpi-card"><div className="kpi-label">Soma das parcelas</div><div className="kpi-value">{brl(t.valor_parcela)}</div></div>
        <div className="kpi-card"><div className="kpi-label">CET (mediana)</div><div className="kpi-value">{pct(t.cet_mediana)}</div></div>
        <div className="kpi-card"><div className="kpi-label">Garantia</div><div className="kpi-value">{brl(t.garantia)}</div></div>
      </div>
      {r.curva && <div className="muted small" style={{ marginBottom: 8 }}>Curva usada: salva por {r.curva.criada_por} em {new Date(r.curva.criada_em.endsWith('Z') ? r.curva.criada_em : r.curva.criada_em + 'Z').toLocaleString('pt-BR')}</div>}
      <div className="card" style={{ overflowX: 'auto' }}>
        <table className="data-table">
          <thead><tr><th>#</th><th>Vértice</th><th>Prazo</th><th>Taxa termo</th><th>Qtde</th><th>À vista</th><th>A termo</th><th>Corretagem</th><th>BTC (R$)</th><th>Líquido D+2</th><th>Parcela</th><th>CET</th></tr></thead>
          <tbody>
            {r.linhas.map((l) => l.erro ? <tr key={l.parcela}><td>{l.parcela}</td><td>{l.vertice}</td><td colSpan={10} style={{ color: 'var(--red)' }}>{l.erro}</td></tr> : (
              <tr key={l.parcela}><td>{l.parcela}</td><td>{l.vertice}</td><td>{l.prazo}</td><td>{pct(l.taxa_termo)}</td><td>{num(l.quantidade, 0)}</td><td>{brl(l.valor_a_vista)}</td><td>{brl(l.valor_a_termo)}</td><td>{brl(l.corretagem_total)}</td><td>{brl(l.taxa_btc_rs + l.corretagem_btc_rs)}</td><td>{brl(l.liquido_d2)}</td><td>{brl(l.valor_parcela)}</td><td>{pct(l.cet)}</td></tr>))}
            <tr style={{ fontWeight: 800 }}><td colSpan={5}>TOTAL</td><td>{brl(t.valor_a_vista)}</td><td>{brl(t.valor_a_termo)}</td><td>{brl(t.corretagem_total)}</td><td>—</td><td>{brl(t.liquido_d2)}</td><td>{brl(t.valor_parcela)}</td><td>{pct(t.cet_mediana)}</td></tr>
          </tbody>
        </table>
      </div>
    </>
  )
}

function Checklist() {
  return (
    <details className="card" style={{ marginTop: 12 }}>
      <summary>Operacional – passo a passo antes de executar</summary>
      <ol className="checklist" style={{ marginTop: 10 }}>
        <li>Validar no HUB (Mapa de Renda Variável › Controle de Garantias B3) o volume de garantias B3 disponível — não ultrapassar 70%. <a href="https://hub.xpi.com.br/rede/#/advisor/powerbi-renda-variavel" target="_blank" rel="noreferrer">Abrir</a></li>
        <li>Validar no HUB o volume de Garantias XP disponível; deve ser sempre maior que a exigência de margem do Termo Caixa. <a href="https://hub.xpi.com.br/new/renda-variavel/#/controle-de-garantias/garantias-xp" target="_blank" rel="noreferrer">Abrir</a><br /><span className="muted">Se o cliente tem crédito ativo com o Banco XP (ex.: crédito colateralizado), NÃO execute sem calcular junto com o time de atendimento RV — as garantias podem estar bloqueadas.</span></li>
        <li>Se parte ou toda a garantia for Renda Fixa, ANTES de operar deposite os ativos em garantia na B3 pelo HUB, para confirmar o lastro. <a href="https://hub.xpi.com.br/new/renda-variavel/#/controle-de-garantias/deposito-garantias-bolsa/solicitar-vinculo" target="_blank" rel="noreferrer">Abrir</a></li>
        <li>Confirmar com a mesa de Termo o ativo, a taxa de BTC e a taxa de juros do período; depois simular a operação aqui.</li>
        <li>Coletar a auditoria da ordem por e-mail com o cliente (modelo abaixo) e encaminhar para a mesa Termo (termo@xpi.com.br).</li>
        <li>O recurso entra na conta em 2 dias úteis.</li>
      </ol>
      <p className="muted small">Também é possível boletar direto pelo HUB: <a href={HUB} target="_blank" rel="noreferrer" style={{ color: 'var(--coral)' }}>Termo Caixa BTC – solicitação</a>. As validações e informações enviadas para execução são responsabilidade do AAI.</p>
    </details>
  )
}

export default function Simulador({ operacao, base, onSaved, onCancel }) {
  const toast = useToast(); const copy = useCopy()
  const [cfg, setCfg] = useState(null)
  const [curva, setCurva] = useState(null)
  const [tipo, setTipo] = useState(base?.tipo || operacao?.tipo || 'bullet')
  const [f, setF] = useState(() => (base ? fromEntrada(base.tipo, base.entrada) : { ...DEF.bullet }))
  const [cliente, setCliente] = useState(operacao?.cliente || null)
  const [q, setQ] = useState(operacao ? (operacao.cliente ? `${operacao.cliente.conta_xp} · ${operacao.cliente.nome}` : operacao.conta_avulsa || '') : '')
  const [sug, setSug] = useState([])
  const [res, setRes] = useState(null)
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const [lucro, setLucro] = useState(false)
  const [saidas, setSaidas] = useState(null)
  const [curvaModal, setCurvaModal] = useState(false)
  const [desagio, setDesagio] = useState(null)
  const [obs, setObs] = useState('')
  const seq = useRef(0)
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }))
  const travado = !!operacao

  useEffect(() => { api.get('/api/termo/config').then((c) => { setCfg(c); setCurva(c.curva) }).catch(() => {}) }, [])
  const mudaTipo = (t) => { if (travado || t === tipo) return; setTipo(t); setF((s) => ({ ...DEF[t], ativo: s.ativo, preco: s.preco, volume: s.volume, perfil: s.perfil })); setRes(null) }

  // autocomplete de cliente
  useEffect(() => {
    if (travado || cliente || !q.trim() || q.length < 2) return setSug([])
    const t = setTimeout(() => api.get(`/api/clientes/?q=${encodeURIComponent(q)}&limit=8`).then((r) => setSug(r.itens)).catch(() => {}), 250)
    return () => clearTimeout(t)
  }, [q, cliente, travado])

  const conta = cliente ? cliente.conta_xp : (travado ? operacao.conta_avulsa : q.trim())
  const entrada = useMemo(() => montarEntrada(tipo, f, conta), [tipo, f, conta])

  // deságio B3 do ativo
  useEffect(() => {
    const a = f.ativo.trim().toUpperCase()
    if (a.length < 4) return setDesagio(null)
    const t = setTimeout(() => api.get(`/api/param/desagios/${a}`).then(setDesagio).catch(() => setDesagio(null)), 300)
    return () => clearTimeout(t)
  }, [f.ativo])

  // simulação ao vivo (debounce)
  useEffect(() => {
    if (!entrada) { setRes(null); setErr(''); return }
    const id = ++seq.current; setBusy(true)
    const t = setTimeout(async () => {
      try { const r = await api.post('/api/termo/simular', { tipo, entrada }); if (id === seq.current) { setRes(r.resultado); setErr('') } }
      catch (e) { if (id === seq.current) { setRes(null); setErr(e.message) } }
      finally { if (id === seq.current) setBusy(false) }
    }, 400)
    return () => clearTimeout(t)
  }, [entrada, tipo])
  useEffect(() => { setSaidas(null) }, [entrada, lucro])

  // sugestão da curva para o prazo (próximo vértice maior)
  const [pontos, setPontos] = useState(null)
  useEffect(() => { api.get('/api/termo/curva').then((c) => setPontos(c ? c.pontos : null)).catch(() => {}) }, [curva])
  const sugestao = useMemo(() => {
    if (tipo !== 'bullet' || !pontos) return null
    const d = parseBR(f.prazo_dc); if (!d) return null
    return pontos.filter((x) => x.prazo >= d).sort((a, b) => a.prazo - b.prazo)[0] || null
  }, [tipo, pontos, f.prazo_dc])

  const nomeCliente = cliente?.nome || null
  const obterSaidas = async () => {
    const r = await api.post('/api/termo/saidas', { tipo, entrada, nome: nomeCliente, incluir_lucro_real: lucro })
    setSaidas(r); return r
  }
  const abrirEmail = async () => {
    try { const s = saidas || await obterSaidas(); window.location.href = `mailto:${s.email_para}?subject=${encodeURIComponent(s.email_assunto)}&body=${encodeURIComponent(s.auditoria)}` } catch (e) { toast(e.message, 'error') }
  }
  const copiar = async (campo, label) => { try { const s = saidas || await obterSaidas(); copy(s[campo], label) } catch (e) { toast(e.message, 'error') } }
  const pdf = async () => {
    try { const b = await api.blobPost('/api/termo/pdf', { tipo, entrada, nome: nomeCliente, incluir_lucro_real: lucro }); window.open(URL.createObjectURL(b), '_blank') } catch (e) { toast(e.message, 'error') }
  }
  const salvar = async () => {
    if (!entrada || !res) return toast('Preencha os dados para simular antes de salvar.', 'error')
    if (!operacao && !cliente && !q.trim()) return toast('Selecione o cliente ou informe a conta.', 'error')
    try {
      const r = operacao
        ? await api.post(`/api/termo/operacoes/${operacao.id}/simulacoes`, { entrada })
        : await api.post('/api/termo/operacoes', { tipo, entrada, cliente_id: cliente?.id || null, observacoes: obs })
      toast(operacao ? 'Nova versão salva.' : 'Operação criada no Acompanhamento.'); onSaved && onSaved(r)
    } catch (e) { toast(e.message, 'error') }
  }

  return (
    <div>
      <div className="sim-layout">
        <div className="card">
          <div className="row" style={{ marginBottom: 12 }}>
            <div className="seg">
              <button className={tipo === 'bullet' ? 'on' : ''} onClick={() => mudaTipo('bullet')} disabled={travado && tipo !== 'bullet'}>Bullet</button>
              <button className={tipo === 'parcelado' ? 'on' : ''} onClick={() => mudaTipo('parcelado')} disabled={travado && tipo !== 'parcelado'}>Parcelado</button>
            </div>
            <span className="spacer" />
            {tipo === 'parcelado' && <button className="btn btn-ghost btn-sm" onClick={() => setCurvaModal(true)}><Icon d={ICONS.upload} /> Colar curva</button>}
          </div>
          {tipo === 'parcelado' && (
            <div className={'alert ' + (curva ? 'info' : 'warn')}>{curva ? `Curva de ${new Date(curva.criada_em.endsWith('Z') ? curva.criada_em : curva.criada_em + 'Z').toLocaleDateString('pt-BR')} (${curva.pontos} vértices) · ${curva.criada_por}` : 'Nenhuma curva cadastrada — cole a curva do dia para simular o Parcelado.'}</div>
          )}
          <Field label={travado ? 'Cliente (vinculado à operação)' : 'Cliente (conta XP ou nome)'}>
            <div style={{ position: 'relative' }}>
              <input type="text" value={q} readOnly={travado} placeholder="Buscar cliente cadastrado ou digitar a conta"
                onChange={(e) => { setQ(e.target.value); setCliente(null) }} />
              {sug.length > 0 && <div className="suggest">{sug.map((c) => <div key={c.id} onClick={() => { setCliente(c); setQ(`${c.conta_xp} · ${c.nome}`); setSug([]) }}><span>{c.nome}</span><span className="muted mono small">{c.conta_xp}</span></div>)}</div>}
            </div>
          </Field>
          <div className="form-grid" style={{ marginTop: 10 }}>
            <Field label="Ativo base"><input type="text" value={f.ativo} onChange={(e) => set('ativo', e.target.value.toUpperCase())} placeholder="GOLX11" /></Field>
            <Tx label="Preço do ativo (R$)" k="preco" f={f} set={set} ph="53,36" />
            <Tx label="Volume (R$)" k="volume" f={f} set={set} ph="306.000,00" />
            <Field label="Perfil"><select value={f.perfil} onChange={(e) => set('perfil', e.target.value)}>{(cfg?.perfis || ['Pessoa Física', 'Fundos & Clubes']).map((p) => <option key={p}>{p}</option>)}</select></Field>
            {tipo === 'bullet' ? (
              <>
                <Tx label="Prazo (dias corridos)" k="prazo_dc" f={f} set={set} ph="363" />
                <Tx label="Taxa do termo (período)" k="taxa_termo" f={f} set={set} suffix="%" ph="15,55" />
                <Field label="Data de início" hint="Vazio = hoje"><input type="date" value={f.data_inicio} onChange={(e) => set('data_inicio', e.target.value)} /></Field>
                <Tx label="LFT a.a. (opcional)" k="lft_aa" f={f} set={set} suffix="%" hint={cfg ? `Padrão ${pct(cfg.lft_aa)}` : ''} />
              </>
            ) : (
              <>
                <Tx label="Nº de parcelas" k="parcelas" f={f} set={set} />
                <Tx label="Carência (meses)" k="carencia" f={f} set={set} />
                <Field label="Data base" hint="Vazio = hoje"><input type="date" value={f.data_base} onChange={(e) => set('data_base', e.target.value)} /></Field>
              </>
            )}
            <Tx label="Taxa BTC (a.a.)" k="taxa_btc" f={f} set={set} suffix="%" />
            <Tx label="Corretagem BTC" k="corretagem_btc" f={f} set={set} suffix="%" hint={cfg ? `${pct(cfg.corretagem_btc_min)} a ${pct(cfg.corretagem_btc_max)}` : ''} />
            <Tx label="Corretagem Termo" k="corretagem_termo" f={f} set={set} suffix="%" hint="0,50% a 1,00%" />
          </div>
          <label className="broker-checkbox-label" style={{ marginTop: 10 }}><input type="checkbox" checked={f.usar_feriados} onChange={(e) => set('usar_feriados', e.target.checked)} /> Considerar feriados nos dias úteis</label>
          {sugestao && <div style={{ marginTop: 10 }}><button className="hint-chip" onClick={() => set('taxa_termo', toPctText(sugestao.taxa, 4))}>Curva do dia: {pct(sugestao.taxa)} no prazo de {sugestao.prazo}d — usar</button></div>}
          {desagio && <div className={'alert ' + (desagio.margem && /n[ãa]o/i.test(desagio.margem) ? 'err' : 'info')} style={{ marginTop: 10 }}>{f.ativo}: margem B3 “{desagio.margem}”{desagio.desagio != null ? ` · deságio ${pct(desagio.desagio)}` : ''}</div>}
          {!travado && <Field label="Observações" style={{ marginTop: 10 }}><textarea rows={2} value={obs} onChange={(e) => setObs(e.target.value)} /></Field>}
        </div>

        <div>
          {err && <div className="alert err">{err}</div>}
          {!entrada && !err && <div className="card muted" style={{ textAlign: 'center', padding: 40 }}>Preencha os campos ao lado para ver a simulação.</div>}
          {busy && !res && <Spinner text="Calculando..." />}
          {res && (
            <>
              <div className="card" style={{ marginBottom: 12, opacity: busy ? 0.6 : 1 }}>
                <div className="row wrap">
                  {tipo === 'bullet' && <label className="broker-checkbox-label"><input type="checkbox" checked={lucro} onChange={(e) => setLucro(e.target.checked)} /> Incluir Lucro Real nas saídas</label>}
                  <span className="spacer" />
                  <button className="btn btn-ghost btn-sm" onClick={() => copiar('whatsapp', 'Simulação comercial')}><Icon d={ICONS.copy} /> WhatsApp</button>
                  <button className="btn btn-ghost btn-sm" onClick={() => copiar('auditoria', 'Modelo de auditoria')}><Icon d={ICONS.copy} /> Auditoria</button>
                  <button className="btn btn-ghost btn-sm" onClick={abrirEmail}><Icon d={ICONS.mail} /> E-mail à mesa</button>
                  <button className="btn btn-ghost btn-sm" onClick={pdf}><Icon d={ICONS.file} /> PDF</button>
                  {onCancel && <button className="btn btn-ghost btn-sm" onClick={onCancel}>Cancelar</button>}
                  <button className="btn btn-primary btn-sm" onClick={salvar}>{operacao ? 'Salvar nova versão' : 'Salvar no Acompanhamento'}</button>
                </div>
              </div>
              {tipo === 'bullet' ? <ResultadoBullet r={res} lucro={lucro} /> : <ResultadoParcelado r={res} />}
              {saidas && (
                <div className="grid-2" style={{ marginTop: 12 }}>
                  <div className="card"><h3>Simulação comercial (WhatsApp)</h3><div className="pre">{saidas.whatsapp}</div></div>
                  <div className="card"><h3>Modelo de auditoria</h3><div className="pre">{saidas.auditoria}</div></div>
                </div>
              )}
            </>
          )}
          <Checklist />
        </div>
      </div>
      {curvaModal && <CurvaModal onClose={() => setCurvaModal(false)} onSaved={(c) => { setCurva({ id: c.id, criada_em: c.criada_em, criada_por: c.criada_por, pontos: c.pontos.length }); setCurvaModal(false) }} />}
    </div>
  )
}
