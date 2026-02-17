'use strict';
const path = require('path');
const { execSync } = require('child_process');
const root = path.join(__dirname, '..');
execSync('npx ts-node prisma/clear-store-configs.ts', { cwd: root, stdio: 'inherit' });
