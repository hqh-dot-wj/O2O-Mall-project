import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { RegionRepository } from './region.repository';
import { SystemCacheable } from 'src/module/admin/common/decorators/system-cache.decorator';

@Injectable()
export class RegionService implements OnModuleInit {
  private readonly logger = new Logger(RegionService.name);

  constructor(private readonly repo: RegionRepository) {}

  async onModuleInit() {
    // Check if regions exist, if not, seed them
    const count = await this.repo.count();
    if (count === 0) {
      this.logger.log('No regions found. Starting seeding process...');
      await this.seedRegions();
    }
  }

  async seedRegions() {
    // Standardized path: apps/backend/src/assets/json/pcas-code.json
    // In dev (src context): ../../assets/json/pcas-code.json (from region module)
    // In prod (dist context): same relative path usually works if assets are copied, or use absolute path strategy
    const jsonPath = path.resolve(process.cwd(), 'src/assets/json/pcas-code.json');

    if (!fs.existsSync(jsonPath)) {
      this.logger.warn(`Region JSON file not found at [${jsonPath}]. Skipping seed.`);
      return;
    }

    const data = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
    this.logger.log('Read JSON data, starting seeding...');

    const flattenData: any[] = [];
    const traverse = (node: any, parentCode: string | null = null, level: number = 1) => {
      flattenData.push({
        code: node.code,
        name: node.name,
        parentCode: parentCode, // Note: Schema uses 'parentCode' (String), check repository definition
        level: level,
        latitude: node.latitude || node.lat || null,
        longitude: node.longitude || node.lng || null,
      });

      if (node.children && node.children.length > 0) {
        node.children.forEach((child: any) => traverse(child, node.code, level + 1));
      }
    };

    data.forEach((province: any) => traverse(province));

    this.logger.log(`Prepared ${flattenData.length} region records. Inserting in batches...`);

    // Use createMany from BaseRepository (if enabled/supported) or raw Prisma
    // Since RegionRepository extends BaseRepository<SysRegion>, and base has createMany
    const BATCH_SIZE = 1000;
    for (let i = 0; i < flattenData.length; i += BATCH_SIZE) {
      const batch = flattenData.slice(i, i + BATCH_SIZE);
      // Note: skipDuplicates is important
      await this.repo.createMany(batch);
    }

    this.logger.log('Region seeding completed.');
  }

  /**
   * 获取所有区域树 (带缓存)
   * 缓存 24 小时 (static data)
   */
  @SystemCacheable({ key: 'sys:region:tree', ttl: 86400 })
  async getTree() {
    // Build tree
    const regions = await this.repo.findAllRegions();
    return this.buildTree(regions);
  }

  async getChildren(parentCode?: string) {
    if (!parentCode) {
      return this.repo.findRoots();
    }
    return this.repo.findChildren(parentCode);
  }

  async getRegionName(code: string) {
    const region = await this.repo.findById(code, { select: { name: true } });
    return region?.name || '';
  }

  private buildTree(regions: any[]) {
    const map = new Map<string, any>();
    const roots: any[] = [];

    regions.forEach((item) => {
      map.set(item.code, { ...item, children: [] });
    });

    regions.forEach((item) => {
      const node = map.get(item.code);
      if (item.parentCode && map.has(item.parentCode)) {
        map.get(item.parentCode).children.push(node);
      } else {
        roots.push(node);
      }
    });

    return roots;
  }
}
