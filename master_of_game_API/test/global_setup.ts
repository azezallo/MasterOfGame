import fs from 'fs';
import path from 'path';

async function setup() {
  const savesDir = process.env.SAVES_DIR || 'test_saves_integration';
  const fullPath = path.resolve(process.cwd(), savesDir);

  if (fs.existsSync(fullPath)) {
    console.log(`Cleaning up test saves directory: ${fullPath}`);
    try {
      fs.rmSync(fullPath, { recursive: true, force: true });
      fs.mkdirSync(fullPath, { recursive: true });
      console.log('Test saves directory cleaned successfully.');
    } catch (error) {
      console.error(`Error cleaning test saves directory: ${error}`);
    }
  } else {
    fs.mkdirSync(fullPath, { recursive: true });
    console.log(`Created test saves directory: ${fullPath}`);
  }
}

export default setup;
