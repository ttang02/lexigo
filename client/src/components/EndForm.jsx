import { useState } from "react";

export function EndForm({ score, onSubmit }) {
  const [pseudo, setPseudo] = useState("");
  const [error, setError] = useState(null);

  function handle(e) {
    e.preventDefault();
    const v = pseudo.trim();
    if (!v) { setError("Pseudo requis"); return; }
    if (!/^[A-Za-z0-9_\- ]{1,20}$/.test(v)) { setError("Caractères ou longueur invalides"); return; }
    setError(null);
    onSubmit(v);
  }

  return (
    <form onSubmit={handle} className="bg-surface rounded-2xl p-6 max-w-md w-full mx-auto">
      <h2 className="font-display text-2xl mb-2">Partie terminée</h2>
      <p className="mb-4">Score final : <span className="font-display text-accent text-3xl tabular">{score}</span></p>
      <label htmlFor="pseudo" className="block text-sm mb-1">Pseudo</label>
      <input
        id="pseudo"
        type="text"
        value={pseudo}
        onChange={(e) => setPseudo(e.target.value)}
        maxLength={20}
        autoComplete="nickname"
        className="w-full px-3 py-2 rounded-lg bg-surface-2 text-text-base focus:outline-none focus:ring-2 focus:ring-accent"
      />
      {error && <p role="alert" className="text-danger text-sm mt-1">{error}</p>}
      <button type="submit" className="mt-4 w-full bg-primary text-bg font-display font-bold py-2 rounded-lg">
        Enregistrer
      </button>
    </form>
  );
}
