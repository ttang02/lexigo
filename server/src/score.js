const LETTER_VALUES = {
  A:1,E:1,I:1,L:1,N:1,O:1,R:1,S:1,T:1,U:1,
  D:2,G:2,M:2,
  B:3,C:3,P:3,
  F:4,H:4,V:4,
  J:8,Q:8,
  K:10,W:10,X:10,Y:10,Z:10,
};

export function letterValue(ch) {
  return LETTER_VALUES[ch] ?? 0;
}

function lengthBonus(n) {
  if (n >= 8) return 20;
  if (n === 7) return 15;
  if (n === 6) return 10;
  if (n === 5) return 5;
  return 0;
}

export function computeScore({ path, cells }) {
  let letterSum = 0;
  let wordMultiplier = 1;
  for (const idx of path) {
    const cell = cells[idx];
    let v = letterValue(cell.letter);
    if (cell.bonus === "DL") v *= 2;
    else if (cell.bonus === "TL") v *= 3;
    letterSum += v;
    if (cell.bonus === "DW") wordMultiplier *= 2;
    else if (cell.bonus === "TW") wordMultiplier *= 3;
  }
  return letterSum * wordMultiplier + lengthBonus(path.length);
}
