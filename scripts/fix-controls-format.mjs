#!/usr/bin/env node
/**
 * Converts all game controls in templates/index.json from old format to new format.
 *
 * Old: {key, action} or various broken formats
 * New: {type, description, keys?}
 */

import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const INDEX_PATH = join(__dirname, '..', 'templates', 'index.json');

const data = JSON.parse(readFileSync(INDEX_PATH, 'utf-8'));

let convertedCount = 0;
let alreadyCorrectCount = 0;
const changes = [];

/**
 * Map a key string to {type, keys?} for the new format.
 */
function mapKeyToTypeAndKeys(key) {
  const k = key.trim();
  const kLower = k.toLowerCase();

  // Mouse/click variants
  if (['click', 'mouse', 'mouse click/hold', 'click + hold', 'release', 'click+drag'].includes(kLower)) {
    return { type: 'mouse' };
  }

  // Mobile touch variants
  if (kLower === 'tap') return { type: 'tap' };
  if (kLower === 'swipe') return { type: 'swipe' };
  if (kLower === 'drag') return { type: 'drag' };

  // Arrow Keys / WASD combos
  if (/arrow\s*keys?\s*\/\s*wasd/i.test(k) || /wasd\s*\/\s*arrow\s*keys?/i.test(k)) {
    return { type: 'keyboard', keys: ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'W', 'A', 'S', 'D'] };
  }

  // up/down or W/S variants
  if (/^(↑\/↓|up\/down)\s*(or|\/)\s*w\/s$/i.test(k) || /^up\/down\s+or\s+w\/s$/i.test(k)) {
    return { type: 'keyboard', keys: ['ArrowUp', 'ArrowDown', 'W', 'S'] };
  }

  // ←/→ or A/D
  if (/^(←\/→|left\/right)\s*(or|\/)\s*a\/d$/i.test(k)) {
    return { type: 'keyboard', keys: ['ArrowLeft', 'ArrowRight', 'A', 'D'] };
  }

  // Arrow Keys only (no WASD)
  if (/^arrow\s*keys?$/i.test(k) || k === 'arrows' || k === '↑↓←→') {
    return { type: 'keyboard', keys: ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'] };
  }

  // Left/Right arrow variants
  if (/^(arrowleft\s*\/\s*arrowright|left\/right\s*arrows?|←\/→)$/i.test(k)) {
    return { type: 'keyboard', keys: ['ArrowLeft', 'ArrowRight'] };
  }

  // Up/Down arrow variants
  if (/^(up\/down\s*arrow|↑\/↓)$/i.test(k)) {
    return { type: 'keyboard', keys: ['ArrowUp', 'ArrowDown'] };
  }

  // Single arrow keys
  if (k === 'ArrowLeft') return { type: 'keyboard', keys: ['ArrowLeft'] };
  if (k === 'ArrowRight') return { type: 'keyboard', keys: ['ArrowRight'] };
  if (k === 'ArrowUp') return { type: 'keyboard', keys: ['ArrowUp'] };
  if (k === 'ArrowDown') return { type: 'keyboard', keys: ['ArrowDown'] };

  // Space / Enter combos
  if (/^(space\s*\/\s*enter|enter\s*\/\s*space|space\/enter|enter\/space|spacebar\/enter)$/i.test(k)) {
    return { type: 'keyboard', keys: ['Space', 'Enter'] };
  }

  // Space only
  if (/^(space|spacebar)$/i.test(k)) {
    return { type: 'keyboard', keys: ['Space'] };
  }

  // 1-4
  if (k === '1-4') {
    return { type: 'keyboard', keys: ['1', '2', '3', '4'] };
  }

  // Enter/Right Arrow
  if (/^enter\s*\/\s*right\s*arrow$/i.test(k)) {
    return { type: 'keyboard', keys: ['Enter', 'ArrowRight'] };
  }

  // Up arrow / spacebar
  if (/^up\s*arrow\s*\/\s*spacebar$/i.test(k)) {
    return { type: 'keyboard', keys: ['ArrowUp', 'Space'] };
  }

  // left/right arrows
  if (/^left\/right\s*arrows?$/i.test(k)) {
    return { type: 'keyboard', keys: ['ArrowLeft', 'ArrowRight'] };
  }

  // Generic: if it looks like a key name, wrap it
  return { type: 'keyboard', keys: [k] };
}

/**
 * Check if a control entry is already in the new format
 */
function isNewFormat(ctrl) {
  if (typeof ctrl !== 'object' || ctrl === null) return false;
  // Must have type and description, must NOT have key or action (unless type is already set properly)
  return ctrl.type && ctrl.description && !ctrl.key && !ctrl.action && !ctrl.input;
}

/**
 * Convert a single control entry to new format
 */
