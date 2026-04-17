import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";

interface ExpandableQuestionTextProps {
  text: string;
  maxLines?: number;
  textClassName?: string;
  textStyle?: CSSProperties;
  wrapperClassName?: string;
  chipAlign?: "start" | "center";
}

export function ExpandableQuestionText({
  text,
  maxLines = 4,
  textClassName = "",
  textStyle,
  wrapperClassName = "",
  chipAlign = "center",
}: ExpandableQuestionTextProps) {
  const pRef = useRef<HTMLParagraphElement>(null);
  const [overflowing, setOverflowing] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  useLayoutEffect(() => {
    const el = pRef.current;
    if (!el) return;
    const check = () => {
      setOverflowing(el.scrollHeight > el.clientHeight + 1);
    };
    check();
    const ro = new ResizeObserver(check);
    ro.observe(el);
    return () => ro.disconnect();
  }, [text, maxLines]);

  // Auto-close the modal if the question text changes underneath it
  // (e.g. parent navigates to the next question while modal is open).
  useEffect(() => {
    setModalOpen(false);
  }, [text]);

  const clampStyle: CSSProperties = {
    display: "-webkit-box",
    WebkitLineClamp: maxLines,
    WebkitBoxOrient: "vertical",
    overflow: "hidden",
  };

  return (
    <div
      className={wrapperClassName}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: chipAlign === "center" ? "center" : "flex-start",
        gap: 4,
        minWidth: 0,
      }}
    >
      <p
        ref={pRef}
        className={textClassName}
        style={{ ...clampStyle, ...textStyle, margin: 0, width: "100%" }}
      >
        {text}
      </p>
      {overflowing && (
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          aria-label="Read full question"
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: "#F5A742",
            background: "rgba(245,167,66,0.1)",
            border: "1px solid rgba(245,167,66,0.45)",
            borderRadius: 9999,
            padding: "2px 8px",
            cursor: "pointer",
            lineHeight: 1.2,
          }}
        >
          Tap to read full question ▸
        </button>
      )}
      {modalOpen && (
        <QuestionTextModal text={text} onClose={() => setModalOpen(false)} />
      )}
    </div>
  );
}

function QuestionTextModal({
  text,
  onClose,
}: {
  text: string;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        background: "rgba(0,0,0,0.7)",
        backdropFilter: "blur(2px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: "relative",
          width: "100%",
          maxWidth: 420,
          maxHeight: "80%",
          overflowY: "auto",
          background: "rgba(30,30,40,0.95)",
          border: "1px solid rgba(255,255,255,0.15)",
          borderRadius: 14,
          padding: "20px 20px 18px",
          boxShadow: "0 10px 40px rgba(0,0,0,0.5)",
        }}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          style={{
            position: "absolute",
            top: 10,
            right: 10,
            background: "transparent",
            border: "none",
            cursor: "pointer",
            color: "rgba(255,255,255,0.6)",
            padding: 4,
            lineHeight: 0,
          }}
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
        <h3
          style={{
            margin: "0 0 10px",
            fontSize: 11,
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: "0.03em",
            color: "rgba(255,255,255,0.5)",
          }}
        >
          Question
        </h3>
        <p
          style={{
            margin: 0,
            fontSize: 15,
            lineHeight: 1.5,
            color: "rgba(255,255,255,0.92)",
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
          }}
        >
          {text}
        </p>
      </div>
    </div>
  );
}
