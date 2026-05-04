'use client'
import { useApp } from '@/contexts/AppContext'

type ModalProps = {
  id: string
  title: string
  children: React.ReactNode
  footer?: React.ReactNode
}

export default function Modal({ id, title, children, footer }: ModalProps) {
  const { closeModal } = useApp()
  return (
    <div className="modal-overlay" id={id} onClick={e => { if ((e.target as HTMLElement).id === id) closeModal(id) }}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-head">
          <div className="modal-title">{title}</div>
          <button className="modal-x" onClick={() => closeModal(id)}>✕</button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>
  )
}
