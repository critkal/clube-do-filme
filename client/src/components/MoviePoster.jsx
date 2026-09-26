export default function MoviePoster({ src, alt, size = 'md' }) {
  const cls = `poster poster-${size}`;
  if (!src) {
    return (
      <div className={`${cls} placeholder`} role="img" aria-label={alt ? `${alt} (sem pôster)` : 'Sem pôster'}>
        Sem pôster
      </div>
    );
  }
  return <img src={src} alt={alt || ''} className={cls} loading="lazy" decoding="async" />;
}
