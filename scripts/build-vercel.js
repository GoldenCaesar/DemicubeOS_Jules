const fs = require('fs');
const path = require('path');

const distDir = path.join(__dirname, '../dist');
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

const itemsToCopy = ['index.html', 'src', 'content', 'music', 'metadata.json'];

itemsToCopy.forEach((item) => {
  const srcPath = path.join(__dirname, '..', item);
  const destPath = path.join(distDir, item);
  if (fs.existsSync(srcPath)) {
    fs.cpSync(srcPath, destPath, { recursive: true });
    console.log(`Copied ${item} to dist/`);
  } else {
    console.warn(`Warning: ${item} not found in root.`);
  }
});

console.log('Vercel build complete: dist/ created successfully.');
