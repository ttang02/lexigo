import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Menu } from "./screens/Menu.jsx";
import { Game } from "./screens/Game.jsx";
import { End } from "./screens/End.jsx";
import { LeaderboardScreen } from "./screens/LeaderboardScreen.jsx";
import { RobotReplay } from "./screens/RobotReplay.jsx";
import { HelpButton } from "./components/HelpButton.jsx";
import { ThemeToggle } from "./components/ThemeToggle.jsx";

const SCREEN = { duration: 0.25, ease: [0.22, 1, 0.36, 1] };

function Screen({ children, label }) {
  const ref = useRef(null);
  // Move focus to the new screen on transition so keyboard/SR users follow.
  useEffect(() => { ref.current?.focus(); }, []);
  return (
    <motion.div
      ref={ref}
      tabIndex={-1}
      aria-label={label}
      className="outline-none"
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
  const [gameMode, setGameMode] = useState("normal");
  const [gameResult, setGameResult] = useState({ total: 0, gridId: null, cells: [], bots: [], words: [] });

  function handleGameEnd({ total, gridId, cells, bots, words }) {
    setGameResult({ total, gridId: gridId ?? null, cells: cells ?? [], bots: bots ?? [], words: words ?? [] });
    setScreen("end");
  }

  function startGame(mode) {
    setGameMode(mode);
    setScreen("game");
  }

  return (
    <main className="min-h-dvh px-4 py-6 md:py-10 text-text-base">
      <AnimatePresence mode="wait">
        {screen === "menu" && (
          <Screen key="menu" label="Menu">
            <Menu
              onPlay={() => startGame("normal")}
              onPlayBombe={() => startGame("bombe")}
              onPlayDaily={() => startGame("daily")}
              onLeaderboard={() => setScreen("leaderboard")}
            />
          </Screen>
        )}
        {screen === "game" && (
          <Screen key="game" label="Partie en cours">
            <Game onEnd={handleGameEnd} mode={gameMode} />
          </Screen>
        )}
        {screen === "end" && (
          <Screen key="end" label="Fin de partie">
            <End
              total={gameResult.total}
              gridId={gameResult.gridId}
              bots={gameResult.bots}
              words={gameResult.words}
              onRestart={() => setScreen("game")}
              onMenu={() => setScreen("menu")}
              onRobotReplay={() => setScreen("robot")}
            />
          </Screen>
        )}
        {screen === "leaderboard" && (
          <Screen key="leaderboard" label="Classement">
            <LeaderboardScreen onMenu={() => setScreen("menu")} />
          </Screen>
        )}
        {screen === "robot" && (
          <Screen key="robot" label="Solution du robot">
            <RobotReplay
              gridId={gameResult.gridId}
              cells={gameResult.cells}
              onDone={() => setScreen("end")}
            />
          </Screen>
        )}
      </AnimatePresence>
      <HelpButton />
      <ThemeToggle />
    </main>
  );
}
