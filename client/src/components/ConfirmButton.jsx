import { useState } from 'react';

/**
 * A destructive action button with an inline two-step confirmation.
 * Replaces window.confirm() with a themed, mobile-friendly prompt.
 *
 * Props:
 *  - onConfirm: called when the user confirms
 *  - children: trigger label
 *  - className: trigger button class (default "btn danger")
 *  - question: confirmation prompt (default "Confirmar?")
 *  - busy / busyLabel: show a pending state while the action runs
 *  - disabled
 */
export default function ConfirmButton({
  onConfirm,
  children,
  className = 'btn danger',
  question = 'Confirmar?',
  busy = false,
  busyLabel = 'Aguarde…',
  disabled = false,
}) {
  const [armed, setArmed] = useState(false);

  if (!armed) {
    return (
      <button type="button" className={className} disabled={disabled} onClick={() => setArmed(true)}>
        {children}
      </button>
    );
  }

  return (
    <span className="confirm-inline">
      <span className="confirm-inline-q">{question}</span>
      <button
        type="button"
        className="link-btn danger"
        disabled={busy}
        onClick={() => onConfirm()}
      >
        {busy ? busyLabel : 'Sim'}
      </button>
      <button type="button" className="link-btn" disabled={busy} onClick={() => setArmed(false)}>
        Não
      </button>
    </span>
  );
}
