import { useEffect, useRef, useMemo } from "react";
import type { ChoicePayload } from "../types";
import { useGameMessages } from "../hooks/use-game-messages";

const GAME_WIDTH = 720;
const GAME_HEIGHT = 540;

interface GameRuntimeProps {
  srcDoc: string;
  onChoice: (payload: ChoicePayload) => void;
  onNext?: () => void;
  fullscreen?: boolean;
  maxHeight?: string;
  displayMode?: string;
  sessionId?: string;
}

/**
 * Game runtime iframe component.
 * Handles both desktop (fixed aspect ratio) and mobile (fullscreen) modes.
 */
export function GameRuntime({
  srcDoc,
  onChoice,
  onNext,
  fullscreen = false,
  maxHeight,
  displayMode,
  sessionId,
}: GameRuntimeProps) {
  const frameRef = useRef<HTMLIFrameElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useGameMessages({
    onChoice,
    onNext,
    onReady: () => {
      frameRef.current?.focus();
    },
    sessionId,
  });

  const iframeKey = useMemo(() => hashKey(srcDoc), [srcDoc]);

  useEffect(() => {
    frameRef.current?.focus();
  }, [srcDoc]);

  useEffect(() => {
    if (displayMode === "fullscreen") {
      frameRef.current?.focus();
    }
  }, [displayMode]);

  const handleWrapperClick = () => {
    frameRef.current?.focus();
  };

  if (fullscreen) {
    return (
      <div
        ref={wrapperRef}
        onClick={handleWrapperClick}
        className="w-full h-full"
        style={{
          touchAction: "none",
          WebkitTouchCallout: "none",
          WebkitUserSelect: "none",
          userSelect: "none",
        }}
      >
        <iframe
          key={iframeKey}
          ref={frameRef}
          scrolling="no"
          sandbox="allow-scripts allow-pointer-lock allow-same-origin"
          srcDoc={srcDoc}
          className="block w-full h-full border-0"
        />
      </div>
    );
  }

  return (
    <div
      ref={wrapperRef}
      onClick={handleWrapperClick}
      className="w-full relative overflow-hidden"
      style={{
        maxWidth: `${GAME_WIDTH}px`,
        aspectRatio: `${GAME_WIDTH} / ${GAME_HEIGHT}`,
        maxHeight: maxHeight ?? undefined,
        touchAction: "none",
        WebkitTouchCallout: "none",
        WebkitUserSelect: "none",
        userSelect: "none",
      }}
    >
      <iframe
        key={iframeKey}
        ref={frameRef}
        scrolling="no"
        sandbox="allow-scripts allow-pointer-lock allow-same-origin"
        srcDoc={srcDoc}
        className="block w-full h-full rounded-lg"
        style={{ border: `1px solid var(--qz-border-primary)` }}
      />
    </div>
  );
}

function hashKey(s: string): string {
  let h = 0;
  let i = s.length;
  while (i) h = (h * 31) ^ s.charCodeAt(--i);
  return String(h >>> 0);
}
