import { Tile } from "./Tile.jsx";

export function Grid({ cells, path, onTap }) {
  const selected = new Set(path);
  return (
    <div
      className="grid grid-cols-4 gap-2 w-full max-w-[480px] aspect-square mx-auto p-2 rounded-2xl bg-surface/40"
      role="group"
      aria-label="Ruzzle grid"
    >
      {cells.map((c, i) => (
        <Tile
          key={i}
          letter={c.letter}
          bonus={c.bonus}
          index={i}
          selected={selected.has(i)}
          onTap={onTap}
        />
      ))}
    </div>
  );
}
