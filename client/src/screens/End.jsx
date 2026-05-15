import { useEffect, useState } from "react";
import { EndForm } from "../components/EndForm.jsx";
import { Leaderboard } from "../components/Leaderboard.jsx";
import { submitScore, fetchLeaderboard } from "../api.js";

export function End({ total, onRestart, onMenu }) {
  const [submitted, setSubmitted] = useState(false);
  const [rank, setRank] = useState(null);
  const [board, setBoard] = useState([]);

  useEffect(() => { if (submitted) fetchLeaderboard(20).then(setBoard); }, [submitted]);

  async function handleSubmit(pseudo) {
    const r = await submitScore({ pseudo, score: total });
    setRank(r.rank);
    setSubmitted(true);
  }

  if (!submitted) return <EndForm score={total} onSubmit={handleSubmit} />;
  return (
    <section className="max-w-md mx-auto flex flex-col gap-4">
      <h2 className="font-display text-2xl">Classement</h2>
      <p className="text-text-muted">Ton rang : <span className="text-accent font-bold">#{rank}</span></p>
      <Leaderboard rows={board} />
      <div className="flex gap-2 justify-center">
        <button onClick={onRestart} className="bg-primary text-bg px-6 py-2 rounded-lg font-bold">Rejouer</button>
        <button onClick={onMenu} className="bg-surface px-6 py-2 rounded-lg">Menu</button>
      </div>
    </section>
  );
}
