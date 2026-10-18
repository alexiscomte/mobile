#!/usr/bin/env node

// Backport React Native #57246 until the Expo SDK includes the upstream fix.
// See patches/README.md for provenance and the removal procedure.
const { spawnSync } = require('node:child_process');
const { readFileSync } = require('node:fs');
const path = require('node:path');

const root = path.dirname(require.resolve('../package.json'));
const version = JSON.parse(readFileSync(path.join(root, 'node_modules/react-native/package.json'), 'utf8')).version;
const patch = path.join(root, 'patches/react-native-0.86.3-dynamic-type.patch');

if (version !== '0.86.3') {
  throw new Error(`Dynamic Type patch targets React Native 0.86.3, found ${version}. Review patches/README.md before upgrading.`);
}

function apply(...args) {
  const result = spawnSync('git', ['apply', '--whitespace=nowarn', ...args, patch], {
    cwd: root,
    encoding: 'utf8',
  });
  if (result.error) throw result.error;
  return result;
}

if (apply('--reverse', '--check').status === 0) {
  console.log('React Native Dynamic Type patch already applied.');
} else {
  const check = apply('--check');
  if (check.status !== 0) {
    throw new Error(`Cannot apply the React Native Dynamic Type patch safely:\n${check.stderr}`);
  }
  const result = apply();
  if (result.status !== 0 || apply('--reverse', '--check').status !== 0) {
    throw new Error(`React Native Dynamic Type patch verification failed:\n${result.stderr}`);
  }
  console.log('Applied React Native Dynamic Type patch (#57246).');
}
