#!/usr/bin/env node
// scripts/generate-icons.js - Generate extension icons from SVG
// Run with: node scripts/generate-icons.js

const fs = require('fs');
const path = require('path');

const sizes = [16, 32, 48, 128];
const svgPath = path.join(__dirname, '../assets/icons/icon.svg');
const outputDir = path.join(__dirname, '../assets/icons');

console.log('Icon generation script');
console.log('========================');
console.log('');
console.log('This script requires a tool like sharp or imagemagick to convert SVG to PNG.');
console.log('');
console.log('Quick options:');
console.log('1. Use online converter: https://svgtopng.com/');
console.log('2. Use ImageMagick: convert icon.svg -resize 128x128 icon128.png');
console.log('3. Use sharp (npm): npx sharp -i icon.svg -o icon.png --resize 128');
console.log('');
console.log('Required sizes:', sizes.join(', '));
console.log('');

if (fs.existsSync(svgPath)) {
  console.log('✓ Source SVG found at:', svgPath);
} else {
  console.log('✗ Source SVG not found at:', svgPath);
}