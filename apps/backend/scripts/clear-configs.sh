#!/bin/bash
cd "$(dirname "$0")/.."
npx ts-node prisma/clear-store-configs.ts
