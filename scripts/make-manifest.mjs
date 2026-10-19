// Usage: node scripts/make-manifest.mjs <outDir> <channel> <build> <versionName> <notes>
// Expects <outDir>/app-<build>.apk and <outDir>/game-<build>.zip to exist.
import { createHash } from 'node:crypto';
import { readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const [outDir, channel, build, versionName, notes = ''] = process.argv.slice(2);
const b = Number(build);
const minShellApi = JSON.parse(readFileSync('game/meta.json', 'utf8')).minShellApi;

const asset = (name) => {
  const p = join(outDir, name);
  return { url: name, sha256: createHash('sha256').update(readFileSync(p)).digest('hex'), size: statSync(p).size };
};

const manifest = {
  channel,
  published: new Date().toISOString(),
  app: { versionCode: b, versionName, notes, ...asset(`app-${b}.apk`) },
  game: { version: b, minShellApi, notes, ...asset(`game-${b}.zip`) },
};
writeFileSync(join(outDir, 'manifest.json'), JSON.stringify(manifest, null, 2));
console.log(JSON.stringify(manifest, null, 2));
