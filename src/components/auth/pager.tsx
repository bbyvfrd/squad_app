// Carousel / step dots — `.au-pager.au-pager-light` with the active dot widened.
// Purely decorative; the live step is conveyed by the screen content, so aria-hidden.
export function Pager({ active, count = 3 }: { active: number; count?: number }) {
  return (
    <div className="au-pager au-pager-light" aria-hidden="true">
      {Array.from({ length: count }).map((_, i) => (
        <i key={i} className={i === active ? "on" : undefined} />
      ))}
    </div>
  );
}
