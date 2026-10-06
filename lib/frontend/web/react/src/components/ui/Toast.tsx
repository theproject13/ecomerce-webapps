import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'

/** Varian toast: netral, sukses, atau galat. */
export type ToastVariant = 'default' | 'success' | 'error'

type ToastContextValue = {
  showToast: (message: string, variant?: ToastVariant) => void
}

const ToastContext = createContext<ToastContextValue>({ showToast: () => undefined })

/**
 * Toast satu-satu untuk umpan balik aksi. Dipakai sebagai pengganti
 * onclick="showToast(...)" pada versi HTML statis.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState<string | null>(null)
  const [variant, setVariant] = useState<ToastVariant>('default')
  const timerRef = useRef<number | undefined>(undefined)

  const showToast = useCallback((next: string, nextVariant: ToastVariant = 'default') => {
    setMessage(next)
    setVariant(nextVariant)

    if (timerRef.current !== undefined) {
      window.clearTimeout(timerRef.current)
    }

    timerRef.current = window.setTimeout(() => {
      setMessage(null)
      setVariant('default')
      timerRef.current = undefined
    }, 2200)
  }, [])

  const value = useMemo(() => ({ showToast }), [showToast])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className={
          'toast' +
          (variant === 'default' ? '' : ` toast--${variant}`) +
          (message ? ' toast--show' : '')
        }
        role="status"
        aria-live="polite"
      >
        {message ?? ''}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast(): ToastContextValue {
  return useContext(ToastContext)
}