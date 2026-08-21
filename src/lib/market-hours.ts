/**
 * US equity regular session in Taiwan time (UTC+8):
 * Mon–Fri 20:30–03:00 (approx; we use 20:00–04:00 window per product spec).
 * Crypto is 24/7 but equity panel follows US cash hours for the live badge.
 */

export function getSessionStatus(now = new Date()): {
  isLive: boolean;
  label: string;
} {
  // Convert to Asia/Taipei wall-clock components
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Taipei",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(now);

  const weekday = parts.find((p) => p.type === "weekday")?.value ?? "";
  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? 0);
  const minute = Number(parts.find((p) => p.type === "minute")?.value ?? 0);
  const mins = hour * 60 + minute;

  const isWeekend = weekday === "Sat" || weekday === "Sun";
  // Live window: 20:00–23:59 or 00:00–04:00 Taipei
  const inEvening = mins >= 20 * 60;
  const inMorning = mins < 4 * 60;
  const inWindow = inEvening || inMorning;

  // Friday after 04:00 until Monday 20:00 is dormant for equities
  // Saturday/Sunday always dormant for the equity badge
  let isLive = false;
  if (!isWeekend && inWindow) {
    // Sunday night 20:00 start of week — weekday "Sun" blocked above
    isLive = true;
  }
  // Monday early morning (Sun night US) — Taipei Mon 00:00–04:00
  if (weekday === "Mon" && inMorning) isLive = true;
  // Friday evening session
  if (weekday === "Fri" && inEvening) isLive = true;
  // Fri after midnight Taipei = Sat morning US — already weekend dormant
  // Thu night → Fri morning covered by !weekend + inWindow

  if (isWeekend) {
    // Sunday 20:00 Taiwan = Sunday night US pre-market open next day
    if (weekday === "Sun" && inEvening) {
      isLive = true;
    } else {
      isLive = false;
    }
  }

  if (isLive) {
    return {
      isLive: true,
      label: "🟢 交易時段每小時更新 (20:00-04:00)",
    };
  }
  return {
    isLive: false,
    label: "💤 盤後休眠中 (週一至五 20:00 重啟)",
  };
}

export function nextAutoScanHint(now = new Date()): string {
  const session = getSessionStatus(now);
  if (session.isLive) {
    return "今日動量目標：交易時段內可手動刷新；自動掃描每日 21:00 (台北)";
  }
  return "下次自動掃描：最近交易日 21:00 (台北時間)";
}
