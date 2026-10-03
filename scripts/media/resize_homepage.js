const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const inputPath = 'C:/Users/sophi/Desktop/MAXENCE/business/CleanmyMap-main/documentation/liberte-UX-UI/01-HOMEPAGE/homepage-backup.png';
const outputPath = path.resolve('artifacts/screenshots/pages-site/legacy/homepage-sonnet-4-5/desktop.png');

async function resizeImage() {
  try {
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    const image = sharp(inputPath);
    const metadata = await image.metadata();
    
    console.log(`Original: ${metadata.width}x${metadata.height}`);
    
    const maxDimension = 3000;
    const maxSize = Math.max(metadata.width, metadata.height);
    
    if (maxSize <= maxDimension) {
      console.log('Image already small enough');
      return;
    }
    
    const scale = maxDimension / maxSize;
    const newWidth = Math.round(metadata.width * scale);
    const newHeight = Math.round(metadata.height * scale);
    
    console.log(`Resized: ${newWidth}x${newHeight}`);
    
    await image
      .resize(newWidth, newHeight, {
        kernel: sharp.kernel.lanczos3,
        withoutEnlargement: true
      })
      .png()
      .toFile(outputPath);
      
    console.log('✅ Image resized successfully');
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

resizeImage();
