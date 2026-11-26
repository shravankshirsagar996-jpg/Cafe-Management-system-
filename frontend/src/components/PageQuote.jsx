const QUOTES_BY_PAGE = {
  login: {
    text: "Great coffee starts with a calm mind and a clear purpose.",
    sub: "— CAFE CRAFT",
  },
  dashboard: {
    text: "Numbers tell the story; consistent craft builds the legacy.",
    sub: "— CAFE CRAFT",
  },
  billing: {
    text: "Every settled bill is a quiet mark of trust earned today.",
    sub: "— CAFE CRAFT",
  },
  menu: {
    text: "Simplicity on the menu lets every flavor speak for itself.",
    sub: "— CAFE CRAFT",
  },
  orders: {
    text: "Speed without hurry is the art of true hospitality.",
    sub: "— CAFE CRAFT",
  },
  kitchen: {
    text: "Precision at the pass turns ingredients into memories.",
    sub: "— CAFE CRAFT",
  },
  default: {
    text: "Crafted with care, served with warmth.",
    sub: "— CAFE CRAFT",
  },
};

export default function PageQuote({ page = "default", quote, subtext, className = "" }) {
  const key = String(page || "default").toLowerCase();
  const chosen = QUOTES_BY_PAGE[key] || QUOTES_BY_PAGE.default;
  const mainText = quote || chosen.text;
  const caption = subtext || chosen.sub;

  return (
    <div
      style={{
        background: "transparent",
        backgroundColor: "transparent",
        backgroundImage: "none",
        backdropFilter: "none",
        WebkitBackdropFilter: "none",
        border: "none",
        boxShadow: "none",
      }}
      className={`mt-0 w-full px-3 py-0 flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-2 select-none ${className}`}
    >
      <p
        style={{
          background: "transparent",
          color: "#ffffff",
          fontFamily: "Georgia, 'Times New Roman', serif",
          textShadow: "0 2px 16px rgba(0, 0, 0, 0.92)",
        }}
        className="text-lg sm:text-2xl lg:text-[26px] font-bold italic tracking-wide leading-relaxed"
      >
        &ldquo;{mainText}&rdquo;
      </p>
      <span
        style={{
          background: "transparent",
          color: "#f6c453",
          fontFamily: "Georgia, 'Times New Roman', serif",
          textShadow: "0 2px 12px rgba(0, 0, 0, 0.92)",
        }}
        className="text-xs sm:text-sm font-bold italic tracking-wider shrink-0"
      >
        {caption}
      </span>
    </div>
  );
}