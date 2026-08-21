"use client";

const links = [
  { href: "#regime", label: "共振", icon: "📡" },
  { href: "#positions", label: "持倉", icon: "📦" },
  { href: "#radar", label: "雷達", icon: "🛰️" },
  { href: "#focus", label: "動量", icon: "🎯" },
  { href: "#chart", label: "圖表", icon: "📈" },
];

export function BottomNav() {
  return (
    <nav className="fixed bottom-0 inset-x-0 z-50 md:hidden border-t border-terminal-border bg-terminal-card/95 backdrop-blur-md safe-bottom">
      <ul className="grid grid-cols-5">
        {links.map((l) => (
          <li key={l.href}>
            <a
              href={l.href}
              className="flex flex-col items-center py-2 text-[10px] text-terminal-muted hover:text-terminal-cyan"
            >
              <span className="text-base leading-none mb-0.5">{l.icon}</span>
              {l.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
