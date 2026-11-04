// Site favicon / touch icon / OG image. Run: node --no-warnings scripts/gen-site-assets.mjs
import { Resvg } from "@resvg/resvg-js";
import { copyFileSync, writeFileSync } from "node:fs";

const FONTS = ["node_modules/@expo-google-fonts/dela-gothic-one/400Regular/DelaGothicOne_400Regular.ttf", "node_modules/@expo-google-fonts/martian-mono/500Medium/MartianMono_500Medium.ttf"];
copyFileSync("assets/images/icon.png", "site/assets/apple-touch-icon.png");
copyFileSync("assets/images/favicon.png", "site/assets/favicon.png");

const og = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs><pattern id="d" width="20" height="20" patternUnits="userSpaceOnUse" patternTransform="rotate(15)"><circle cx="10" cy="10" r="3.4" fill="#2F4FCE" opacity="0.15"/></pattern></defs>
  <rect width="1200" height="630" fill="#F3EEE4"/><rect width="1200" height="630" fill="url(#d)"/>
  <circle cx="1010" cy="170" r="230" fill="#2F4FCE"/><circle cx="1090" cy="110" r="210" fill="#F3EEE4"/><circle cx="1090" cy="110" r="210" fill="url(#d)"/>
  <circle cx="1020" cy="180" r="230" fill="none" stroke="#FF4F9A" stroke-width="5"/>
  <text x="80" y="110" font-family="Martian Mono" font-size="22" fill="#46434B" letter-spacing="2">SLEEPTALK · ISSUE #1</text>
  <g font-family="Dela Gothic One" font-size="84">
    <text x="85" y="250" fill="#FF4F9A">What do you say</text><text x="80" y="246" fill="#1B1A1F">What do you say</text>
    <text x="85" y="350" fill="#FF4F9A">when you're asleep?</text><text x="80" y="346" fill="#1B1A1F">when you're asleep?</text>
  </g>
  <g transform="translate(80 400)">
    <rect width="700" height="120" rx="26" fill="#FF4F9A"/>
    <text x="34" y="74" font-family="Dela Gothic One" font-size="34" fill="#1B1A1F">“No, the penguins are mine.”</text>
    <text x="34" y="104" font-family="Martian Mono" font-size="16" fill="#1B1A1F">— 03:14</text>
  </g>
</svg>`;
writeFileSync("site/assets/og.png", new Resvg(og, { fitTo: { mode: "width", value: 1200 }, font: { fontFiles: FONTS, loadSystemFonts: false } }).render().asPng());
console.log("site assets written");
