import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Game } from "./Game.jsx";
import { End } from "./End.jsx";

const API = (path, body) =>
  fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }).then((r) => r.json());

// Live room SSE hook
function useRoomLive(code, onUpdate) {
  const esRef = useRef(null);
  useEffect(() => {
    if (!code) return;
    const es = new EventSource(`/api/rooms/${code}/live`);
    esRef.current = es;
    es.onmessage = (e) => {
      try { onUpdate(JSON.parse(e.data)); } catch { /* ignore */ }
    };
    es.onerror = () => es.close();
    return () => es.close();
  }, [code]); // eslint-disable-line react-hooks/exhaustive-deps
}

export function MultiScreen({ onMenu }) {
  const [phase, setPhase] = useState("lobby"); // lobby | waiting | playing | done
  const [pseudo, setPseudo] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [error, setError] = useState(null);
  const [roomInfo, setRoomInfo] = useState(null); // { code, gridId, cells, playerId }
  const [roomState, setRoomState] = useState(null);
  const [gameResult, setGameResult] = useState(null);

  useRoomLive(roomInfo?.code, (state) => {
    setRoomState(state);
    if (phase === "waiting" && state.playerCount >= 2) {
      setPhase("playing");
    }
  });

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
    return (
      <section className="max-w-md mx-auto flex flex-col items-center gap-4">
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
        <End
          total={myScore}
          gridId={roomInfo?.gridId}
          bots={[]}
          words={gameResult?.words ?? []}
          onRestart={() => { setPhase("lobby"); setRoomInfo(null); setRoomState(null); setGameResult(null); }}
          onMenu={onMenu}
          onRobotReplay={null}
        />
      </section>
    );
  }

  return null;
}
