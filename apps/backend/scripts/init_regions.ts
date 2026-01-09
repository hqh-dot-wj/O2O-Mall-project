
import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function main() {
    console.log('Starting region initialization...');

    // 1. Find pcas-code.json
    // Adjust logic to look for the file relative to this script or project root
    // We are in apps/backend/scripts/init_regions.ts
    // Project root is ../../..
    const possiblePaths = [
        path.resolve(process.cwd(), 'pcas-code.json'), // If run from root
        path.resolve(process.cwd(), '../../pcas-code.json'), // If run from apps/backend (which is usually where we run nest commands)
        path.join(__dirname, '../../../pcas-code.json'), // Relative to this file
    ];

    let jsonPath = '';
    for (const p of possiblePaths) {
        if (fs.existsSync(p)) {
            jsonPath = p;
            break;
        }
    }

    if (!jsonPath) {
        console.error(`Error: pcas-code.json not found in paths: ${possiblePaths.join(', ')}`);
        process.exit(1);
    }

    console.log(`Found JSON file at: ${jsonPath}`);

    // 2. Clear existing data
    console.log('Clearing existing SysRegion data...');
    try {
        await prisma.sysRegion.deleteMany({});
        console.log('Cleared SysRegion table.');
    } catch (e) {
        console.error('Error clearing table:', e);
        process.exit(1);
    }

    // 3. Read and parse data
    const data = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
    console.log('Read JSON data, preparing records...');

    // 4. Flatten data with recursion
    const flattenData: any[] = [];
    const traverse = (node: any, parentCode: string | null = null, level: number = 1) => {
        flattenData.push({
            code: node.code,
            name: node.name,
            parentId: parentCode,
            level: level,
            latitude: node.latitude || node.lat || null,
            longitude: node.longitude || node.lng || null,
        });

        if (node.children && node.children.length > 0) {
            node.children.forEach((child: any) => traverse(child, node.code, level + 1));
        }
    };

    data.forEach((province: any) => traverse(province));

    console.log(`Prepared ${flattenData.length} region records. Inserting in batches...`);

    // 5. Insert in batches
    const BATCH_SIZE = 1000;
    for (let i = 0; i < flattenData.length; i += BATCH_SIZE) {
        const batch = flattenData.slice(i, i + BATCH_SIZE);
        await prisma.sysRegion.createMany({
            data: batch,
            skipDuplicates: true,
        });
        console.log(`Inserted batch ${Math.floor(i / BATCH_SIZE) + 1} / ${Math.ceil(flattenData.length / BATCH_SIZE)}`);
    }

    console.log('Region initialization completed successfully.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
