import { useState } from 'react'
import { Topbar } from '../../ui'
import Simulador from './Simulador'
import Acompanhamento from './Acompanhamento'

export default function TermoCaixa() {
  const [aba, setAba] = useState('acomp')
  const [key, setKey] = useState(0)
  const [simKey, setSimKey] = useState(0)
  return (
    <div className="page active" style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      <Topbar title="Termo Caixa" sub="Soluções de Crédito" />
      <div className="tabs">
        <button className={'tab' + (aba === 'sim' ? ' active' : '')} onClick={() => setAba('sim')}>Simulador</button>
        <button className={'tab' + (aba === 'acomp' ? ' active' : '')} onClick={() => setAba('acomp')}>Acompanhamento</button>
      </div>
      <div className="page-body">
        {aba === 'sim'
          ? <Simulador key={simKey} onSaved={() => { setKey((k) => k + 1); setSimKey((k) => k + 1); setAba('acomp') }} />
          : <Acompanhamento reloadKey={key} onNova={() => { setSimKey((k) => k + 1); setAba('sim') }} />}
      </div>
    </div>
  )
}
