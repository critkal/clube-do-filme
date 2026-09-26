import { useState } from 'react';

export default function StarRating({ value, onChange, disabled }) {
  const [hover, setHover] = useState(0);
  const shown = hover || value || 0;
  return (
    <div className={`rating-picker ${disabled ? 'disabled' : ''}`} role="group" aria-label="Nota de 1 a 10">
      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
        <button
          key={n}
          type="button"
          className={`rating-btn ${n <= shown ? 'on' : ''}`}
          disabled={disabled}
          onMouseEnter={() => !disabled && setHover(n)}
          onMouseLeave={() => setHover(0)}
          onClick={() => !disabled && onChange?.(n)}
          aria-label={`Nota ${n}`}
          aria-pressed={value === n}
        >
          {n}
        </button>
      ))}
    </div>
  );
}
