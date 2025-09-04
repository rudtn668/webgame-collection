// lib/ladder.ts

export type Rung = { row: number; col: number };

// 간단한 시드 기반 RNG (mulberry32)
function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6D2B79F5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * 사다리 가로줄 생성
 * - 인접한 가로줄 겹침 방지
 * - 밀도(density): 각 위치에서 가로줄을 넣을 확률
 * - seed가 주어지면 동일한 결과를 재현 가능
 */
export function generateLadder(
  cols: number,
  rows: number,
  density = 0.28,
  seed?: number
): Rung[] {
  const rungs: Rung[] = [];
  if (cols <= 1) return rungs;
  const rand = seed != null ? mulberry32(seed) : Math.random;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols - 1; c++) {
      const leftTaken = rungs.some((x) => x.row === r && x.col === c - 1);
      if (leftTaken) continue;
      if (rand() < density) rungs.push({ row: r, col: c });
    }
  }
  return rungs;
}

/** 사다리 타기 진행: 시작 column -> 끝 column */
export function walkLadder(
  startCol: number,
  cols: number,
  rows: number,
  rungs: Rung[]
): number {
  let c = startCol;
  for (let r = 0; r < rows; r++) {
    const right = rungs.find((x) => x.row === r && x.col === c);
    if (right) {
      c = c + 1;
      continue;
    }
    const left = rungs.find((x) => x.row === r && x.col === c - 1);
    if (left) {
      c = c - 1;
      continue;
    }
  }
  return c;
}

export function computeMapping(cols: number, rows: number, rungs: Rung[]): number[] {
  const m: number[] = [];
  for (let c = 0; c < cols; c++) m.push(walkLadder(c, cols, rows, rungs));
  return m;
}

export type LadderConfig = {
  names: string[];   // 상단 이름
  results: string[]; // 하단 결과
  rows: number;
  density: number;
  rungs: Rung[];
  seed?: number;
  createdAt: number;
};

export function validateConfig(cfg: any): cfg is LadderConfig {
  if (!cfg || typeof cfg !== "object") return false;
  if (!Array.isArray(cfg.names) || !Array.isArray(cfg.results)) return false;
  if (typeof cfg.rows !== "number" || typeof cfg.density !== "number") return false;
  if (!Array.isArray(cfg.rungs)) return false;
  return true;
}
