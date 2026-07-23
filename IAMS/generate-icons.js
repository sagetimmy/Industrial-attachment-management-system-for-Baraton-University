const fs = require('fs');
const path = require('path');

let sharp;
try {
  sharp = require('sharp');
} catch (e) {
  console.log('⚠️  sharp library not found. Install it with: npm install sharp');
  console.log('\nAlternatively, convert the SVG to PNG using an online tool:');
  console.log('https://cloudconvert.com/svg-to-png or https://www.convertio.co/svg-png/');
  console.log('\nRequired sizes:');
  console.log('- icon.png: 192x192 (app icon)');
  console.log('- splash-icon.png: 512x512 (splash screen)');
  console.log('- adaptive-icon.png: 192x192 (Android adaptive icon)');
  console.log('- favicon.png: 192x192 (web favicon)');
  process.exit(0);
}

const svgPath = path.join(__dirname, 'icon-source.svg');
const assetsDir = path.join(__dirname, 'assets');

if (!fs.existsSync(assetsDir)) {
  fs.mkdirSync(assetsDir, { recursive: true });
}

// Icon configurations
const icons = [
  { name: 'icon.png', size: 192 },
  { name: 'splash-icon.png', size: 512 },
  { name: 'adaptive-icon.png', size: 192 },
  { name: 'favicon.png', size: 192 }
];

async function generateIcons() {
  console.log('🎨 Generating IAMS icons...\n');
  
  try {
    const svgBuffer = fs.readFileSync(svgPath);
    
    for (const icon of icons) {
      const outputPath = path.join(assetsDir, icon.name);
      
      await sharp(svgBuffer, { density: 150 })
        .resize(icon.size, icon.size, {
          fit: 'contain',
          background: { r: 13, g: 122, b: 107, alpha: 1 }
        })
        .png({ quality: 90 })
        .toFile(outputPath);
      
      console.log(`✅ Generated: ${icon.name} (${icon.size}x${icon.size})`);
    }
    
    console.log('\n✨ All icons generated successfully!');
    console.log('\nYour app icon is ready. Restart Expo to see the new icon.');
  } catch (error) {
    console.error('❌ Error generating icons:', error.message);
    process.exit(1);
  }
}

generateIcons();
