import { useRef, useState } from "react";
import { motion } from "framer-motion";
import { Game } from "./Game.jsx";
import { End } from "./End.jsx";
import { Confetti } from "../components/Confetti.jsx";
import { useLiveSSE } from "../hooks/useLiveSSE.js";
import { playVictory } from "../utils/sound.js";
import { API_BASE } from "../config.js";

const API = (path, body) =>
  fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }).then((r) => r.json());

function useRoomLive(code, onUpdate) {
  return useLiveSSE(code ? `${API_BASE}/api/rooms/${code}/live` : null, onUpdate);
}

export function MultiScreen({ onMenu }) {
  const [phase, setPhase] = useState("lobby"); // lobby | waiting | playing | done
  const [pseudo, setPseudo] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [error, setError] = useState(null);
  const [roomInfo, setRoomInfo] = useState(null); // { code, gridId, cells, playerId }
  const [roomState, setRoomState] = useState(null);
  const [gameResult, setGameResult] = useState(null);
  const victoryPlayedRef = useRef(false);

  const live = useRoomLive(roomInfo?.code, (state) => {
    setRoomState(state);
    if (phase === "waiting" && state.playerCount >= 2) {
      setPhase("playing");
    } else if (phase === "done" && roomInfo && state.gridId !== roomInfo.gridId) {
      // Opponent triggered a rematch — fetch the new grid and rejoin.
      fetch(`${API_BASE}/api/rooms/${state.code}`)
        .then((r) => r.json())
        .then((g) => {
          if (!g.cells) return;
          victoryPlayedRef.current = false;
          setRoomInfo((ri) => ({ ...ri, gridId: g.gridId, cells: g.cells }));
          setGameResult(null);
          setPhase("playing");
        })
        .catch(() => {});
    }
  });

  async function handleRematch() {
    setError(null);
    try {
      const r = await API(`/api/rooms/${roomInfo.code}/rematch`, {});
      if (!r.gridId) { setError("Erreur rematch."); return; }
      victoryPlayedRef.current = false;
      setRoomInfo((ri) => ({ ...ri, gridId: r.gridId, cells: r.cells }));
      setGameResult(null);
      setPhase("playing");
    } catch { setError("Erreur rematch."); }
  }

  async function handleCreate() {
    setError(null);
    try {
      const r = await API("/api/rooms", {});
      if (r.code) {
        const join = await API("/api/rooms/join", { code: r.code, pseudo: pseudo || "Hôte" });
        if (join.code === "ROOM_ERROR") { setError("Erreur création."); return; }
        setRoomInfo({ code: r.code, gridId: join.gridId, cells: join.cells, playerId: join.playerId });
        setPhase("waiting");
      }
    } catch { setError("Impossible de créer la partie."); }
  }

  async function handleJoin() {
    setError(null);
    const code = joinCode.trim().toUpperCase();
    if (!code) { setError("Entre un code."); return; }
    try {
      const r = await API("/api/rooms/join", { code, pseudo: pseudo || "Joueur" });
      if (r.code === "ROOM_ERROR") { setError("Room introuvable ou pleine."); return; }
      setRoomInfo({ code: r.code, gridId: r.gridId, cells: r.cells, playerId: r.playerId });
      setPhase("playing");
    } catch { setError("Room introuvable ou pleine."); }
  }

  function handleGameEnd(result) {
    setGameResult(result);
    setPhase("done");
  }

  if (phase === "lobby") {
    return (
      <section className="max-w-md mx-auto flex flex-col gap-4">
        <h2 className="font-display text-2xl font-bold text-center">⚔️ Mode 1v1</h2>
        <input
          type="text"
          placeholder="Ton pseudo"
          value={pseudo}
          onChange={(e) => setPseudo(e.target.value)}
          maxLength={20}
          className="bg-surface border border-surface-2 px-4 py-2 rounded-lg text-text-base focus:outline-none focus:ring-2 focus:ring-accent"
        />
        <button
          type="button"
          onClick={handleCreate}
          className="bg-primary text-bg font-display font-bold px-6 py-3 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          Créer une partie
        </button>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Code (ex: 3FA2C1)"
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
            maxLength={6}
            className="flex-1 bg-surface border border-surface-2 px-4 py-2 rounded-lg text-text-base uppercase tracking-widest focus:outline-none focus:ring-2 focus:ring-accent"
          />
          <button
            type="button"
            onClick={handleJoin}
            className="bg-surface-2 px-4 py-2 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            Rejoindre
          </button>
        </div>
        {error && <p className="text-danger text-sm text-center">{error}</p>}
        <button type="button" onClick={onMenu} className="text-text-muted text-sm text-center">← Retour</button>
      </section>
    );
  }

  if (phase === "waiting") {
    return (
      <section className="max-w-md mx-auto flex flex-col items-center gap-6 py-8">
        <h2 className="font-display text-xl">En attente d'un adversaire…</h2>
        <motion.div
          animate={{ scale: [1, 1.08, 1] }}
          transition={{ repeat: Infinity, duration: 1.6 }}
          className="font-display text-5xl font-bold text-accent tracking-widest bg-surface-2 px-8 py-4 rounded-2xl"
        >
          {roomInfo?.code}
        </motion.div>
        <p className="text-text-muted text-sm text-center">
          Partage ce code à ton adversaire.<br />La partie démarre quand il rejoint.
        </p>
        {roomState && (
          <p className="text-text-muted text-xs">
            {roomState.playerCount}/2 joueur{roomState.playerCount > 1 ? "s" : ""} connecté{roomState.playerCount > 1 ? "s" : ""}
          </p>
        )}
        <button type="button" onClick={onMenu} className="text-text-muted text-sm">Annuler</button>
      </section>
    );
  }

  if (phase === "playing" && roomInfo) {
    const opponent = roomState?.players?.find((p) => p.id !== roomInfo.playerId);
    return (
      <div>
        {opponent && (
          <div className="max-w-5xl mx-auto mb-2 flex gap-2 justify-end">
            <span className="bg-surface-2 px-3 py-1 rounded-full text-sm text-text-muted">
              🤺 {opponent.pseudo}: <span className="font-bold text-accent">{opponent.score}</span> pts
            </span>
          </div>
        )}
        <Game
          onEnd={handleGameEnd}
          mode="multi"
          multiRoomCode={roomInfo.code}
          multiPlayerId={roomInfo.playerId}
          overrideGrid={{ gridId: roomInfo.gridId, cells: roomInfo.cells }}
        />
      </div>
    );
  }

  if (phase === "done") {
    const myScore = gameResult?.total ?? 0;
    const opponent = roomState?.players?.find((p) => p.id !== roomInfo?.playerId);
    const won = opponent ? myScore > opponent.score : null;
    if (won === true && !victoryPlayedRef.current) {
      victoryPlayedRef.current = true;
      playVictory();
    }
    return (
      <section className="max-w-md mx-auto flex flex-col items-center gap-4">
        {won === true && <Confetti />}
        <div className="text-6xl">{won === true ? "🏆" : won === false ? "😅" : "🤝"}</div>
        <h2 className="font-display text-2xl font-bold">
          {won === true ? "Victoire !" : won === false ? "Défaite…" : "Égalité !"}
        </h2>
        <p className="text-text-muted text-sm">
          Toi : <span className="text-text-base font-bold">{myScore}</span> pts
          {opponent && (
            <> · {opponent.pseudo} : <span className="text-text-base font-bold">{opponent.score}</span> pts</>
          )}
        </p>
        {!live && (
          <p className="text-text-muted text-xs">🔄 Reconnexion…</p>
        )}
        {opponent && (
          <button
            type="button"
            onClick={handleRematch}
            className="bg-primary text-bg font-display font-bold px-6 py-2 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            🔁 Rejouer contre {opponent.pseudo}
          </button>
        )}
        <End
          total={myScore}
          gridId={roomInfo?.gridId}
          bots={[]}
          words={gameResult?.words ?? []}
          onRestart={() => { setPhase("lobby"); setRoomInfo(null); setRoomState(null); setGameResult(null); }}
          onMenu={onMenu}
          onRobotReplay={null}
          allowSubmit={false}
        />
      </section>
    );
  }

  return null;
}
