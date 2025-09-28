/**
 * deploy-frontend.js
 * 
 * Copies the contents of ./dist into ./stake_engine_upload/frontend
 * after backing up the current frontend to ./backups/frontend_<timestamp>
 */

const fs = require('node:fs/promises');
const path = require('node:path');

// Get current timestamp formatted as YYYYMMDD_HHmmss
function getTimestamp() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  
  return `${year}${month}${day}_${hours}${minutes}${seconds}`;
}

// Recursively copy a directory
async function copyDir(src, dest) {
  await fs.mkdir(dest, { recursive: true });
  const entries = await fs.readdir(src, { withFileTypes: true });
  
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    
    if (entry.isDirectory()) {
      await copyDir(srcPath, destPath);
    } else {
      await fs.copyFile(srcPath, destPath);
    }
  }
}

// Recursively remove a directory's contents
async function emptyDir(dir) {
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const entryPath = path.join(dir, entry.name);
      
      if (entry.isDirectory()) {
        await fs.rm(entryPath, { recursive: true, force: true });
      } else {
        await fs.unlink(entryPath);
      }
    }
  } catch (err) {
    // Directory might not exist yet
    if (err.code !== 'ENOENT') throw err;
  }
}

async function main() {
  try {
    // Resolve paths relative to project root
    const projectRoot = path.resolve(__dirname, '..');
    const distDir = path.join(projectRoot, 'dist');
    const frontendDir = path.join(projectRoot, 'stake_engine_upload', 'frontend');
    const backupsDir = path.join(projectRoot, 'backups');
    
    // Create timestamp for backup folder
    const timestamp = getTimestamp();
    const backupDir = path.join(backupsDir, `frontend_${timestamp}`);
    
    console.log('Starting frontend deployment...');
    
    // Create backups directory if it doesn't exist
    await fs.mkdir(backupsDir, { recursive: true });
    console.log(`Created backups directory: ${backupsDir}`);
    
    // Check if frontend directory exists
    try {
      await fs.access(frontendDir);
      
      // Backup current frontend
      console.log(`Backing up current frontend to: ${backupDir}`);
      await copyDir(frontendDir, backupDir);
      console.log('Backup completed.');
      
      // Empty the frontend directory
      console.log('Cleaning frontend directory...');
      await emptyDir(frontendDir);
    } catch (err) {
      // Frontend directory doesn't exist yet
      if (err.code === 'ENOENT') {
        console.log('Frontend directory does not exist yet, creating it...');
        await fs.mkdir(frontendDir, { recursive: true });
      } else {
        throw err;
      }
    }
    
    // Copy dist to frontend
    console.log(`Copying dist to frontend...`);
    await copyDir(distDir, frontendDir);
    
    console.log('\nDeployment completed successfully!');
    console.log(`- Source: ${distDir}`);
    console.log(`- Target: ${frontendDir}`);
    console.log(`- Backup: ${backupDir}`);
    
  } catch (error) {
    console.error('Deployment failed:', error);
    process.exit(1);
  }
}

// Run the script
main();
