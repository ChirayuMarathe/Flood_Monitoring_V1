const fs = require('fs');
const path = require('path');

const spzDir = path.join(__dirname, '..', 'node_modules', '@spz-loader', 'core', 'dist');

const shimESM = `/**
 * Shim for @spz-loader/core
 * Prevents Next.js / Turbopack octal escape sequence syntax error caused by upstream embedded binary wasm.
 */
export async function loadSpz() {
  throw new Error("@spz-loader/core is disabled in this web bundle.");
}

const spzShim = {
  loadSpz,
};

export default spzShim;
`;

const shimCJS = `/**
 * CommonJS Shim for @spz-loader/core
 */
async function loadSpz() {
  throw new Error("@spz-loader/core is disabled in this web bundle.");
}

module.exports = {
  loadSpz,
  default: { loadSpz },
};
`;

try {
  if (fs.existsSync(spzDir)) {
    fs.writeFileSync(path.join(spzDir, 'index.js'), shimESM, 'utf8');
    fs.writeFileSync(path.join(spzDir, 'index.umd.cjs'), shimCJS, 'utf8');
    console.log('[patch_spz] Successfully patched @spz-loader/core with clean shim.');
  } else {
    console.log('[patch_spz] @spz-loader/core not found, skipping patch.');
  }
} catch (err) {
  console.warn('[patch_spz] Could not patch @spz-loader/core:', err.message);
}
