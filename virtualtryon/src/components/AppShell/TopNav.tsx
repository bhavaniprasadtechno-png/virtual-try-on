import './TopNav.css';

export function TopNav() {
  return (
    <header className="top-nav">
      <div className="top-nav__brand">
        <div className="top-nav__logo" aria-hidden="true">
          t
        </div>
        <span className="top-nav__wordmark">
          three<span className="top-nav__wordmark-accent">view</span>
        </span>
      </div>

      <div className="top-nav__search" role="search">
        <SearchIcon />
        <span className="top-nav__search-placeholder">Search...</span>
      </div>

      <div className="top-nav__actions">
        <button type="button" className="btn btn-secondary top-nav__pro">
          <CrownIcon />
          Pro
        </button>
        <button type="button" className="top-nav__icon-btn" aria-label="Toggle theme">
          <SunIcon />
        </button>
        <button type="button" className="top-nav__icon-btn" aria-label="Help">
          <QuestionIcon />
        </button>
        <div className="top-nav__divider" aria-hidden="true" />
        <div className="top-nav__avatar" aria-hidden="true">
          T
        </div>
        <div className="top-nav__user">
          <div className="top-nav__user-name">ThreeviewMarketing</div>
          <div className="top-nav__user-email">marketing@threeview.com</div>
        </div>
      </div>
    </header>
  );
}

function SearchIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true">
      <path d="M229.66 218.34l-50.07-50.06a88.11 88.11 0 1 0-11.31 11.31l50.06 50.07a8 8 0 0 0 11.32-11.32zM40 112a72 72 0 1 1 72 72 72.08 72.08 0 0 1-72-72z" />
    </svg>
  );
}

function CrownIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true">
      <path d="M247.13 92.51a16 16 0 0 0-16.9-2.32L185 110.83l-44.28-73.66a16 16 0 0 0-27.44 0L69 110.83l-45.24-20.64a16 16 0 0 0-22.08 18l24 110.14A16 16 0 0 0 41.34 232h173.32a16 16 0 0 0 15.65-13.67l24-110.14a16 16 0 0 0-7.18-15.68z" />
    </svg>
  );
}

function SunIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true">
      <path d="M120 40V16a8 8 0 0 1 16 0v24a8 8 0 0 1-16 0zm72 88a64 64 0 1 1-64-64 64.07 64.07 0 0 1 64 64zm-16 0a48 48 0 1 0-48 48 48.05 48.05 0 0 0 48-48zM58.34 69.66a8 8 0 0 0 11.32-11.32l-16-16a8 8 0 0 0-11.32 11.32zm0 116.68l-16 16a8 8 0 0 0 11.32 11.32l16-16a8 8 0 0 0-11.32-11.32zM192 72a8 8 0 0 0 5.66-2.34l16-16a8 8 0 0 0-11.32-11.32l-16 16A8 8 0 0 0 192 72zm5.66 114.34a8 8 0 0 0-11.32 11.32l16 16a8 8 0 0 0 11.32-11.32zM48 128a8 8 0 0 0-8-8H16a8 8 0 0 0 0 16h24a8 8 0 0 0 8-8zm80 80a8 8 0 0 0-8 8v24a8 8 0 0 0 16 0v-24a8 8 0 0 0-8-8zm112-88h-24a8 8 0 0 0 0 16h24a8 8 0 0 0 0-16z" />
    </svg>
  );
}

function QuestionIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true">
      <path d="M140 180a12 12 0 1 1-12-12 12 12 0 0 1 12 12zM128 72c-22.06 0-40 16.15-40 36v4a8 8 0 0 0 16 0v-4c0-11 10.77-20 24-20s24 9 24 20-10.77 20-24 20a8 8 0 0 0-8 8v8a8 8 0 0 0 16 0v-.72c18.24-3.35 32-17.9 32-35.28 0-19.85-17.94-36-40-36zm104 56A104 104 0 1 1 128 24a104.11 104.11 0 0 1 104 104zm-16 0a88 88 0 1 0-88 88 88.1 88.1 0 0 0 88-88z" />
    </svg>
  );
}
