// Renders app icon, splash and favicon. Run: npm run gen:assets
// The mark: a blue crescent moon, a pink speech bubble printed slightly off-register, "z".
import { Resvg } from "@resvg/resvg-js";
import { mkdirSync, writeFileSync } from "node:fs";

const PAPER = "#F3EEE4";
const BLUE = "#2F4FCE";
const PINK = "#FF4F9A";
const INK = "#1B1A1F";

const dots = `<defs><pattern id="d" width="26" height="26" patternUnits="userSpaceOnUse" patternTransform="rotate(15)"><circle cx="13" cy="13" r="5" fill="${BLUE}" opacity="0.13"/></pattern></defs>`;
const mark = (bg) => `
  <circle cx="420" cy="540" r="260" fill="${BLUE}"/>
  <circle cx="560" cy="430" r="230" fill="${PAPER}"/>${bg ? `<circle cx="560" cy="430" r="230" fill="url(#d)"/>` : ""}
  <g transform="translate(470 250)">
    <path d="M40 0 h300 a40 40 0 0 1 40 40 v170 a40 40 0 0 1 -40 40 h-150 l-90 90 v-90 h-60 a40 40 0 0 1 -40 -40 v-170 a40 40 0 0 1 40 -40 z" fill="${PINK}"/>
    <path d="M52 12 h300 a40 40 0 0 1 40 40 v170 a40 40 0 0 1 -40 40 h-150 l-90 90 v-90 h-60 a40 40 0 0 1 -40 -40 v-170 a40 40 0 0 1 40 -40 z" fill="none" stroke="${BLUE}" stroke-width="6" opacity="0.55"/>
    <path d="M130 70 h130 l-130 120 h130" stroke="${INK}" stroke-width="34" fill="none" stroke-linejoin="round" stroke-linecap="round"/>
  </g>`;

const icon = (bg) => `<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="1000" viewBox="0 0 1000 1000">
  ${bg ? `${dots}<rect width="1000" height="1000" fill="${PAPER}"/><rect width="1000" height="1000" fill="url(#d)"/>` : ""}
  <g transform="translate(-30 -10)">${mark(bg)}</g>
</svg>`;

const out = (p, svg, width) => {
  writeFileSync(p, new Resvg(svg, { fitTo: { mode: "width", value: width } }).render().asPng());
  console.log("wrote", p);
};
mkdirSync("assets/images", { recursive: true });
out("assets/images/icon.png", icon(true), 1024);
out("assets/images/adaptive-icon.png", icon(false), 1024);
out("assets/images/splash.png", icon(false), 600);
out("assets/images/favicon.png", icon(true), 96);
