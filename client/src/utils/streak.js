/* global localStorage */
const KEY = "lexigo-streak";

function today() {
  return new Date().toISOString().slice(0, 10);
}

/** Call once per game submission. Returns { streak, bestStreak, isNewDay }. */
export function updateStreak() {
  const raw = localStorage.getItem(KEY);
  const data = raw ? JSON.parse(raw) : {};
  const { lastDate = null, streak = 0, bestStreak = 0 } = data;
  const t = today();

  if (lastDate === t) {
    return { streak, bestStreak, isNewDay: false };
  }

  const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
  const newStreak = lastDate === yesterday ? streak + 1 : 1;
  const newBest = Math.max(newStreak, bestStreak);

  localStorage.setItem(KEY, JSON.stringify({ lastDate: t, streak: newStreak, bestStreak: newBest }));
  return { streak: newStreak, bestStreak: newBest, isNewDay: true };
}

export function getStreak() {
  const raw = localStorage.getItem(KEY);
  if (!raw) return { streak: 0, bestStreak: 0 };
  const { streak = 0, bestStreak = 0 } = JSON.parse(raw);
  return { streak, bestStreak };
}

/** Compute earned badges from game result. */
export function computeBadges({ score, words, botsBeaten, botsTotal, streak }) {
  const badges = [];

  if (score >= 1000) badges.push({ id: "s1000", emoji: "💎", label: "1 000 pts !" });
  else if (score >= 500) badges.push({ id: "s500", emoji: "🥇", label: "500 pts" });
  else if (score >= 250) badges.push({ id: "s250", emoji: "🥈", label: "250 pts" });
  else if (score >= 100) badges.push({ id: "s100", emoji: "🥉", label: "100 pts" });

  const wc = words.length;
  if (wc >= 20) badges.push({ id: "w20", emoji: "📚", label: "20 mots" });
  else if (wc >= 10) badges.push({ id: "w10", emoji: "📖", label: "10 mots" });
  else if (wc >= 5) badges.push({ id: "w5", emoji: "✏️", label: "5 mots" });

  if (botsTotal > 0 && botsBeaten === botsTotal) {
    badges.push({ id: "crusher", emoji: "🤖", label: "Tous les robots !" });
  }

  if (streak >= 30) badges.push({ id: "s30", emoji: "🔥", label: `${streak} jours !` });
  else if (streak >= 7) badges.push({ id: "s7", emoji: "🔥", label: `${streak}j de suite` });
  else if (streak >= 3) badges.push({ id: "s3", emoji: "🔥", label: `${streak}j de suite` });

  if (score === 0) badges.push({ id: "zero", emoji: "😅", label: "Ça arrive…" });

  return badges;
}
