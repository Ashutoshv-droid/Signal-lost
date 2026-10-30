/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface CircuitTile {
  id: string;
  row: number;
  col: number;
  // Connections in order: [Top, Right, Bottom, Left]
  baseConnections: [boolean, boolean, boolean, boolean];
  rotation: number; // 0, 1, 2, 3 (each is 90 deg clockwise)
  isPowered: boolean;
  type: 'line' | 'corner' | 'tee' | 'cross';
}

export interface CircuitPuzzleDef {
  id: string;
  title: string;
  systemName: string;
  rows: number;
  cols: number;
  inputPos: { row: number; col: number; edge: 'top' | 'right' | 'bottom' | 'left' };
  outputPos: { row: number; col: number; edge: 'top' | 'right' | 'bottom' | 'left' };
  initialTiles: {
    type: 'line' | 'corner' | 'tee' | 'cross';
    rotation: number;
  }[][];
}

// Helper to get active connections based on rotation
// [Top, Right, Bottom, Left] rotated clockwise by R steps:
// index 0 (Top) comes from (4 - R) % 4, etc.
export function getRotatedConnections(
  base: [boolean, boolean, boolean, boolean],
  rotation: number
): [boolean, boolean, boolean, boolean] {
  const r = (rotation % 4 + 4) % 4;
  return [
    base[(4 - r) % 4],
    base[(5 - r) % 4],
    base[(6 - r) % 4],
    base[(7 - r) % 4],
  ];
}

export function getBaseConnectionsForType(type: 'line' | 'corner' | 'tee' | 'cross'): [boolean, boolean, boolean, boolean] {
  switch (type) {
    case 'line':
      // Horizontal by default: [Top, Right, Bottom, Left] = [false, true, false, true]
      return [false, true, false, true];
    case 'corner':
      // Top to Right by default: [true, true, false, false]
      return [true, true, false, false];
    case 'tee':
      // Left, Top, Right: [true, true, false, true]
      return [true, true, false, true];
    case 'cross':
      return [true, true, true, true];
  }
}

export const PUZZLES: Record<string, CircuitPuzzleDef> = {
  'circuit-subreactor': {
    id: 'circuit-subreactor',
    title: 'SUB-REACTOR CONDUIT CALIBRATION',
    systemName: 'AUXILIARY POWER GRID - RELAY R-01',
    rows: 3,
    cols: 3,
    inputPos: { row: 0, col: 0, edge: 'left' },
    outputPos: { row: 2, col: 2, edge: 'right' },
    // Solvable configuration with initial scrambled rotations:
    // Solution path: (0,0)[corner: Right,Down] -> (1,0)[corner: Up,Right] -> (1,1)[tee: Left,Down,Right] -> (2,1)[corner: Up,Right] -> (2,2)[line: Left,Right]
    initialTiles: [
      [
        { type: 'corner', rotation: 2 }, // starts as down-left, needs to be right-down (rot 1)
        { type: 'line', rotation: 1 },
        { type: 'corner', rotation: 0 },
      ],
      [
        { type: 'corner', rotation: 3 }, // starts as left-up, needs up-right (rot 0)
        { type: 'tee', rotation: 3 },    // needs rot 2 or 1
        { type: 'line', rotation: 0 },
      ],
      [
        { type: 'line', rotation: 1 },
        { type: 'corner', rotation: 2 }, // needs up-right (rot 0)
        { type: 'line', rotation: 1 },   // needs horizontal (rot 0)
      ],
    ],
  },

  'circuit-security': {
    id: 'circuit-security',
    title: 'SECURITY GRID MATRIX OVERRIDE',
    systemName: 'VAULT LOCKDOWN BYPASS CONDUIT',
    rows: 3,
    cols: 4,
    inputPos: { row: 1, col: 0, edge: 'left' },
    outputPos: { row: 1, col: 3, edge: 'right' },
    initialTiles: [
      [
        { type: 'corner', rotation: 1 },
        { type: 'tee', rotation: 0 },
        { type: 'corner', rotation: 2 },
        { type: 'line', rotation: 1 },
      ],
      [
        { type: 'tee', rotation: 2 },
        { type: 'cross', rotation: 0 },
        { type: 'tee', rotation: 1 },
        { type: 'corner', rotation: 3 },
      ],
      [
        { type: 'corner', rotation: 0 },
        { type: 'line', rotation: 1 },
        { type: 'corner', rotation: 3 },
        { type: 'corner', rotation: 0 },
      ],
    ],
  },
};

// Evaluate the circuit and return which tiles are powered, and whether output is reached
export function evaluateCircuit(
  puzzle: CircuitPuzzleDef,
  tiles: CircuitTile[][]
): { poweredIds: Set<string>; isComplete: boolean } {
  const poweredIds = new Set<string>();
  const rows = puzzle.rows;
  const cols = puzzle.cols;

  // Find start tile at inputPos
  const startTile = tiles[puzzle.inputPos.row]?.[puzzle.inputPos.col];
  if (!startTile) return { poweredIds, isComplete: false };

  // Check if startTile accepts connection from input edge
  const startConns = getRotatedConnections(startTile.baseConnections, startTile.rotation);
  const inputDirIndex =
    puzzle.inputPos.edge === 'top' ? 0 :
    puzzle.inputPos.edge === 'right' ? 1 :
    puzzle.inputPos.edge === 'bottom' ? 2 : 3;

  if (!startConns[inputDirIndex]) {
    return { poweredIds, isComplete: false };
  }

  // BFS Queue
  const queue: { r: number; c: number }[] = [{ r: puzzle.inputPos.row, c: puzzle.inputPos.col }];
  poweredIds.add(startTile.id);

  // Directions: 0: Up (r-1, c), 1: Right (r, c+1), 2: Down (r+1, c), 3: Left (r, c-1)
  const dr = [-1, 0, 1, 0];
  const dc = [0, 1, 0, -1];
  const oppositeDir = [2, 3, 0, 1];

  let reachesOutput = false;

  while (queue.length > 0) {
    const { r, c } = queue.shift()!;
    const curTile = tiles[r][c];
    const curConns = getRotatedConnections(curTile.baseConnections, curTile.rotation);

    // Check if curTile is the output tile and connects to output edge
    if (r === puzzle.outputPos.row && c === puzzle.outputPos.col) {
      const outputDirIndex =
        puzzle.outputPos.edge === 'top' ? 0 :
        puzzle.outputPos.edge === 'right' ? 1 :
        puzzle.outputPos.edge === 'bottom' ? 2 : 3;
      if (curConns[outputDirIndex]) {
        reachesOutput = true;
      }
    }

    for (let d = 0; d < 4; d++) {
      if (!curConns[d]) continue; // No wire in this direction

      const nr = r + dr[d];
      const nc = c + dc[d];

      if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue;

      const neighbor = tiles[nr][nc];
      if (poweredIds.has(neighbor.id)) continue;

      const neighborConns = getRotatedConnections(neighbor.baseConnections, neighbor.rotation);
      // Neighbor must have wire connecting back to us
      if (neighborConns[oppositeDir[d]]) {
        poweredIds.add(neighbor.id);
        queue.push({ r: nr, c: nc });
      }
    }
  }

  return { poweredIds, isComplete: reachesOutput };
}
