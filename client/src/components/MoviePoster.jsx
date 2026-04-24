export default function MoviePoster({ src, alt, size = 'md' }) {
  const cls = `poster poster-${size}`;
  if (!src) return <div className={`${cls} placeholder`}>Sem pôster</div>;
  return <img src={src} alt={alt} className={cls} />;
}
