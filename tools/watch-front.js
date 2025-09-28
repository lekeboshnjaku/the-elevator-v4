/**
 * watch-front.js
 * 
 * Watches project files and auto-runs sync-front.js when changes are detected.
 * - Watches: components, src, assets, styles.css, index.tsx, webpack.config.js
 * - Ignores: stake_engine_upload, dist, node_modules
 * - Debounces changes (500ms)
 * - Prevents concurrent runs
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

// Project root directory
const rootDir = path.resolve(__dirname, '..');

// Paths to watch (relative to project root)
const pathsToWatch = [
  'components',
  'src',
  'assets',
  'styles.css',
  'index.tsx',
  'webpack.config.js'
];

// Paths to ignore
const ignorePaths = [
  'stake_engine_upload',
  'dist',
  'node_modules',
  '.git'
];

// State tracking
let isRunning = false;
let pendingRun = false;
let debounceTimer = null;
const DEBOUNCE_DELAY = 500; // ms

/**
 * Runs the sync-front.js script
 * @returns {Promise<void>}
 */
function runSync() {
  return new Promise((resolve, reject) => {
    console.log('🔄 Running sync-front.js...');
    isRunning = true;
    
    const syncProcess = spawn('node', ['tools/sync-front.js'], {
      stdio: 'inherit',
      shell: true,
      cwd: rootDir
    });
    
    syncProcess.on('close', (code) => {
      isRunning = false;
      
      if (code === 0) {
        console.log('✅ Sync completed successfully');
        resolve();
      } else {
        console.error(`❌ Sync failed with code ${code}`);
        reject(new Error(`Sync failed with code ${code}`));
      }
      
      // If changes occurred during sync, run again
      if (pendingRun) {
        pendingRun = false;
        runSync().catch(err => console.error('Error in queued sync:', err));
      }
    });
    
    syncProcess.on('error', (err) => {
      isRunning = false;
      console.error(`❌ Failed to start sync: ${err.message}`);
      reject(err);
      
      // If changes occurred during sync, run again
      if (pendingRun) {
        pendingRun = false;
        runSync().catch(err => console.error('Error in queued sync:', err));
      }
    });
  });
}

/**
 * Debounced function to handle file changes
 */
function handleChange(filePath) {
  // Clear any existing timer
  if (debounceTimer) {
    clearTimeout(debounceTimer);
  }
  
  // Set a new timer
  debounceTimer = setTimeout(() => {
    console.log(`🔍 Change detected: ${filePath}`);
    
    if (isRunning) {
      console.log('⏳ Sync already running, queueing another run');
      pendingRun = true;
    } else {
      runSync().catch(err => console.error('Error running sync:', err));
    }
  }, DEBOUNCE_DELAY);
}

/**
 * Check if a path should be ignored
 * @param {string} fullPath - Full path to check
 * @returns {boolean} - True if path should be ignored
 */
function shouldIgnore(fullPath) {
  return ignorePaths.some(ignorePath => 
    fullPath.includes(path.sep + ignorePath + path.sep) || 
    fullPath.endsWith(path.sep + ignorePath)
  );
}

/**
 * Set up watchers for all paths
 */
function setupWatchers() {
  // Watch individual files
  const individualFiles = pathsToWatch.filter(p => p.includes('.'));
  individualFiles.forEach(file => {
    const fullPath = path.join(rootDir, file);
    if (fs.existsSync(fullPath)) {
      console.log(`👀 Watching file: ${file}`);
      fs.watch(fullPath, (eventType) => {
        if (eventType === 'change') {
          handleChange(file);
        }
      });
    } else {
      console.warn(`⚠️ File not found: ${file}`);
    }
  });
  
  // Watch directories recursively
  const directories = pathsToWatch.filter(p => !p.includes('.'));
  directories.forEach(dir => {
    const fullPath = path.join(rootDir, dir);
    if (fs.existsSync(fullPath) && fs.statSync(fullPath).isDirectory()) {
      console.log(`👀 Watching directory: ${dir}`);
      watchDirectoryRecursive(fullPath);
    } else {
      console.warn(`⚠️ Directory not found: ${dir}`);
    }
  });
}

/**
 * Watch a directory and its subdirectories recursively
 * @param {string} dir - Directory to watch
 */
function watchDirectoryRecursive(dir) {
  if (shouldIgnore(dir)) {
    return;
  }
  
  // Watch this directory
  fs.watch(dir, (eventType, filename) => {
    if (!filename) return;
    
    const fullPath = path.join(dir, filename);
    if (shouldIgnore(fullPath)) return;
    
    // Handle the change
    if (eventType === 'change' || eventType === 'rename') {
      handleChange(path.relative(rootDir, fullPath));
    }
  });
  
  // Watch subdirectories
  try {
    const files = fs.readdirSync(dir);
    files.forEach(file => {
      const fullPath = path.join(dir, file);
      if (shouldIgnore(fullPath)) return;
      
      try {
        const stats = fs.statSync(fullPath);
        if (stats.isDirectory()) {
          watchDirectoryRecursive(fullPath);
        }
      } catch (err) {
        // File might have been deleted between readdir and stat
        console.error(`Error stating file ${fullPath}: ${err.message}`);
      }
    });
  } catch (err) {
    console.error(`Error reading directory ${dir}: ${err.message}`);
  }
}

// Start watching
console.log('🚀 Starting frontend file watcher...');
console.log('Press Ctrl+C to stop watching');
setupWatchers();
