// Generates the TokenizeArt NFT image: the number 42 built from gold blocks
// on a dark block grid (a nod to blockchain blocks and BNB Chain's gold).
//
// The artwork uses no fonts: each digit is a hand-drawn bitmap, so "42"
// renders identically everywhere and stays legible at thumbnail size.
//
// Outputs (in code/art/):
//   tokenize-art-42.svg  source artwork (also reusable for on-chain storage)
//   tokenize-art-42.png  2000x2000 render, the file uploaded to IPFS
//
// Usage: npm run generate-art
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";

const CANVAS_SIZE_PX = 1000;
const GRID_CELLS_PER_SIDE = 25;
const CELL_SIZE_PX = CANVAS_SIZE_PX / GRID_CELLS_PER_SIDE;
const BLOCK_INSET_PX = 3;
const BLOCK_CORNER_RADIUS_PX = 6;
const PNG_SIZE_PX = 2000;

// Digit bitmaps, 8 columns x 11 rows, with strokes two cells thick.
// "#" is a gold block, "." is empty.
const DIGIT_FOUR = [
  ".....##.",
  "....###.",
  "...####.",
  "..##.##.",
  ".##..##.",
  "##...##.",
  "########",
  "########",
  ".....##.",
  ".....##.",
  ".....##.",
];

// Rounded top and a vertical right side before the diagonal, so the 2 is not
// mistaken for a Z at thumbnail size.
const DIGIT_TWO = [
  "..####..",
  ".######.",
  "##....##",
  "......##",
  "......##",
  ".....##.",
  "....##..",
  "...##...",
  ".##.....",
  "########",
  "########",
];

// Layout in grid cells: two 8-column digits with a 3-column gap give 19
// columns, centered with 3 empty columns on each side. 11 rows tall,
// centered with 7 empty rows above and below.
const DIGIT_GAP_CELLS = 3;
const FIRST_DIGIT_COLUMN = 3;
const FIRST_DIGIT_ROW = 7;

type GridCell = { column: number; row: number };

function bitmapToCells(bitmap: string[], originColumn: number, originRow: number): GridCell[] {
  const cells: GridCell[] = [];
  bitmap.forEach((rowPattern, rowIndex) => {
    [...rowPattern].forEach((cellChar, columnIndex) => {
      if (cellChar === "#") {
        cells.push({ column: originColumn + columnIndex, row: originRow + rowIndex });
      }
    });
  });
  return cells;
}

function blockRect(cell: GridCell, fill: string, extraAttributes = ""): string {
  const x = cell.column * CELL_SIZE_PX + BLOCK_INSET_PX;
  const y = cell.row * CELL_SIZE_PX + BLOCK_INSET_PX;
  const size = CELL_SIZE_PX - 2 * BLOCK_INSET_PX;
  return `<rect x="${x}" y="${y}" width="${size}" height="${size}" rx="${BLOCK_CORNER_RADIUS_PX}" fill="${fill}"${extraAttributes}/>`;
}

function buildSvg(): string {
  const secondDigitColumn = FIRST_DIGIT_COLUMN + DIGIT_FOUR[0].length + DIGIT_GAP_CELLS;
  const goldCells = [
    ...bitmapToCells(DIGIT_FOUR, FIRST_DIGIT_COLUMN, FIRST_DIGIT_ROW),
    ...bitmapToCells(DIGIT_TWO, secondDigitColumn, FIRST_DIGIT_ROW),
  ];
  const goldCellKeys = new Set(goldCells.map((cell) => `${cell.column},${cell.row}`));

  // Every grid position not part of "42" is drawn as a dim, empty block.
  const emptyBlocks: string[] = [];
  for (let row = 0; row < GRID_CELLS_PER_SIDE; row++) {
    for (let column = 0; column < GRID_CELLS_PER_SIDE; column++) {
      if (!goldCellKeys.has(`${column},${row}`)) {
        emptyBlocks.push(blockRect({ column, row }, "#161d3a"));
      }
    }
  }

  const goldBlocks = goldCells.map((cell) => blockRect(cell, "url(#goldBlock)", ' filter="url(#glow)"'));

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${CANVAS_SIZE_PX} ${CANVAS_SIZE_PX}" width="${CANVAS_SIZE_PX}" height="${CANVAS_SIZE_PX}">
  <title>42</title>
  <defs>
    <radialGradient id="background" cx="50%" cy="45%" r="75%">
      <stop offset="0%" stop-color="#1a2350"/>
      <stop offset="100%" stop-color="#070a17"/>
    </radialGradient>
    <linearGradient id="goldBlock" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#ffe27a"/>
      <stop offset="55%" stop-color="#f0b90b"/>
      <stop offset="100%" stop-color="#c98a00"/>
    </linearGradient>
    <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur in="SourceGraphic" stdDeviation="6" result="blur"/>
      <feColorMatrix in="blur" type="matrix" values="1 0 0 0 0  0 0.75 0 0 0  0 0 0 0 0  0 0 0 0.55 0" result="goldGlow"/>
      <feMerge><feMergeNode in="goldGlow"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>
  <rect width="${CANVAS_SIZE_PX}" height="${CANVAS_SIZE_PX}" fill="url(#background)"/>
  <g>${emptyBlocks.join("")}</g>
  <g>${goldBlocks.join("")}</g>
</svg>
`;
}

const artDirectory = path.join(import.meta.dirname, "..", "art");
const svgPath = path.join(artDirectory, "tokenize-art-42.svg");
const pngPath = path.join(artDirectory, "tokenize-art-42.png");

mkdirSync(artDirectory, { recursive: true });
const svgSource = buildSvg();
writeFileSync(svgPath, svgSource);

const renderDensityDpi = (72 * PNG_SIZE_PX) / CANVAS_SIZE_PX;
await sharp(Buffer.from(svgSource), { density: renderDensityDpi })
  .resize(PNG_SIZE_PX, PNG_SIZE_PX)
  .png()
  .toFile(pngPath);

console.log(`Wrote ${svgPath}`);
console.log(`Wrote ${pngPath}`);