function convertControl(ctrl, gameName) {
  // Already correct
  if (isNewFormat(ctrl)) return ctrl;

  // String format → mouse description
  if (typeof ctrl === 'string') {
    return { type: 'mouse', description: ctrl };
  }

  // Old format: {key, action}
  if (ctrl.key && ctrl.action) {
    const mapped = mapKeyToTypeAndKeys(ctrl.key);
    const result = { type: mapped.type, description: ctrl.action };
    if (mapped.keys) result.keys = mapped.keys;
    return result;
  }

  // {input, action} format (jetpack-quiz)
  if (ctrl.input && ctrl.action) {
    // input is button description, action is what it does
    return { type: 'tap', description: `${ctrl.input}: ${ctrl.action}` };
  }

  // {type, action} - type present but uses action instead of description
  if (ctrl.type && ctrl.action && !ctrl.description) {
    const result = { type: ctrl.type, description: ctrl.action };
    if (ctrl.keys) result.keys = ctrl.keys;
    return result;
  }

  // {type, action, description} - has extra action field (soccer-kicker)
  if (ctrl.type && ctrl.action && ctrl.description) {
    const result = { type: ctrl.type, description: ctrl.description };
    if (ctrl.keys) result.keys = ctrl.keys;
    if (ctrl.label) result.label = ctrl.label;
    return result;
  }

  // {action, description} - action is the type (various mobile games)
  if (ctrl.action && ctrl.description && !ctrl.type && !ctrl.key) {
    const actionLower = ctrl.action.toLowerCase();
    let type;
    if (actionLower === 'tap' || actionLower.startsWith('tap')) type = 'tap';
    else if (actionLower === 'drag' || actionLower.startsWith('drag')) type = 'drag';
    else if (actionLower === 'swipe' || actionLower.startsWith('swipe')) type = 'swipe';
    else type = 'tap';

    // If the action contains more than just the type word, use it as description
    if (actionLower !== type && !['tap', 'drag', 'swipe'].includes(actionLower)) {
      return { type, description: `${ctrl.action}: ${ctrl.description}` };
    }
    return { type, description: ctrl.description };
  }

  // {action: "Swipe up-left", description: "..."} (basketball-true-false)
  if (ctrl.action && ctrl.description) {
    const actionLower = ctrl.action.toLowerCase();
    let type = 'tap';
    if (actionLower.includes('swipe')) type = 'swipe';
    else if (actionLower.includes('drag')) type = 'drag';
    return { type, description: `${ctrl.action} - ${ctrl.description}` };
  }

  // Fallback - just return as-is with a warning
  console.warn(`  WARNING: Could not convert control for ${gameName}:`, JSON.stringify(ctrl));
  return ctrl;
}

/**
 * Check if a web game has an R restart key
 */
function hasRestartKey(controls) {
  if (!Array.isArray(controls)) return false;
  return controls.some(c =>
    c.type === 'keyboard' &&
    Array.isArray(c.keys) &&
    c.keys.some(k => k === 'R' || k === 'KeyR')
  );
}

// Process each template
for (const template of data.templates) {
  const { name, controls, platform } = template;
  const isWeb = platform === 'web';

  // Handle empty controls for the 2 known games
  if (controls && typeof controls === 'object' && !Array.isArray(controls) && Object.keys(controls).length === 0) {
    // Empty controls {}
    if (name === 'Slingshot True/False') {
      template.controls = [
        { type: 'mouse', description: 'Click and drag ball to aim slingshot' },
        { type: 'mouse', description: 'Release to launch ball at target' },
        { type: 'keyboard', description: 'Restart game', keys: ['R'] }
      ];
      changes.push(`${name}: filled empty controls (slingshot drag+release+R)`);
      convertedCount++;
      continue;
    }
    if (name === 'Pokemon Battle Arena') {
      template.controls = [
        { type: 'mouse', description: 'Click answer button to attack' },
        { type: 'keyboard', description: 'Restart game', keys: ['R'] }
      ];
      changes.push(`${name}: filled empty controls (click+R)`);
      convertedCount++;
      continue;
    }
  }

  // Handle rose-ceremony-quiz object controls
  if (name === 'rose-ceremony-quiz' && controls && !Array.isArray(controls) && typeof controls === 'object') {
    template.controls = [
      { type: 'mouse', description: 'Click on contestant to give them the rose' },
      { type: 'mouse', description: 'Hover over contestant to highlight' },
      { type: 'keyboard', description: 'Restart game', keys: ['R'] }
    ];
    changes.push(`${name}: converted object format to array`);
    convertedCount++;
    continue;
  }

  // Handle word-find-true-false string array controls
  if (name === 'word-find-true-false' && Array.isArray(controls) && typeof controls[0] === 'string') {
    template.controls = [
      { type: 'drag', description: 'Drag across letters in the grid to select them' },
      { type: 'drag', description: 'Select letters in a straight line (horizontal, vertical, or diagonal)' },
      { type: 'drag', description: 'Find and select TRUE or FALSE to submit your answer' }
    ];
    changes.push(`${name}: converted string array to proper controls`);
    convertedCount++;
    continue;
  }

  // Skip if not an array at this point
  if (!Array.isArray(controls)) {
    console.warn(`Skipping ${name}: controls is not an array:`, typeof controls);
    continue;
  }

  // Check if any control needs conversion
  const needsConversion = controls.some(c => !isNewFormat(c));
  if (!needsConversion) {
    // Check if web game needs R key added
    if (isWeb && !hasRestartKey(controls)) {
      template.controls.push({ type: 'keyboard', description: 'Restart game', keys: ['R'] });
      changes.push(`${name}: added missing R restart key`);
      convertedCount++;
    } else {
      alreadyCorrectCount++;
    }
    continue;
  }

  // Convert each control
  const newControls = controls.map(c => convertControl(c, name));
  template.controls = newControls;

  // Add R restart for web games if missing
  if (isWeb && !hasRestartKey(newControls)) {
    template.controls.push({ type: 'keyboard', description: 'Restart game', keys: ['R'] });
  }

  changes.push(`${name}: converted ${controls.length} control(s)`);
  convertedCount++;
}

// Write back
writeFileSync(INDEX_PATH, JSON.stringify(data, null, 2) + '\n');

console.log(`\n=== Controls Format Fix Results ===`);
console.log(`Already correct: ${alreadyCorrectCount}`);
console.log(`Converted: ${convertedCount}`);
console.log(`\nChanges:`);
changes.forEach(c => console.log(`  - ${c}`));
console.log(`\nWrote updated index.json`);
