/**
 * sync-front.js
 * 
 * Runs build and deploy:front sequentially to sync changes to the served frontend.
 * - First runs webpack build
 * - Then copies the built files to stake_engine_upload/frontend
 */

const { spawn } = require('child_process');
const path = require('path');

/**
 * Runs a command using spawn with inherited stdio
 * @param {string} command - The command to run
 * @param {string[]} args - Command arguments
 * @returns {Promise<void>} - Resolves on success, rejects with exit code on failure
 */
function runCommand(command, args) {
  return new Promise((resolve, reject) => {
    console.log(`Running: ${command} ${args.join(' ')}`);
    
    const process = spawn(command, args, {
      stdio: 'inherit', // Show output in console
      shell: true,      // Use shell for npm commands
      cwd: path.resolve(__dirname, '..')  // Run from project root
    });

    process.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Command failed with exit code ${code}`));
      }
    });
    
    process.on('error', (err) => {
      reject(new Error(`Failed to start command: ${err.message}`));
    });
  });
}

/**
 * Main function to run build and deploy sequentially
 */
async function main() {
  console.log('🔄 Starting frontend sync process...');
  
  try {
    // Step 1: Build the project
    console.log('📦 Building frontend...');
    await runCommand('npm', ['run', 'build']);
    
    // Step 2: Deploy to served frontend
    console.log('🚀 Deploying to served frontend...');
    await runCommand('npm', ['run', 'deploy:front']);
    
    console.log('✅ Frontend sync completed successfully!');
  } catch (error) {
    console.error(`❌ Sync failed: ${error.message}`);
    process.exit(1); // Exit with error code
  }
}

// Run the main function
main();
