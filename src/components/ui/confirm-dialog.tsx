'use client'

import * as AlertDialog from '@radix-ui/react-alert-dialog'
import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from 'react'

// Popup de confirmação (shadcn / Radix AlertDialog) que substitui o confirm()
// nativo. Exposto como um hook baseado em promise: `await confirm({...})`.

export type ConfirmOptions = {
  title?: string
  description?: string
  confirmText?: string
  cancelText?: string
  destructive?: boolean
}

type ConfirmFn = (opts?: ConfirmOptions) => Promise<boolean>

const ConfirmContext = createContext<ConfirmFn | null>(null)

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const [opts, setOpts] = useState<ConfirmOptions>({})
  const resolver = useRef<((v: boolean) => void) | null>(null)

  const confirm = useCallback<ConfirmFn>((options = {}) => {
    setOpts(options)
    setOpen(true)
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve
    })
  }, [])

  // Resolve a promise uma única vez (button, overlay ou Esc).
  const settle = (result: boolean) => {
    setOpen(false)
    resolver.current?.(result)
    resolver.current = null
  }

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <AlertDialog.Root
        open={open}
        onOpenChange={(next) => {
          if (!next) settle(false)
        }}
      >
        <AlertDialog.Portal>
          <AlertDialog.Overlay className="confirm-overlay" />
          <AlertDialog.Content className="confirm-content">
            <AlertDialog.Title className="confirm-title">
              {opts.title ?? 'Confirmar ação'}
            </AlertDialog.Title>
            {opts.description && (
              <AlertDialog.Description className="confirm-desc">
                {opts.description}
              </AlertDialog.Description>
            )}
            <div className="confirm-footer">
              <AlertDialog.Cancel
                className="confirm-btn confirm-btn--cancel"
                onClick={() => settle(false)}
              >
                {opts.cancelText ?? 'Cancelar'}
              </AlertDialog.Cancel>
              <AlertDialog.Action
                className={`confirm-btn ${opts.destructive ? 'confirm-btn--destructive' : 'confirm-btn--confirm'}`}
                onClick={() => settle(true)}
              >
                {opts.confirmText ?? 'Confirmar'}
              </AlertDialog.Action>
            </div>
          </AlertDialog.Content>
        </AlertDialog.Portal>
      </AlertDialog.Root>
    </ConfirmContext.Provider>
  )
}

export function useConfirm(): ConfirmFn {
  const ctx = useContext(ConfirmContext)
  if (!ctx) throw new Error('useConfirm precisa estar dentro de <ConfirmProvider>')
  return ctx
}
