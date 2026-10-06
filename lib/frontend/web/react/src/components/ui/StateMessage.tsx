import { cn } from '../../lib/utils'

type StateMessageProps = {
  title: string
  description?: string
  tone?: 'error' | 'empty'
  action?: { label: string; onClick: () => void }
  className?: string
}

export function StateMessage({
  title,
  description,
  tone = 'empty',
  action,
  className,
}: StateMessageProps) {
  return (
    <div className={cn('state-message', `state-message--${tone}`, className)} role="status">
      <div className="state-message__icon" aria-hidden="true">
        {tone === 'error' ? '!' : '-'}
      </div>
      <p className="state-message__title">{title}</p>
      {description ? <p className="state-message__desc">{description}</p> : null}
      {action ? (
        <button type="button" className="state-message__action" onClick={action.onClick}>
          {action.label}
        </button>
      ) : null}
    </div>
  )
}