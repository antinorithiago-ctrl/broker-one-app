import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api'
import { useAuth } from '../auth'
import { brlShort, pct } from '../format'

export default function Home() {
  const { user } = useAuth()
  const [r, setR] = useState(null)
  useEffect(() => { api.get('/api/termo/resumo').then(setR).catch(() => {}) }, [])
  const h = new Date().getHours()
  const saud = h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite'
  const nome = (user.name || user.username).split(' ')[0]
  return (
    <div className="page active">
      <div className="page-body">
        <div className="home">
          <div className="home-head">
            <div>
              <div className="home-kicker">Mesa Corporate</div>
              <div className="home-title">{saud}, {nome}</div>
              <div className="home-date">
                {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              </div>
            </div>
            <Link to="/termo-caixa" className="btn btn-primary" style={{ textDecoration: 'none' }}>Abrir Termo Caixa</Link>
          </div>
          {r && (
            <div className="home-kpis">
              <div className="kpi-card"><div className="kpi-label">Operações abertas</div><div className="kpi-value">{r.abertas}</div><div className="kpi-sub">{brlShort(r.volume_aberto)} em volume</div></div>
              <div className="kpi-card"><div className="kpi-label">Ganhas no mês</div><div className="kpi-value">{r.ganhas_mes}</div><div className="kpi-sub">{brlShort(r.receita_ganhas_mes)} de receita bruta</div></div>
              <div className="kpi-card hero"><div className="kpi-label">Conversão</div><div className="kpi-value">{r.conversao === null ? '—' : pct(r.conversao, 0)}</div><div className="kpi-sub">ganhas ÷ fechadas</div></div>
            </div>
          )}
          <div className="home-hint">Selecione um módulo na barra lateral para começar.</div>
        </div>
      </div>
    </div>
  )
}
