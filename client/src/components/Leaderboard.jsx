export function Leaderboard({ rows }) {
  if (rows.length === 0) {
    return <p className="text-text-muted">Aucun score pour le moment.</p>;
  }
  return (
    <table className="w-full bg-surface rounded-2xl overflow-hidden">
      <thead>
        <tr className="text-left text-text-muted text-sm">
          <th className="p-3">#</th>
          <th className="p-3">Pseudo</th>
          <th className="p-3 text-right">Score</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={r.pseudo} className="border-t border-surface-2">
            <td className="p-3 tabular text-text-muted">{i + 1}</td>
            <td className="p-3 font-medium">{r.pseudo}</td>
            <td className="p-3 text-right font-display font-bold tabular text-accent">{r.score}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
