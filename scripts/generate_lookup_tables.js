#!/usr/bin/env node

/**
 * generate_lookup_tables.js
 * 
 * Generates lookup tables for The Elevator game with specific weight distributions.
 * - Base mode: conservative distribution (most weight ≤ 20x)
 * - Elevate mode: heavy tail distribution biased toward high multipliers
 * 
 * Requirements:
 * - 100,000 rows per file (m=1..100000)
 * - Sum of weights exactly 100,000,000 per file
 * - Third column always 0
 * - Backup existing files before overwriting
 */

const fs = require('fs');
const path = require('path');

// Paths
const PROJECT_ROOT = path.resolve(__dirname, '..');
const MATH_DIR = path.join(PROJECT_ROOT, 'math');
const UPLOAD_MATH_DIR = path.join(PROJECT_ROOT, 'stake_engine_upload', 'math');
const BASE_CSV = 'lookup_table_base.csv';
const ELEVATE_CSV = 'lookup_table_elevate.csv';

// Constants
const MAX_MULTIPLIER = 100000;
const TOTAL_WEIGHT = 100000000; // Exact normalization target

/**
 * Create backup directory with timestamp
 */
function createBackupDir(baseDir) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupDir = path.join(baseDir, `backup_${timestamp}`);
  
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }
  
  return backupDir;
}

/**
 * Backup existing CSV files
 */
function backupExistingFiles() {
  const mathBackupDir = createBackupDir(MATH_DIR);
  const uploadBackupDir = createBackupDir(UPLOAD_MATH_DIR);
  
  // Backup math dir files
  if (fs.existsSync(path.join(MATH_DIR, BASE_CSV))) {
    fs.copyFileSync(
      path.join(MATH_DIR, BASE_CSV),
      path.join(mathBackupDir, BASE_CSV)
    );
    console.log(`Backed up ${MATH_DIR}/${BASE_CSV} to ${mathBackupDir}`);
  }
  
  if (fs.existsSync(path.join(MATH_DIR, ELEVATE_CSV))) {
    fs.copyFileSync(
      path.join(MATH_DIR, ELEVATE_CSV),
      path.join(mathBackupDir, ELEVATE_CSV)
    );
    console.log(`Backed up ${MATH_DIR}/${ELEVATE_CSV} to ${mathBackupDir}`);
  }
  
  // Backup upload dir files
  if (fs.existsSync(path.join(UPLOAD_MATH_DIR, BASE_CSV))) {
    fs.copyFileSync(
      path.join(UPLOAD_MATH_DIR, BASE_CSV),
      path.join(uploadBackupDir, BASE_CSV)
    );
    console.log(`Backed up ${UPLOAD_MATH_DIR}/${BASE_CSV} to ${uploadBackupDir}`);
  }
  
  if (fs.existsSync(path.join(UPLOAD_MATH_DIR, ELEVATE_CSV))) {
    fs.copyFileSync(
      path.join(UPLOAD_MATH_DIR, ELEVATE_CSV),
      path.join(uploadBackupDir, ELEVATE_CSV)
    );
    console.log(`Backed up ${UPLOAD_MATH_DIR}/${ELEVATE_CSV} to ${uploadBackupDir}`);
  }
}

/**
 * Generate base mode weights using piecewise power-law
 * - Segment 1 (1..20): exponent a1=1.7
 * - Segment 2 (21..100000): exponent a2=3.5, scaled for continuity at 20
 */
function generateBaseWeights() {
  const weights = new Array(MAX_MULTIPLIER);
  const a1 = 1.7;  // Exponent for segment 1
  const a2 = 3.5;  // Exponent for segment 2
  const boundary = 20;
  
  // Calculate raw weights
  let sumWeights = 0;
  
  // First segment (1..20)
  for (let m = 1; m <= boundary; m++) {
    weights[m-1] = Math.pow(m, -a1);
    sumWeights += weights[m-1];
  }
  
  // Calculate scaling factor for second segment to ensure continuity
  const scaleFactor = Math.pow(boundary, -a1) / Math.pow(boundary, -a2);
  
  // Second segment (21..100000)
  for (let m = boundary + 1; m <= MAX_MULTIPLIER; m++) {
    weights[m-1] = scaleFactor * Math.pow(m, -a2);
    sumWeights += weights[m-1];
  }
  
  return normalizeWeights(weights, sumWeights);
}

/**
 * Generate elevate mode weights using 3-segment piecewise power-law
 * - Segment 1 (1..50): exponent 1.3
 * - Segment 2 (51..1000): exponent 1.1 (continuous at 50)
 * - Segment 3 (1001..100000): exponent 1.03 (continuous at 1000)
 */
