interface ExpandButtonProps {
  displayMode: string | null | undefined;
  onRequestDisplayMode: (mode: "inline" | "fullscreen" | "pip") => void;
}

export function ExpandButton({
  displayMode,
  onRequestDisplayMode,
}: ExpandButtonProps) {
  const isFullscreen = displayMode === "fullscreen";

  const handleClick = () => {
    onRequestDisplayMode(isFullscreen ? "inline" : "fullscreen");
  };

  return (
    <button
      onClick={handleClick}
      className="absolute top-2 right-2 z-10 p-1.5 rounded-md shadow-sm transition-colors cursor-pointer"
      style={{
        background: "var(--color-background-primary, rgba(255,255,255,0.8))",
        border: `1px solid var(--qz-border-primary)`,
      }}
      aria-label={isFullscreen ? "Exit fullscreen" : "Expand to fullscreen"}
      title={isFullscreen ? "Exit fullscreen" : "Expand"}
    >
      {isFullscreen ? (
        <svg
          xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"
          fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          style={{ color: "var(--qz-text-secondary)" }}>
          <polyline points="4 14 10 14 10 20" /><polyline points="20 10 14 10 14 4" />
          <line x1="14" y1="10" x2="21" y2="3" /><line x1="3" y1="21" x2="10" y2="14" />
        </svg>
      ) : (
        <svg
          xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"
          fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          style={{ color: "var(--qz-text-secondary)" }}>
          <polyline points="15 3 21 3 21 9" /><polyline points="9 21 3 21 3 15" />
          <line x1="21" y1="3" x2="14" y2="10" /><line x1="3" y1="21" x2="10" y2="14" />
        </svg>
      )}
    </button>
  );
}
