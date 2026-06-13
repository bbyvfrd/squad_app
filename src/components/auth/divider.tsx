// `.au-divider.au-divider-light` — the "or" rule between primary CTA and socials.
export function Divider({ children = "or" }: { children?: React.ReactNode }) {
  return <div className="au-divider au-divider-light">{children}</div>;
}
