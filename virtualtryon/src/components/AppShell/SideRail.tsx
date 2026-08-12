import './SideRail.css';

const ICONS: { label: string; active?: boolean; path: string }[] = [
  { label: 'Dashboard', active: true, path: 'M40 48h72v72H40zm104 0h72v72h-72zM40 176h72v32H40zm104 0h72v32h-72z' },
  { label: 'Models', path: 'M128 24 32 80v96l96 56 96-56V80z' },
  { label: 'Gallery', path: 'M216 40H40a16 16 0 0 0-16 16v144a16 16 0 0 0 16 16h176a16 16 0 0 0 16-16V56a16 16 0 0 0-16-16z' },
  { label: 'Palette', path: 'M128 24a104 104 0 1 0 40 200 20 20 0 0 0 0-40 20 20 0 0 1 0-40h24a44 44 0 0 0 44-44 100 100 0 0 0-108-76z' },
  { label: 'Connectors', path: 'M180 76V44a20 20 0 0 0-40 0v32h-24V44a20 20 0 0 0-40 0v32H56a12 12 0 0 0-12 12v40a44 44 0 0 0 44 44h.6a52 52 0 0 0 39.4 46v34H84a12 12 0 0 0 0 24h88a12 12 0 0 0 0-24h-44v-34a52 52 0 0 0 39.4-46h.6a44 44 0 0 0 44-44V88a12 12 0 0 0-12-12z' },
  { label: 'Analytics', path: 'M224 208a8 8 0 0 1-8 8H40a8 8 0 0 1-8-8V48a8 8 0 0 1 16 0v134.4L108.7 116a8 8 0 0 1 10.6-.6l41 32.8L207 91.4a8 8 0 1 1 10 12.5l-56 44.8a8 8 0 0 1-10.6.6l-41-32.8L48 176.6V200h168a8 8 0 0 1 8 8z' },
  { label: 'AI tools', path: 'M208 144a15.9 15.9 0 0 0-6-12.5 32 32 0 0 0-26-52 32.4 32.4 0 0 0-8.2 1.06 32 32 0 0 0-59.6 0A32.4 32.4 0 0 0 100 79.5a32 32 0 0 0-26 52 16 16 0 0 0 0 25 32 32 0 0 0 26 52 32.4 32.4 0 0 0 8.2-1.06 32 32 0 0 0 59.6 0 32.4 32.4 0 0 0 8.2 1.06 32 32 0 0 0 26-52 15.9 15.9 0 0 0 6-12.5z' },
  { label: 'Docs', path: 'M200 32H72a16 16 0 0 0-16 16v168a8 8 0 0 0 8 8h136a16 16 0 0 0 16-16V48a16 16 0 0 0-16-16zM80 96h96m-96 40h96m-96 40h64' },
];

export function SideRail() {
  return (
    <nav className="side-rail" aria-label="Primary">
      {ICONS.map((icon) => (
        <button
          key={icon.label}
          type="button"
          className={`side-rail__item${icon.active ? ' side-rail__item--active' : ''}`}
          aria-label={icon.label}
          title={icon.label}
        >
          <svg width="20" height="20" viewBox="0 0 256 256" fill="none" stroke="currentColor" strokeWidth="16" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d={icon.path} />
          </svg>
        </button>
      ))}
    </nav>
  );
}