function generateElevateWeights() {
  const weights = new Array(MAX_MULTIPLIER);
  const a1 = 1.3;   // Exponent for segment 1
  const a2 = 1.1;   // Exponent for segment 2
  const a3 = 1.03;  // Exponent for segment 3
  const boundary1 = 50;
  const boundary2 = 1000;
  
  // Calculate raw weights
  let sumWeights = 0;
  
  // First segment (1..50)
  for (let m = 1; m <= boundary1; m++) {
    weights[m-1] = Math.pow(m, -a1);
    sumWeights += weights[m-1];
  }
  
  // Calculate scaling factor for second segment
  const scaleFactor1 = Math.pow(boundary1, -a1) / Math.pow(boundary1, -a2);
  
  // Second segment (51..1000)
  for (let m = boundary1 + 1; m <= boundary2; m++) {
    weights[m-1] = scaleFactor1 * Math.pow(m, -a2);
    sumWeights += weights[m-1];
  }
  
  // Calculate scaling factor for third segment
  const scaleFactor2 = scaleFactor1 * Math.pow(boundary2, -a2) / Math.pow(boundary2, -a3);
  
  // Third segment (1001..100000)
  for (let m = boundary2 + 1; m <= MAX_MULTIPLIER; m++) {
    weights[m-1] = scaleFactor2 * Math.pow(m, -a3);
    sumWeights += weights[m-1];
  }
  
  return normalizeWeights(weights, sumWeights);
}

/**
 * Normalize weights to sum exactly to TOTAL_WEIGHT using largest-remainder method
 */
function normalizeWeights(weights, sumWeights) {
  const normalizedWeights = new Array(weights.length);
  let allocatedTotal = 0;
  const remainders = new Array(weights.length);
  
  // Initial scaling and integer allocation
  for (let i = 0; i < weights.length; i++) {
    const scaledWeight = weights[i] * TOTAL_WEIGHT / sumWeights;
    const integerPart = Math.floor(scaledWeight);
    normalizedWeights[i] = integerPart;
    allocatedTotal += integerPart;
    remainders[i] = {
      index: i,
      remainder: scaledWeight - integerPart
    };
  }
  
  // Sort remainders in descending order
  remainders.sort((a, b) => b.remainder - a.remainder);
  
  // Distribute remaining weight using largest-remainder method
  let remaining = TOTAL_WEIGHT - allocatedTotal;
  for (let i = 0; i < remaining; i++) {
    normalizedWeights[remainders[i].index]++;
  }
  
  // Verify total is exactly TOTAL_WEIGHT
  const finalSum = normalizedWeights.reduce((sum, w) => sum + w, 0);
  if (finalSum !== TOTAL_WEIGHT) {
    throw new Error(`Normalization failed: sum ${finalSum} !== ${TOTAL_WEIGHT}`);
  }
  
  return normalizedWeights;
}

/**
 * Generate CSV content from weights
 */
function generateCSV(weights) {
  return weights.map((weight, index) => {
    const multiplier = index + 1;
    return `${multiplier},${weight},0`;
  }).join('\n');
}

/**
 * Write CSV file to both math directories
 */
function writeCSVFile(filename, content) {
  // Ensure directories exist
  if (!fs.existsSync(MATH_DIR)) {
    fs.mkdirSync(MATH_DIR, { recursive: true });
  }
  if (!fs.existsSync(UPLOAD_MATH_DIR)) {
    fs.mkdirSync(UPLOAD_MATH_DIR, { recursive: true });
  }
  
  // Write to math directory
  fs.writeFileSync(path.join(MATH_DIR, filename), content);
  console.log(`Generated ${MATH_DIR}/${filename}`);
  
  // Copy to upload directory
  fs.writeFileSync(path.join(UPLOAD_MATH_DIR, filename), content);
  console.log(`Generated ${UPLOAD_MATH_DIR}/${filename}`);
}

/**
 * Main execution
 */
function main() {
  console.log('Generating lookup tables for The Elevator...');
  
  try {
    // Backup existing files
    backupExistingFiles();
    
    // Generate base weights
    console.log('Generating base weights (conservative distribution)...');
    const baseWeights = generateBaseWeights();
    const baseCSV = generateCSV(baseWeights);
    writeCSVFile(BASE_CSV, baseCSV);
    
    // Generate elevate weights
    console.log('Generating elevate weights (heavy tail distribution)...');
    const elevateWeights = generateElevateWeights();
    const elevateCSV = generateCSV(elevateWeights);
    writeCSVFile(ELEVATE_CSV, elevateCSV);
    
    console.log('Successfully generated lookup tables!');
    console.log(`Base weights sum: ${baseWeights.reduce((sum, w) => sum + w, 0)}`);
    console.log(`Elevate weights sum: ${elevateWeights.reduce((sum, w) => sum + w, 0)}`);
    
    // Print some statistics
    const baseNonZero = baseWeights.filter(w => w > 0).length;
    const elevateNonZero = elevateWeights.filter(w => w > 0).length;
    console.log(`Base non-zero entries: ${baseNonZero}`);
    console.log(`Elevate non-zero entries: ${elevateNonZero}`);
    
    // Print some tail probabilities
    const tailProbabilities = [10, 100, 1000, 10000, 100000];
    console.log('\nTail probabilities P[M ≥ T]:');
    console.log('T\tBase\tElevate');
    for (const t of tailProbabilities) {
      const baseTail = baseWeights.slice(t-1).reduce((sum, w) => sum + w, 0) / TOTAL_WEIGHT;
      const elevateTail = elevateWeights.slice(t-1).reduce((sum, w) => sum + w, 0) / TOTAL_WEIGHT;
      console.log(`${t}\t${baseTail.toExponential(4)}\t${elevateTail.toExponential(4)}`);
    }
    
  } catch (error) {
    console.error('Error generating lookup tables:', error);
    process.exit(1);
  }
}

// Execute main function
main();
