import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class RegionService implements OnModuleInit {
    private readonly logger = new Logger(RegionService.name);

    constructor(private readonly prisma: PrismaService) { }

    async onModuleInit() {
        // Check if regions exist, if not, seed them
        const count = await this.prisma.sysRegion.count();
        if (count === 0) {
            this.logger.log('No regions found. Starting seeding process...');
            await this.seedRegions();
        }
    }

    async seedRegions() {
        // Assuming pcas-code.json is in the project root or accessible
        // Adjust path as needed, maybe project root
        // Try multiple paths to find pcas-code.json
        const possiblePaths = [
            path.resolve(process.cwd(), 'pcas-code.json'), // Root
            path.resolve(process.cwd(), '../../pcas-code.json'), // From apps/backend
            path.join(__dirname, '../../../../../../pcas-code.json'), // Relative to source file
        ];

        let jsonPath = '';
        for (const p of possiblePaths) {
            if (fs.existsSync(p)) {
                jsonPath = p;
                break;
            }
        }

        if (!jsonPath) {
            this.logger.warn(`Region JSON file not found in [${possiblePaths.join(', ')}]. Skipping seed.`);
            return;
        }

        const data = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
        this.logger.log('Read JSON data, starting recursion...');

        // Recursive insert is too slow if done one by one. 
        // We should flatten the data and use createMany if possible, but createMany is not supported nicely for self-relations in some DBs or limits.
        // However, Prisma createMany is fine for flat tables. sys_region is flat if we just insert rows.

        const flattenData: any[] = [];

        const traverse = (node: any, parentCode: string | null = null, level: number = 1) => {
            flattenData.push({
                code: node.code,
                name: node.name,
                parentId: parentCode,
                level: level,
                // Map coordinates if they exist in the source data
                latitude: node.latitude || node.lat || null,
                longitude: node.longitude || node.lng || null,
            });

            if (node.children && node.children.length > 0) {
                node.children.forEach((child: any) => traverse(child, node.code, level + 1));
            }
        };

        data.forEach((province: any) => traverse(province));

        this.logger.log(`Prepared ${flattenData.length} region records. Inserting in batches...`);

        const BATCH_SIZE = 1000;
        for (let i = 0; i < flattenData.length; i += BATCH_SIZE) {
            const batch = flattenData.slice(i, i + BATCH_SIZE);
            await this.prisma.sysRegion.createMany({
                data: batch,
                skipDuplicates: true,
            });
            // this.logger.log(`Inserted batch ${i / BATCH_SIZE + 1}`);
        }

        this.logger.log('Region seeding completed.');
    }

    async getTree(): Promise<any[]> {
        // Need efficient way to build tree. 
        // For full tree, it's HUGE. Usually we load by level or lazy load.
        // Let's implement lazy load by parentId.
        return [];
    }

    async getChildren(parentId?: string) {
        if (!parentId) {
            // Return provinces
            return this.prisma.sysRegion.findMany({
                where: { level: 1 },
                orderBy: { code: 'asc' },
            });
        }
        return this.prisma.sysRegion.findMany({
            where: { parentId },
            orderBy: { code: 'asc' },
        });
    }

    async getRegionName(code: string) {
        const region = await this.prisma.sysRegion.findUnique({
            where: { code },
            select: { name: true },
        });
        return region?.name || '';
    }
}
