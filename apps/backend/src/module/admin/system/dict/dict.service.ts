import { Injectable } from '@nestjs/common';
import { Response } from 'express';
import { Prisma, Status } from '@prisma/client';
import { Result, ResponseCode } from 'src/common/response';
import { BusinessException } from 'src/common/exceptions';
import { CacheEnum, DelFlagEnum } from 'src/common/enum/index';
import { Cacheable } from 'src/common/decorators/redis.decorator';
import { ExportTable } from 'src/common/utils/export';
import { FormatDateFields } from 'src/common/utils/index';
import {
  CreateDictTypeDto,
  UpdateDictTypeDto,
  ListDictType,
  CreateDictDataDto,
  UpdateDictDataDto,
  ListDictData,
  ImportDictDto,
  ImportDictResultDto,
  SortDictDataDto,
  DictStatsDto,
  DictStatsSummaryDto,
} from './dto/index';
import { RedisService } from 'src/module/common/redis/redis.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { DictTypeRepository, DictDataRepository } from './dict.repository';

@Injectable()
export class DictService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService,
    private readonly dictTypeRepo: DictTypeRepository,
    private readonly dictDataRepo: DictDataRepository,
  ) {}
  async createType(CreateDictTypeDto: CreateDictTypeDto) {
    // T-1: 校验字典类型唯一性
    const exists = await this.dictTypeRepo.existsByDictType(CreateDictTypeDto.dictType);
    BusinessException.throwIf(exists, '字典类型已存在');

    await this.dictTypeRepo.create(CreateDictTypeDto);
    return Result.ok();
  }

  async deleteType(dictIds: number[]) {
    // T-5: 删除前检查是否有字典数据关联
    for (const dictId of dictIds) {
      const dictType = await this.dictTypeRepo.findById(dictId);
      if (dictType) {
        const dataCount = await this.prisma.sysDictData.count({
          where: {
            dictType: dictType.dictType,
            delFlag: DelFlagEnum.NORMAL,
          },
        });
        BusinessException.throwIf(dataCount > 0, `字典类型 [${dictType.dictName}] 存在关联数据，无法删除`);
      }
    }

    await this.dictTypeRepo.softDeleteBatch(dictIds);
    return Result.ok();
  }

  async updateType(updateDictTypeDto: UpdateDictTypeDto) {
    // T-2: 校验字典类型唯一性（排除自身）
    if (updateDictTypeDto.dictType) {
      const exists = await this.dictTypeRepo.existsByDictType(
        updateDictTypeDto.dictType,
        updateDictTypeDto.dictId,
      );
      BusinessException.throwIf(exists, '字典类型已存在');
    }

    // T-7: 如果修改了字典类型标识，需要清除旧缓存
    const oldDictType = await this.dictTypeRepo.findById(updateDictTypeDto.dictId);
    if (oldDictType && updateDictTypeDto.dictType && oldDictType.dictType !== updateDictTypeDto.dictType) {
      await this.redisService.del(`${CacheEnum.SYS_DICT_KEY}${oldDictType.dictType}`);
    }

    await this.dictTypeRepo.update(updateDictTypeDto.dictId, updateDictTypeDto);
    return Result.ok();
  }

  async findAllType(query: ListDictType) {
    const where: Prisma.SysDictTypeWhereInput = {
      delFlag: DelFlagEnum.NORMAL,
    };

    if (query.dictName) {
      where.dictName = {
        contains: query.dictName,
      };
    }

    if (query.dictType) {
      where.dictType = {
        contains: query.dictType,
      };
    }

    if (query.status) {
      where.status = query.status as any;
    }

    if (query.params?.beginTime && query.params?.endTime) {
      where.createTime = {
        gte: new Date(query.params.beginTime),
        lte: new Date(query.params.endTime),
      };
    }

    const { list, total } = await this.dictTypeRepo.findPageWithFilter(where, query.skip, query.take);

    return Result.ok({
      rows: FormatDateFields(list),
      total,
    });
  }

  async findOneType(dictId: number) {
    const data = await this.dictTypeRepo.findById(dictId);
    return Result.ok(data);
  }

  async findOptionselect() {
    const data = await this.dictTypeRepo.findAllForSelect();
    return Result.ok(data);
  }

  // 字典数据
  async createDictData(createDictDataDto: CreateDictDataDto) {
    // T-3: 校验字典标签唯一性
    const exists = await this.dictDataRepo.existsByDictLabel(
      createDictDataDto.dictType,
      createDictDataDto.dictLabel,
    );
    BusinessException.throwIf(exists, '字典标签已存在');

    await this.dictDataRepo.create({
      ...createDictDataDto,
      dictSort: createDictDataDto.dictSort ?? 0,
      status: createDictDataDto.status ?? Status.NORMAL,
      isDefault: 'N',
      delFlag: DelFlagEnum.NORMAL,
    });
    // 清除对应字典类型的缓存
    await this.redisService.del(`${CacheEnum.SYS_DICT_KEY}${createDictDataDto.dictType}`);
    return Result.ok();
  }

  async deleteDictData(dictIds: number[]) {
    // T-7: 删除前获取字典类型，用于清除对应缓存
    const dictTypesToClear = new Set<string>();
    for (const dictId of dictIds) {
      const dictData = await this.dictDataRepo.findById(dictId);
      if (dictData) {
        dictTypesToClear.add(dictData.dictType);
      }
    }

    await this.dictDataRepo.softDeleteBatch(dictIds);

    // 按字典类型清除缓存
    for (const dictType of dictTypesToClear) {
      await this.redisService.del(`${CacheEnum.SYS_DICT_KEY}${dictType}`);
    }
    return Result.ok();
  }

  async updateDictData(updateDictDataDto: UpdateDictDataDto) {
    // T-4: 校验字典标签唯一性（排除自身）
    if (updateDictDataDto.dictLabel && updateDictDataDto.dictType) {
      const exists = await this.dictDataRepo.existsByDictLabel(
        updateDictDataDto.dictType,
        updateDictDataDto.dictLabel,
        updateDictDataDto.dictCode,
      );
      BusinessException.throwIf(exists, '字典标签已存在');
    }

    await this.dictDataRepo.update(updateDictDataDto.dictCode, updateDictDataDto);
    // 清除对应字典类型的缓存
    if (updateDictDataDto.dictType) {
      await this.redisService.del(`${CacheEnum.SYS_DICT_KEY}${updateDictDataDto.dictType}`);
    }
    return Result.ok();
  }

  async findAllData(query: ListDictData) {
    const where: Prisma.SysDictDataWhereInput = {
      delFlag: DelFlagEnum.NORMAL,
    };

    if (query.dictLabel) {
      where.dictLabel = {
        contains: query.dictLabel,
      };
    }

    if (query.dictType) {
      where.dictType = query.dictType;
    }

    if (query.status) {
      where.status = query.status as any;
    }

    const { list, total } = await this.dictDataRepo.findPageWithFilter(where, query.skip, query.take);

    return Result.ok({
      rows: FormatDateFields(list),
      total,
    });
  }

  /**
   * 根据字典类型查询一个数据类型的信息。
   *
   * @param dictType 字典类型字符串。
   * @returns 返回查询到的数据类型信息，如果未查询到则返回空。
   */
  async findOneDataType(dictType: string) {
    // 尝试从Redis缓存中获取字典数据
    let data = await this.redisService.get(`${CacheEnum.SYS_DICT_KEY}${dictType}`);

    if (data) {
      // 如果缓存中存在，则直接返回缓存数据
      return Result.ok(data);
    }

    // 从数据库中查询字典数据
    data = await this.dictDataRepo.findByDictType(dictType);

    // 将查询到的数据存入Redis缓存，并返回数据
    await this.redisService.set(`${CacheEnum.SYS_DICT_KEY}${dictType}`, data);
    return Result.ok(data);
  }

  async findOneDictData(dictCode: number) {
    const data = await this.dictDataRepo.findById(dictCode);
    return Result.ok(data);
  }

  /**
   * 导出字典数据为xlsx文件
   * @param res
   */
  async export(res: Response, body: ListDictType) {
    delete body.pageNum;
    delete body.pageSize;
    const list = await this.findAllType(body);
    const options = {
      sheetName: '字典数据',
      data: list.data.rows,
      header: [
        { title: '字典主键', dataIndex: 'dictId' },
        { title: '字典名称', dataIndex: 'dictName' },
        { title: '字典类型', dataIndex: 'dictType' },
        { title: '状态', dataIndex: 'status' },
      ],
    };
    return await ExportTable(options, res);
  }

  /**
   * 导出字典数据为xlsx文件
   * @param res
   */
  async exportData(res: Response, body: ListDictType) {
    delete body.pageNum;
    delete body.pageSize;
    const list = await this.findAllData(body);
    const options = {
      sheetName: '字典数据',
      data: list.data.rows,
      header: [
        { title: '字典主键', dataIndex: 'dictCode' },
        { title: '字典名称', dataIndex: 'dictLabel' },
        { title: '字典类型', dataIndex: 'dictValue' },
        { title: '备注', dataIndex: 'remark' },
      ],
    };
    return await ExportTable(options, res);
  }

  /**
   * 刷新字典缓存
   * @returns
   */
  async resetDictCache() {
    await this.clearDictCache();
    await this.loadingDictCache();
    return Result.ok();
  }

  /**
   * 删除字典缓存
   * @returns
   */
  async clearDictCache() {
    const keys = await this.redisService.keys(`${CacheEnum.SYS_DICT_KEY}*`);
    if (keys && keys.length > 0) {
      await this.redisService.del(keys);
    }
  }

  /**
   * 加载字典缓存
   * @returns
   */
  @Cacheable(CacheEnum.SYS_DICT_KEY, 'all')
  async loadingDictCache() {
    const dictData = await this.prisma.sysDictData.findMany({
      where: {
        delFlag: DelFlagEnum.NORMAL,
      },
      orderBy: [{ dictType: 'asc' }, { dictSort: 'asc' }],
    });

    const grouped = dictData.reduce<Record<string, typeof dictData>>(
      (acc, item) => {
        if (!acc[item.dictType]) {
          acc[item.dictType] = [];
        }
        acc[item.dictType].push(item);
        return acc;
      },
      {} as Record<string, typeof dictData>,
    );

    await Promise.all(
      Object.entries(grouped).map(([dictType, items]) =>
        this.redisService.set(`${CacheEnum.SYS_DICT_KEY}${dictType}`, items),
      ),
    );
  }

  /**
   * T-8: 批量导入字典类型及数据
   * @param importList 导入数据列表
   * @returns 导入结果统计
   */
  async importDict(importList: ImportDictDto[]): Promise<Result<ImportDictResultDto>> {
    const result: ImportDictResultDto = {
      successTypeCount: 0,
      successDataCount: 0,
      skippedTypeCount: 0,
      skippedDataCount: 0,
      errors: [],
    };

    const dictTypesToClear = new Set<string>();

    for (const item of importList) {
      // 检查字典类型是否已存在
      const typeExists = await this.dictTypeRepo.existsByDictType(item.dictType);

      if (!typeExists) {
        // 创建字典类型
        await this.dictTypeRepo.create({
          dictName: item.dictName,
          dictType: item.dictType,
          remark: item.remark,
        });
        result.successTypeCount++;
      } else {
        result.skippedTypeCount++;
      }

      // 导入字典数据
      for (let i = 0; i < item.dataList.length; i++) {
        const dataItem = item.dataList[i];
        const labelExists = await this.dictDataRepo.existsByDictLabel(item.dictType, dataItem.dictLabel);

        if (!labelExists) {
          await this.dictDataRepo.create({
            dictType: item.dictType,
            dictLabel: dataItem.dictLabel,
            dictValue: dataItem.dictValue,
            dictSort: dataItem.dictSort ?? i,
            listClass: dataItem.listClass ?? 'default',
            cssClass: dataItem.cssClass ?? '',
            remark: dataItem.remark,
            isDefault: 'N',
            status: Status.NORMAL,
            delFlag: DelFlagEnum.NORMAL,
          });
          result.successDataCount++;
          dictTypesToClear.add(item.dictType);
        } else {
          result.skippedDataCount++;
        }
      }
    }

    // 清除受影响的字典缓存
    for (const dictType of dictTypesToClear) {
      await this.redisService.del(`${CacheEnum.SYS_DICT_KEY}${dictType}`);
    }

    return Result.ok(result);
  }

  /**
   * T-9: 批量更新字典数据排序
   * @param sortDto 排序数据
   * @returns 更新结果
   */
  async sortDictData(sortDto: SortDictDataDto): Promise<Result<number>> {
    const { dictType, sortList } = sortDto;

    // 批量更新排序
    await Promise.all(
      sortList.map((item) =>
        this.dictDataRepo.update(item.dictCode, { dictSort: item.dictSort }),
      ),
    );

    // 清除对应字典类型的缓存
    await this.redisService.del(`${CacheEnum.SYS_DICT_KEY}${dictType}`);

    return Result.ok(sortList.length);
  }


    /**
     * T-10: 获取字典使用统计
     * @returns 字典统计汇总信息
     */
    async getDictStats(): Promise<Result<DictStatsSummaryDto>> {
      // 获取所有字典类型
      const dictTypes = await this.dictTypeRepo.findAllForSelect();

      let totalDataCount = 0;
      let cachedTypeCount = 0;
      const details: DictStatsDto[] = [];

      for (const dictType of dictTypes) {
        // 统计每个字典类型的数据数量
        const dataCount = await this.prisma.sysDictData.count({
          where: {
            dictType: dictType.dictType,
            delFlag: DelFlagEnum.NORMAL,
          },
        });

        // 检查缓存状态
        const cacheKey = `${CacheEnum.SYS_DICT_KEY}${dictType.dictType}`;
        const cached = await this.redisService.get(cacheKey);
        const cacheStatus: 'cached' | 'not_cached' = cached ? 'cached' : 'not_cached';

        if (cached) {
          cachedTypeCount++;
        }

        totalDataCount += dataCount;

        details.push({
          dictType: dictType.dictType,
          dictName: dictType.dictName,
          dataCount,
          cacheStatus,
        });
      }

      return Result.ok({
        totalTypeCount: dictTypes.length,
        totalDataCount,
        cachedTypeCount,
        details,
      });
    }
}
