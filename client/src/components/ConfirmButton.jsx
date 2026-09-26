import { useEffect, useRef, useState } from 'react';

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
 *
 * Arming moves focus to "Não" so a stray Enter can't confirm; Escape cancels
 * and returns focus to the trigger.
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
  const triggerRef = useRef(null);
  const cancelRef = useRef(null);
  const wasArmed = useRef(false);

  useEffect(() => {
    if (armed) cancelRef.current?.focus();
    else if (wasArmed.current) triggerRef.current?.focus();
    wasArmed.current = armed;
  }, [armed]);

  if (!armed) {
    return (
      <button ref={triggerRef} type="button" className={className} disabled={disabled} onClick={() => setArmed(true)}>
        {children}
      </button>
    );
  }

  return (
    <span
      className="confirm-inline"
      role="group"
      aria-label={question}
      onKeyDown={(e) => { if (e.key === 'Escape' && !busy) setArmed(false); }}
    >
      <span className="confirm-inline-q" aria-live="polite">{question}</span>
      <button
        type="button"
        className="link-btn danger"
        disabled={busy}
        onClick={() => onConfirm()}
      >
        {busy ? busyLabel : 'Sim'}
      </button>
      <button ref={cancelRef} type="button" className="link-btn" disabled={busy} onClick={() => setArmed(false)}>
        Não
      </button>
    </span>
  );
}
