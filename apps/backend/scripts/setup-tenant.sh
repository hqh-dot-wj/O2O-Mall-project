#!/bin/bash
cd "$(dirname "$0")/.."
npx ts-node prisma/setup-tenant-courses.ts
