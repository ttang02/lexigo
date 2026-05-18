import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Menu } from "./screens/Menu.jsx";
import { Game } from "./screens/Game.jsx";
import { End } from "./screens/End.jsx";
import { LeaderboardScreen } from "./screens/LeaderboardScreen.jsx";
import { RobotReplay } from "./screens/RobotReplay.jsx";

const SCREEN = { duration: 0.25, ease: [0.22, 1, 0.36, 1] };

function Screen({ children }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={SCREEN}
    >
      {children}
    </motion.div>
  );
}

export default function App() {
  const [screen, setScreen] = useState("menu");
  const [gameResult, setGameResult] = useState({ total: 0, gridId: null, cells: [] });

  function handleGameEnd({ total, gridId, cells }) {
    setGameResult({ total, gridId: gridId ?? null, cells: cells ?? [] });
    setScreen("end");
  }

  return (
    <main className="min-h-dvh px-4 py-6 md:py-10 bg-bg text-text-base">
      <AnimatePresence mode="wait">
        {screen === "menu" && (
          <Screen key="menu">
            <Menu onPlay={() => setScreen("game")} onLeaderboard={() => setScreen("leaderboard")} />
          </Screen>
        )}
        {screen === "game" && (
          <Screen key="game">
            <Game onEnd={handleGameEnd} />
          </Screen>
        )}
        {screen === "end" && (
          <Screen key="end">
            <End
              total={gameResult.total}
              gridId={gameResult.gridId}
              onRestart={() => setScreen("game")}
              onMenu={() => setScreen("menu")}
              onRobotReplay={() => setScreen("robot")}
            />
          </Screen>
        )}
        {screen === "leaderboard" && (
          <Screen key="leaderboard">
            <LeaderboardScreen onMenu={() => setScreen("menu")} />
          </Screen>
        )}
        {screen === "robot" && (
          <Screen key="robot">
            <RobotReplay
              gridId={gameResult.gridId}
              cells={gameResult.cells}
              onDone={() => setScreen("end")}
            />
          </Screen>
        )}
      </AnimatePresence>
    </main>
  );
}
