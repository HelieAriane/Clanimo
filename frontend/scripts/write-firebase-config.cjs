#!/usr/bin/env node
/**
 * Génère /firebase-config.js à partir des variables d'env VITE_*
 * Usage:
 *   node scripts/write-firebase-config.cjs            -> écrit dans /public
 *   node scripts/write-firebase-config.cjs dist       -> écrit dans /dist
 */
const fs = require('fs');
const path = require('path');

/* Charger .env en local (Netlify/Vercel fourniront les ENV en CI) */
try {
  const dotenv = require('dotenv');
  const candidates = [
    '.env.production.local',
    '.env.production',
    '.env.local',
    '.env'
  ];
  for (const file of candidates) {
    const p = path.join(process.cwd(), file);
    if (fs.existsSync(p)) dotenv.config({ path: p });
  }
} catch (_) {
  /* pas grave si dotenv n'est pas installé en CI */
}

const cfg = {
  apiKey:            process.env.VITE_FIREBASE_API_KEY,
  authDomain:        process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:         process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket:     process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId:             process.env.VITE_FIREBASE_APP_ID,
  measurementId:     process.env.VITE_FIREBASE_MEASUREMENT_ID
};

const missing = Object.entries(cfg).filter(([, v]) => !v);
if (missing.length) {
  console.warn('⚠️ Variables manquantes :', missing.map(([k]) => k).join(', '));
  console.warn('   → Définis-les dans .env (local) ou dans les variables du projet (Netlify/Vercel).');
}

const targetDir = process.argv[2] || 'public';
const outPath   = path.join(process.cwd(), targetDir, 'firebase-config.js');

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, `self.firebaseConfig = ${JSON.stringify(cfg, null, 2)};`, 'utf8');
console.log('✓ Écrit :', outPath);
