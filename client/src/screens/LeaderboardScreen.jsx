import { useEffect, useState } from "react";
import { Leaderboard } from "../components/Leaderboard.jsx";
import { fetchLeaderboard } from "../api.js";

export function LeaderboardScreen({ onMenu }) {
  const [rows, setRows] = useState([]);
  useEffect(() => { fetchLeaderboard(20).then(setRows); }, []);
  return (
    <section className="max-w-md mx-auto flex flex-col gap-4">
      <h2 className="font-display text-2xl">Classement</h2>
      <Leaderboard rows={rows} />
      <button onClick={onMenu} className="bg-surface px-6 py-2 rounded-lg">Menu</button>
    </section>
  );
}
