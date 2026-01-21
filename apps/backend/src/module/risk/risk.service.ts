import { Injectable, Logger, ForbiddenException } from '@nestjs/common';
import { RedisService } from 'src/module/common/redis/redis.service';
import { BusinessException } from 'src/common/exceptions';

@Injectable()
export class RiskService {
    private readonly logger = new Logger(RiskService.name);

    // 规则配置
    private readonly LIMIT_HOURLY_ORDERS = 10; // 单用户每小时最大单数
    private readonly LIMIT_IP_daily_USERS = 5; // 单IP每天最大不同用户数

    constructor(private readonly redis: RedisService) { }

    /**
     * 检查订单风控
     * @param memberId 会员ID
     * @param tenantId 租户ID
     * @param ip 客户端IP
     * @param deviceId 设备ID (可选)
     */
    async checkOrderRisk(memberId: string, tenantId: string, ip: string, deviceId?: string) {
        // 1. 高频下单检测 (每小时)
        await this.checkFrequency(memberId, tenantId);

        // 2. IP 聚集检测 (同一IP过多用户)
        if (ip) {
            await this.checkIpClustering(ip, memberId);
        }

        // 3. 关联账户风险 (Todo: 记录日志)
        if (deviceId) {
            // this.logDeviceAssociation(deviceId, memberId);
        }
    }

    /**
     * 检测下单频率
     */
    private async checkFrequency(memberId: string, tenantId: string) {
        const key = `risk:freq:order:${tenantId}:${memberId}`;
        // 获取当前计数值
        const count = await this.redis.getClient().incr(key);

        // 如果是第一次，设置过期时间 1小时
        if (count === 1) {
            await this.redis.getClient().expire(key, 3600);
        }

        if (count > this.LIMIT_HOURLY_ORDERS) {
            this.logger.warn(`Risk Control: High frequency orders for member ${memberId} (count: ${count})`);
            throw new BusinessException(1001, '下单过于频繁，请稍后再试');
        }
    }

    /**
     * 检测 IP 聚集 (刷单工场检测)
     */
    private async checkIpClustering(ip: string, memberId: string) {
        // 使用 Set 存储该 IP 下当天的 distinct memberIds
        const today = new Date().toISOString().split('T')[0];
        const key = `risk:ip:users:${today}:${ip}`;

        await this.redis.getClient().sadd(key, memberId);
        await this.redis.getClient().expire(key, 86400); // 24h

        const membersCount = await this.redis.getClient().scard(key);

        if (membersCount > this.LIMIT_IP_daily_USERS) {
            this.logger.warn(`Risk Control: IP clustering detected for ${ip} (users: ${membersCount})`);
            // 策略: 仅阻断超过阈值的新增用户，还是阻断该IP所有交易？
            // 这里选择阻断。
            throw new BusinessException(1001, '当前网络环境异常，无法下单');
        }
    }
}
