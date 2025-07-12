const { writeFileSync, mkdirSync } = require('fs');
const { resolve } = require('path');

// Create icons directory if it doesn't exist
const iconsDir = resolve(__dirname, '../icons');
mkdirSync(iconsDir, { recursive: true });

// Simple SVG icon for save functionality
const generateSVG = (size: number) => `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" version="1.1" xmlns="http://www.w3.org/2000/svg">
    <circle cx="${size/2}" cy="${size/2}" r="${size/2-2}" fill="#4285f4"/>
    <path d="M${size*0.3} ${size*0.3}L${size*0.7} ${size*0.3}L${size*0.7} ${size*0.7}L${size*0.3} ${size*0.7}Z" fill="white"/>
</svg>`;

// Generate icons of different sizes
[16, 48, 128].forEach(size => {
  const svgContent = generateSVG(size);
  writeFileSync(
    resolve(iconsDir, `icon${size}.svg`),
    svgContent
  );
  // Also save as PNG for manifest
  writeFileSync(
    resolve(iconsDir, `icon${size}.png`),
    svgContent
  );
});

console.log('Icons generated successfully!'); 