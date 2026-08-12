import './ModeTabs.css';

interface ModeTabsProps {
  isPreview: boolean;
  onSelectPreview: () => void;
  onSelectTryOn: () => void;
}

export function ModeTabs({ isPreview, onSelectPreview, onSelectTryOn }: ModeTabsProps) {
  return (
    <div className="mode-tabs" role="tablist" aria-label="Viewer mode">
      <button
        type="button"
        role="tab"
        aria-selected={isPreview}
        className={`mode-tabs__tab${isPreview ? ' mode-tabs__tab--active' : ''}`}
        onClick={onSelectPreview}
      >
        Preview
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={!isPreview}
        className={`mode-tabs__tab${!isPreview ? ' mode-tabs__tab--active' : ''}`}
        onClick={onSelectTryOn}
      >
        <CameraIcon />
        <span className="mode-tabs__tryon-label mode-tabs__tryon-label--full">Virtual Try-On</span>
        <span className="mode-tabs__tryon-label mode-tabs__tryon-label--short">Try-On</span>
      </button>
    </div>
  );
}

function CameraIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true">
      <path d="M208 56h-27.4l-14.5-24.2A16 16 0 0 0 152.5 24h-49a16 16 0 0 0-13.6 7.8L75.4 56H48a24 24 0 0 0-24 24v104a24 24 0 0 0 24 24h160a24 24 0 0 0 24-24V80a24 24 0 0 0-24-24zm-80 116a48 48 0 1 1 48-48 48.05 48.05 0 0 1-48 48z" />
    </svg>
  );
}
