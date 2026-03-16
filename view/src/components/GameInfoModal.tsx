import type { Template } from "../types";

interface GameInfoModalProps {
  template: Template;
  onClose: () => void;
}

export function GameInfoModal({ template, onClose }: GameInfoModalProps) {
  return (
    <div
      className="absolute inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(2px)" }}
      onClick={onClose}
    >
      <div
        className="relative mx-4 max-w-md w-full rounded-xl p-5 shadow-2xl overflow-y-auto"
        style={{
          maxHeight: "80%",
          background: "rgba(30,30,40,0.95)",
          border: "1px solid rgba(255,255,255,0.15)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 p-1 rounded-full transition-colors"
          style={{ color: "rgba(255,255,255,0.6)" }}
          aria-label="Close"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        {/* Instructions */}
        {template.game_instructions && (
          <div className="mb-4">
            <h3
              className="text-xs font-semibold uppercase tracking-wide mb-2"
              style={{ color: "rgba(255,255,255,0.5)" }}
            >
              How to Play
            </h3>
            <p
              className="text-sm leading-relaxed"
              style={{ color: "rgba(255,255,255,0.9)" }}
            >
              {template.game_instructions}
            </p>
          </div>
        )}

        {/* Controls */}
        {template.game_controls && template.game_controls.length > 0 && (
          <div>
            <h3
              className="text-xs font-semibold uppercase tracking-wide mb-2"
              style={{ color: "rgba(255,255,255,0.5)" }}
            >
              Controls
            </h3>
            <div className="flex flex-col gap-2">
              {template.game_controls.map((control, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 text-sm"
                  style={{ color: "rgba(255,255,255,0.85)" }}
                >
                  {control.keys && control.keys.length > 0 && (
                    <span className="flex gap-1 flex-shrink-0">
                      {control.keys.map((key, j) => (
                        <kbd
                          key={j}
                          className="inline-block px-2 py-0.5 rounded text-xs font-mono"
                          style={{
                            background: "rgba(255,255,255,0.12)",
                            border: "1px solid rgba(255,255,255,0.2)",
                          }}
                        >
                          {key}
                        </kbd>
                      ))}
                    </span>
                  )}
                  <span>{control.description}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
