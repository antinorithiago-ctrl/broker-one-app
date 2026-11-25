import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'

export const Icon = ({ d, size = 15, sw = 2, children }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw} style={{ width: size, height: size, flexShrink: 0 }}>
    {d ? <path d={d} /> : children}
  </svg>
)
export const ICONS = {
  plus: 'M12 5v14M5 12h14', x: 'M18 6 6 18M6 6l12 12', trash: 'M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0-1 14a2 2 0 01-2 2H7a2 2 0 01-2-2L4 6',
  copy: 'M9 9h10a2 2 0 012 2v10a2 2 0 01-2 2H9a2 2 0 01-2-2V11a2 2 0 012-2zM5 15H4a2 2 0 01-2-2V3a2 2 0 012-2h10a2 2 0 012 2v1',
  mail: 'M4 4h16a2 2 0 012 2v12a2 2 0 01-2 2H4a2 2 0 01-2-2V6a2 2 0 012-2zM22 6l-10 7L2 6',
  file: 'M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8zM14 2v6h6M16 13H8M16 17H8',
  upload: 'M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12',
  edit: 'M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.1 2.1 0 013 3L12 15l-4 1 1-4z',
}

// ───────── Toast ─────────
const ToastCtx = createContext(() => {})
export const useToast = () => useContext(ToastCtx)
export function ToastProvider({ children }) {
  const [t, setT] = useState(null)
  const timer = useRef()
  const show = useCallback((msg, type = 'success') => {
    setT({ msg, type })
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setT(null), 3200)
  }, [])
  return (
    <ToastCtx.Provider value={show}>
      {children}
      <div className={'toast' + (t ? ' show ' + t.type : '')} role="status">{t ? (t.type === 'error' ? '✕ ' : '✓ ') + t.msg : ''}</div>
    </ToastCtx.Provider>
  )
}

// ───────── Modal ─────────
export function Modal({ title, onClose, children, footer, width = 520 }) {
  useEffect(() => {
    const h = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])
  return (
    <div className="overlay open" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: width, width: '100%', maxHeight: '92vh', display: 'flex', flexDirection: 'column' }}>
        <div className="modal-header">
          <div className="modal-title">{title}</div>
          <button className="modal-close" onClick={onClose} aria-label="Fechar">×</button>
        </div>
        <div className="modal-body" style={{ overflowY: 'auto' }}>{children}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  )
}

export function Field({ label, hint, children, style }) {
  return (
    <div className="form-group" style={style}>
      {label && <label className="form-label">{label}</label>}
      {children}
      {hint && <div style={{ fontSize: 10.5, color: 'var(--text-3)', marginTop: 4 }}>{hint}</div>}
    </div>
  )
}

export function Topbar({ title, sub, right }) {
  return (
    <div className="topbar">
      <div>
        <div className="page-title">{title} {sub && <span>· {sub}</span>}</div>
        <div className="page-date">{new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</div>
      </div>
      <div className="topbar-right">{right}</div>
    </div>
  )
}

export const Spinner = ({ text = 'Carregando...' }) => (
  <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-3)', fontFamily: 'var(--font-mono)', fontSize: 12 }}>{text}</div>
)

export function useCopy() {
  const toast = useToast()
  return async (text, label = 'Texto') => {
    try { await navigator.clipboard.writeText(text); toast(`${label} copiado.`) }
    catch {
      const ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta); ta.select()
      try { document.execCommand('copy'); toast(`${label} copiado.`) } catch { toast('Não foi possível copiar.', 'error') }
      ta.remove()
    }
  }
}
