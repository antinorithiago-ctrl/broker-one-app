export const brl = (v, casas = 2) => {
  if (v === null || v === undefined || Number.isNaN(v)) return '—'
  const s = Math.abs(v).toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas })
  return (v < 0 ? '-R$ ' : 'R$ ') + s
}
export const brlShort = (v) => {
  if (v === null || v === undefined) return '—'
  const a = Math.abs(v)
  if (a >= 1e6) return `R$ ${(v / 1e6).toLocaleString('pt-BR', { maximumFractionDigits: 2 })}M`
  if (a >= 1e3) return `R$ ${(v / 1e3).toLocaleString('pt-BR', { maximumFractionDigits: 0 })}k`
  return brl(v)
}
export const num = (v, casas = 2) =>
  v === null || v === undefined ? '—' : v.toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas })
export const pct = (v, casas = 2) => (v === null || v === undefined ? '—' : num(v * 100, casas) + '%')
export const dbr = (iso) => { if (!iso) return '—'; const [y, m, d] = iso.slice(0, 10).split('-'); return `${d}/${m}/${y}` }
export const dtime = (iso) => {
  if (!iso) return '—'
  const d = new Date(iso.endsWith('Z') || iso.includes('+') ? iso : iso + 'Z')
  return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })
}
export const todayISO = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// "306.000,50" | "306000,5" | "306000.5" -> 306000.5 ; vazio/ inválido -> null
export function parseBR(s) {
  if (s === null || s === undefined) return null
  let t = String(s).trim().replace(/[R$\s%]/g, '')
  if (!t) return null
  if (t.includes(',')) t = t.replace(/\./g, '').replace(',', '.')
  else if ((t.match(/\./g) || []).length > 1) t = t.replace(/\./g, '')
  const n = Number(t)
  return Number.isFinite(n) ? n : null
}
export const parsePct = (s) => { const n = parseBR(s); return n === null ? null : n / 100 }
// decimal -> texto para input (0.1555 -> "15,55")
export const toPctText = (v, casas = 4) => (v === null || v === undefined ? '' : String(+(v * 100).toFixed(casas)).replace('.', ','))
export const toMoneyText = (v) => (v === null || v === undefined ? '' : v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }))

export const initials = (name = '') => name.split(' ').filter(Boolean).map((p) => p[0]).slice(0, 2).join('').toUpperCase() || '?'
