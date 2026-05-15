export function Menu({ onPlay, onLeaderboard }) {
  return (
    <section className="flex flex-col items-center gap-6 max-w-md mx-auto">
      <h1 className="font-display font-bold text-5xl md:text-6xl text-accent">Ruzzle FR</h1>
      <p className="text-text-muted text-center">Trouve un maximum de mots en 2 minutes.</p>
      <button onClick={onPlay} className="bg-primary text-bg font-display font-bold px-8 py-3 rounded-xl text-lg">
        Jouer
      </button>
      <button onClick={onLeaderboard} className="text-text-muted underline">
        Voir le classement
      </button>
    </section>
  );
}
