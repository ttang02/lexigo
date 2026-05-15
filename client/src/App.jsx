import { useState } from "react";
import { Menu } from "./screens/Menu.jsx";
import { Game } from "./screens/Game.jsx";
import { End } from "./screens/End.jsx";
import { LeaderboardScreen } from "./screens/LeaderboardScreen.jsx";

export default function App() {
  const [screen, setScreen] = useState("menu");
  const [finalTotal, setFinalTotal] = useState(0);

  return (
    <main className="min-h-dvh px-4 py-6 md:py-10 bg-bg text-text-base">
      {screen === "menu" && (
        <Menu onPlay={() => setScreen("game")} onLeaderboard={() => setScreen("leaderboard")} />
      )}
      {screen === "game" && (
        <Game onEnd={({ total }) => { setFinalTotal(total); setScreen("end"); }} />
      )}
      {screen === "end" && (
        <End total={finalTotal} onRestart={() => setScreen("game")} onMenu={() => setScreen("menu")} />
      )}
      {screen === "leaderboard" && (
        <LeaderboardScreen onMenu={() => setScreen("menu")} />
      )}
    </main>
  );
}
