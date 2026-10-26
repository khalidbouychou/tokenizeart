// Generates the TokenizeArt NFT image: the number 42 built from gold blocks
// on a dark block grid (a nod to blockchain blocks and BNB Chain's gold).
//
// The artwork uses no fonts: each digit is a hand-drawn bitmap, so "42"
// renders identically everywhere and stays legible at thumbnail size.
//
// Outputs (in code/art/):
//   tokenize-art-42.svg          source artwork
//   tokenize-art-42.png          2000x2000 render, the file uploaded to IPFS
//   tokenize-art-42-onchain.svg  same artwork in ~1.5 KB, stored on-chain
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

/** Grid cells forming "42", shared by both SVG versions. */
function goldCellsOf42(): GridCell[] {
  const secondDigitColumn = FIRST_DIGIT_COLUMN + DIGIT_FOUR[0].length + DIGIT_GAP_CELLS;
  return [
    ...bitmapToCells(DIGIT_FOUR, FIRST_DIGIT_COLUMN, FIRST_DIGIT_ROW),
    ...bitmapToCells(DIGIT_TWO, secondDigitColumn, FIRST_DIGIT_ROW),
  ];
}

function buildSvg(): string {
  const goldCells = goldCellsOf42();
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

/**
 * Same artwork in ~1.5 KB, small enough to store on-chain (gas is paid per
 * byte). Instead of 625 separate squares, one repeating pattern draws every
 * empty block, and a second pattern of gold blocks fills a path made of one
 * rectangle per horizontal run of "42" cells. Single quotes only, so it can
 * be embedded in a JSON string without escaping, and fractions instead of
 * "%" values, so only "#" needs encoding inside a data: URI.
 */
function buildCompactSvg(): string {
  const goldCellKeys = new Set(goldCellsOf42().map((cell) => `${cell.column},${cell.row}`));
  const blockSize = CELL_SIZE_PX - 2 * BLOCK_INSET_PX;

  // One "M x y h w v h h -w z" rectangle per horizontal run of gold cells.
  const runRectangles: string[] = [];
  for (let row = 0; row < GRID_CELLS_PER_SIDE; row++) {
    let column = 0;
    while (column < GRID_CELLS_PER_SIDE) {
      if (!goldCellKeys.has(`${column},${row}`)) {
        column++;
        continue;
      }
      const runStartColumn = column;
      while (goldCellKeys.has(`${column},${row}`)) {
        column++;
      }
      const runWidth = (column - runStartColumn) * CELL_SIZE_PX;
      runRectangles.push(`M${runStartColumn * CELL_SIZE_PX} ${row * CELL_SIZE_PX}h${runWidth}v${CELL_SIZE_PX}h-${runWidth}z`);
    }
  }

  const tileBlock = (fill: string) =>
    `<rect x='${BLOCK_INSET_PX}' y='${BLOCK_INSET_PX}' width='${blockSize}' height='${blockSize}' rx='${BLOCK_CORNER_RADIUS_PX}' fill='${fill}'/>`;
  const tilePattern = (id: string, fill: string) =>
    `<pattern id='${id}' width='${CELL_SIZE_PX}' height='${CELL_SIZE_PX}' patternUnits='userSpaceOnUse'>${tileBlock(fill)}</pattern>`;

  return [
    // width/height give wallets an intrinsic size (otherwise often 150px).
    `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 ${CANVAS_SIZE_PX} ${CANVAS_SIZE_PX}' width='${CANVAS_SIZE_PX}' height='${CANVAS_SIZE_PX}'>`,
    "<defs>",
    "<radialGradient id='b' cx='.5' cy='.45' r='.75'><stop offset='0' stop-color='#1a2350'/><stop offset='1' stop-color='#070a17'/></radialGradient>",
    "<linearGradient id='g' x2='0' y2='1'><stop offset='0' stop-color='#ffe27a'/><stop offset='.55' stop-color='#f0b90b'/><stop offset='1' stop-color='#c98a00'/></linearGradient>",
    tilePattern("e", "#161d3a"),
    tilePattern("o", "url(#g)"),
    "<filter id='l' x='-.5' y='-.5' width='2' height='2'><feGaussianBlur stdDeviation='6'/><feColorMatrix values='1 0 0 0 0 0 .75 0 0 0 0 0 0 0 0 0 0 0 .55 0'/><feMerge><feMergeNode/><feMergeNode in='SourceGraphic'/></feMerge></filter>",
    "</defs>",
    `<rect width='${CANVAS_SIZE_PX}' height='${CANVAS_SIZE_PX}' fill='url(#b)'/>`,
    `<rect width='${CANVAS_SIZE_PX}' height='${CANVAS_SIZE_PX}' fill='url(#e)'/>`,
    `<path d='${runRectangles.join("")}' fill='url(#o)' filter='url(#l)'/>`,
    "</svg>",
  ].join("");
}

const artDirectory = path.join(import.meta.dirname, "..", "art");
const svgPath = path.join(artDirectory, "tokenize-art-42.svg");
const pngPath = path.join(artDirectory, "tokenize-art-42.png");
const onChainSvgPath = path.join(artDirectory, "tokenize-art-42-onchain.svg");

mkdirSync(artDirectory, { recursive: true });
const svgSource = buildSvg();
writeFileSync(svgPath, svgSource);
writeFileSync(onChainSvgPath, buildCompactSvg());

const renderDensityDpi = (72 * PNG_SIZE_PX) / CANVAS_SIZE_PX;
await sharp(Buffer.from(svgSource), { density: renderDensityDpi })
  .resize(PNG_SIZE_PX, PNG_SIZE_PX)
  .png()
  .toFile(pngPath);

console.log(`Wrote ${svgPath}`);
console.log(`Wrote ${pngPath}`);
console.log(`Wrote ${onChainSvgPath}`);
