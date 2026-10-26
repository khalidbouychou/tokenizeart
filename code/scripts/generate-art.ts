// Draws the NFT image: "42" made of gold blocks on a dark grid
// (blocks like a blockchain, gold like BNB Chain).
//
// No font is used, each digit is drawn block by block,
// so the 42 looks the same everywhere and is easy to read even small.
//
// Files created in code/art/:
//   tokenize-art-42.svg          the drawing
//   tokenize-art-42.png          2000x2000 image, the one on IPFS
//   tokenize-art-42-onchain.svg  small version (~1.5 KB) stored on-chain
//
// npm run generate-art
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";

const CANVAS_SIZE_PX = 1000;
const GRID_CELLS_PER_SIDE = 25;
const CELL_SIZE_PX = CANVAS_SIZE_PX / GRID_CELLS_PER_SIDE;
const BLOCK_INSET_PX = 3;
const BLOCK_CORNER_RADIUS_PX = 6;
const PNG_SIZE_PX = 2000;

// each digit is 8 x 11 cells, "#" = gold block, "." = empty
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

// round top so the 2 doesn't look like a Z when small
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

// position of the 42 in the 25x25 grid (centered)
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

// cells of the "42", used by both svg versions
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

  // all the other cells are dark empty blocks
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

// Same image but very small (~1.5 KB) so it's cheap to store on-chain.
// Instead of 625 squares we use repeating patterns.
// Only single quotes and no "%" so it fits easily in the JSON / data: uri.
function buildCompactSvg(): string {
  const goldCellKeys = new Set(goldCellsOf42().map((cell) => `${cell.column},${cell.row}`));
  const blockSize = CELL_SIZE_PX - 2 * BLOCK_INSET_PX;

  // one rectangle for each line of gold blocks next to each other
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
    // width/height so wallets don't show it tiny
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
