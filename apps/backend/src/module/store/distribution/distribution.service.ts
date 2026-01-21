import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { Result } from 'src/common/response';
import { BusinessException } from 'src/common/exceptions';
import { UpdateDistConfigDto } from './dto/update-dist-config.dto';
import { DistConfigVo, DistConfigLogVo } from './vo/dist-config.vo';

@Injectable()
export class DistributionService {
    constructor(private readonly prisma: PrismaService) { }

    /**
     * 获取分销规则配置
     * @param tenantId 租户ID
     * @returns 分销规则配置信息
     */
    async getConfig(tenantId: string): Promise<Result<DistConfigVo | null>> {
        const config = await this.prisma.sysDistConfig.findUnique({
            where: { tenantId },
        });

        if (!config) {
            // 返回默认配置
            return Result.ok({
                id: 0,
                level1Rate: 60,
                level2Rate: 40,
                enableLV0: true,
                createTime: new Date().toISOString(),
            });
        }

        return Result.ok({
            id: config.id,
            level1Rate: Number(config.level1Rate) * 100,
            level2Rate: Number(config.level2Rate) * 100,
            enableLV0: config.enableLV0,
            createTime: config.createTime.toISOString(),
        });
    }

    /**
     * 更新分销规则配置
     * @param tenantId 租户ID
     * @param dto 更新参数
     * @param operator 操作人
     * @returns 更新结果
     */
    async updateConfig(tenantId: string, dto: UpdateDistConfigDto, operator: string): Promise<Result<boolean>> {
        // 校验比例总和不能超过 100%
        const totalRate = dto.level1Rate + dto.level2Rate;
        BusinessException.throwIf(totalRate > 100, '一级和二级分佣比例之和不能超过100%');

        const level1Rate = dto.level1Rate / 100;
        const level2Rate = dto.level2Rate / 100;

        // Upsert 配置
        await this.prisma.sysDistConfig.upsert({
            where: { tenantId },
            update: {
                level1Rate,
                level2Rate,
                enableLV0: dto.enableLV0,
                updateBy: operator,
            },
            create: {
                tenantId,
                level1Rate,
                level2Rate,
                enableLV0: dto.enableLV0,
                createBy: operator,
                updateBy: operator,
            },
        });

        // 记录变更日志（审计）
        await this.prisma.sysDistConfigLog.create({
            data: {
                tenantId,
                level1Rate,
                level2Rate,
                enableLV0: dto.enableLV0,
                operator,
            },
        });

        return Result.ok(true, '更新成功');
    }

    /**
     * 获取分销规则变更历史
     * @param tenantId 租户ID
     * @returns 变更历史列表
     */
    async getConfigLogs(tenantId: string): Promise<Result<DistConfigLogVo[]>> {
        const logs = await this.prisma.sysDistConfigLog.findMany({
            where: { tenantId },
            orderBy: { createTime: 'desc' },
            take: 20,
        });

        const result = logs.map((log) => ({
            id: log.id,
            configId: log.id,
            level1Rate: Number(log.level1Rate) * 100,
            level2Rate: Number(log.level2Rate) * 100,
            enableLV0: log.enableLV0,
            operator: log.operator,
            createTime: log.createTime.toISOString(),
        }));

        return Result.ok(result);
    }
}
