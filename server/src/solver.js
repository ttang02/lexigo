export function solve({ cells, trie }) {
  const solutions = [];
  const visited = new Set();

  function dfs(index, currentWord, path) {
    if (currentWord.length > 0 && trie.hasWord(currentWord)) {
      const key = currentWord + ":" + path.join(",");
      if (!visited.has(key)) {
        visited.add(key);
        solutions.push({
          word: currentWord,
          path: [...path],
          score: computePathScore(path, cells),
        });
      }
    }

    if (currentWord.length >= 12) return; // max word length

    const row = Math.floor(index / 4);
    const col = index % 4;

    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        const nr = row + dr;
        const nc = col + dc;
        if (nr < 0 || nr >= 4 || nc < 0 || nc >= 4) continue;
        const nextIndex = nr * 4 + nc;
        if (!path.includes(nextIndex)) {
          const nextLetter = cells[nextIndex].letter;
          dfs(nextIndex, currentWord + nextLetter, [...path, nextIndex]);
        }
      }
    }
  }

  // Start from each cell
  for (let i = 0; i < cells.length; i++) {
    const letter = cells[i].letter;
    dfs(i, letter, [i]);
  }

  return solutions;
}

function computePathScore(path, cells) {
  let score = 0;
  for (const idx of path) {
    const cell = cells[idx];
    score += 1;
    if (cell.bonus === "double") score += 1;
    if (cell.bonus === "triple") score += 2;
  }
  return score;
}
