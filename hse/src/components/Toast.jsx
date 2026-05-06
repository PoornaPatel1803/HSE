import { createContext, useContext, useState, useCallback, useRef } from 'react'
import { CheckCircle, XCircle, Info } from 'lucide-react'

const ToastContext = createContext(null)

export function ToastProvider({ children }) {
  const [toast, setToast] = useState(null)
  const timerRef = useRef(null)

  const show = useCallback((message, kind) => {
    if (timerRef.current) clearTimeout(timerRef.current)
    setToast({ message, kind, id: Date.now() })
    timerRef.current = setTimeout(() => setToast(null), 2400)
  }, [])

  const value = {
    success: (m) => show(m, 'success'),
    error:   (m) => show(m, 'error'),
    info:    (m) => show(m, 'info'),
  }

  return (
    <ToastContext.Provider value={value}>
      {children}
      {toast && (
        <div className="toast show" role="status" aria-live="polite">
          {toast.kind === 'success' && <CheckCircle size={16} color="#16a34a" />}
          {toast.kind === 'error'   && <XCircle     size={16} color="#dc2626" />}
          {toast.kind === 'info'    && <Info        size={16} color="#2563eb" />}
          <span>{toast.message}</span>
        </div>
      )}
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>')
  return ctx
}
