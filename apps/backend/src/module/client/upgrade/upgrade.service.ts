import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { Result, ResponseCode } from 'src/common/response';
import { BusinessException } from 'src/common/exceptions';
import { Transactional } from 'src/common/decorators/transactional.decorator';
import { ApplyUpgradeDto } from './dto/upgrade.dto';
import { ReferralCodeVo, TeamStatsVo, UpgradeApplyVo } from './vo/upgrade.vo';
import { Prisma } from '@prisma/client';
import { nanoid } from 'nanoid';
import { WechatService } from '../common/service/wechat.service';
import { UploadService } from 'src/module/admin/upload/upload.service';
import { getErrorMessage } from 'src/common/utils/error';

/**
 * C端会员升级服务
 * 处理升级申请、推荐码管理、团队查询
 */
@Injectable()
export class UpgradeService {
  private readonly logger = new Logger(UpgradeService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly wechatService: WechatService,
    private readonly uploadService: UploadService,
  ) {}

  /**
   * 申请升级 (通过扫描推荐码)
   */
  @Transactional()
  async applyUpgrade(memberId: string, dto: ApplyUpgradeDto) {
    // 1. 获取当前会员信息
    const member = await this.prisma.umsMember.findUnique({
      where: { memberId },
    });
    BusinessException.throwIfNull(member, '会员不存在');

    // 2. 校验等级
    if (member!.levelId >= dto.targetLevel) {
      throw new BusinessException(ResponseCode.BUSINESS_ERROR, '您已是该等级或更高等级');
    }

    // 3. 校验推荐码 (扫码申请必须有推荐码)
    let referrerId: string | null = null;
    let targetTenantId = member!.tenantId;

    if (dto.referralCode) {
      const codeRecord = await this.prisma.umsReferralCode.findUnique({
        where: { code: dto.referralCode },
      });

      if (!codeRecord || !codeRecord.isActive) {
        throw new BusinessException(ResponseCode.BUSINESS_ERROR, '推荐码无效或已失效');
      }

      // 获取推荐人信息
      const referrer = await this.prisma.umsMember.findUnique({
        where: { memberId: codeRecord.memberId },
      });

      if (!referrer || referrer.levelId < 2) {
        throw new BusinessException(ResponseCode.BUSINESS_ERROR, '推荐人不是有效的股东');
      }

      referrerId = referrer.memberId;
      targetTenantId = codeRecord.tenantId;

      // 更新推荐码使用次数
      await this.prisma.umsReferralCode.update({
        where: { id: codeRecord.id },
        data: { usageCount: { increment: 1 } },
      });
    }

    // 4. 创建升级申请
    const apply = await this.prisma.umsUpgradeApply.create({
      data: {
        tenantId: targetTenantId,
        memberId,
        fromLevel: member!.levelId,
        toLevel: dto.targetLevel,
        applyType: dto.applyType || 'REFERRAL_CODE',
        referralCode: dto.referralCode,
        referrerId,
        status: 'APPROVED', // 扫码申请自动通过
      },
    });

    // 5. 立即升级会员
    await this.prisma.umsMember.update({
      where: { memberId },
      data: {
        levelId: dto.targetLevel,
        tenantId: targetTenantId, // 升级归属下单/推荐码门店
        parentId: referrerId || member!.parentId, // 如有新推荐人则更新
        upgradedAt: new Date(),
      },
    });

    this.logger.log(`会员 ${memberId} 升级到等级 ${dto.targetLevel}, 申请ID: ${apply.id}`);

    return Result.ok({ applyId: apply.id }, '升级成功');
  }

  /**
   * 通过购买商品自动升级 (由订单支付回调触发)
   */
  @Transactional()
  async upgradeByOrder(memberId: string, orderId: string, targetLevel: number, tenantId: string) {
    // 1. 获取会员
    const member = await this.prisma.umsMember.findUnique({
      where: { memberId },
    });

    if (!member || member.levelId >= targetLevel) {
      this.logger.log(`会员 ${memberId} 无需升级, 当前等级: ${member?.levelId}, 目标: ${targetLevel}`);
      return;
    }

    // 2. 创建申请记录
    const apply = await this.prisma.umsUpgradeApply.create({
      data: {
        tenantId,
        memberId,
        fromLevel: member.levelId,
        toLevel: targetLevel,
        applyType: 'PRODUCT_PURCHASE',
        orderId,
        status: 'APPROVED',
      },
    });

    // 3. 升级会员
    await this.prisma.umsMember.update({
      where: { memberId },
      data: {
        levelId: targetLevel,
        tenantId, // 升级归属下单门店
        upgradedAt: new Date(),
        upgradeOrderId: orderId,
      },
    });

    // 4. 如果升级到C2，自动生成推荐码
    if (targetLevel === 2) {
      await this.generateReferralCode(memberId, tenantId);
    }

    this.logger.log(`会员 ${memberId} 通过订单 ${orderId} 升级到等级 ${targetLevel}`);
  }

  /**
   * 获取我的推荐码 (仅C2可用)
   */
  async getMyReferralCode(memberId: string): Promise<ReferralCodeVo | null> {
    const member = await this.prisma.umsMember.findUnique({
      where: { memberId },
    });

    if (!member || member.levelId < 2) {
      throw new BusinessException(ResponseCode.BUSINESS_ERROR, '仅共享股东可获取推荐码');
    }

    // 查询现有推荐码
    let codeRecord = await this.prisma.umsReferralCode.findFirst({
      where: { memberId, isActive: true },
    });

    // 如果没有则生成
    if (!codeRecord) {
      codeRecord = await this.generateReferralCode(memberId, member.tenantId);
    }

    return {
      code: codeRecord.code,
      qrCodeUrl: codeRecord.qrCodeUrl,
      usageCount: codeRecord.usageCount,
    };
  }

  /**
   * 生成推荐码 (带租户前缀) + 小程序码
   */
  private async generateReferralCode(memberId: string, tenantId: string) {
    // 格式: T001-XXXX (租户前缀 + 随机码)
    const prefix = tenantId.slice(0, 4).toUpperCase();
    const randomPart = nanoid(4).toUpperCase();
    const code = `${prefix}-${randomPart}`;

    let qrCodeUrl: string | null = null;

    // 生成小程序码
    try {
      const scene = `code=${code}`;
      const qrBuffer = await this.wechatService.getWxaCodeUnlimited(scene, {
        page: 'pages/upgrade/referral-code', // 小程序页面路径
        width: 430,
        envVersion: 'release',
      });

      if (qrBuffer) {
        // 上传小程序码图片
        const mockFile: Express.Multer.File = {
          originalname: `referral_${code}.png`,
          buffer: qrBuffer,
          size: qrBuffer.length,
          mimetype: 'image/png',
          fieldname: 'file',
          encoding: '7bit',
          destination: '',
          filename: '',
          path: '',
          stream: null as any,
        };

        const uploadResult = await this.uploadService.singleFileUpload(mockFile);
        qrCodeUrl = uploadResult.url;
        this.logger.log(`为会员 ${memberId} 生成小程序码: ${qrCodeUrl}`);
      }
    } catch (error) {
      this.logger.error(`生成小程序码失败: ${getErrorMessage(error)}`);
      // 小程序码生成失败不影响推荐码创建
    }

    const record = await this.prisma.umsReferralCode.create({
      data: {
        tenantId,
        memberId,
        code,
        qrCodeUrl,
        isActive: true,
      },
    });

    this.logger.log(`为会员 ${memberId} 生成推荐码: ${code}`);
    return record;
  }

  /**
   * 获取团队统计
   */
  async getTeamStats(memberId: string): Promise<TeamStatsVo> {
    const member = await this.prisma.umsMember.findUnique({
      where: { memberId },
    });

    if (!member) {
      throw new BusinessException(ResponseCode.BUSINESS_ERROR, '会员不存在');
    }

    // 统计直接下级
    const directCount = await this.prisma.umsMember.count({
      where: { parentId: memberId },
    });

    // 统计间接下级
    const indirectCount = await this.prisma.umsMember.count({
      where: { indirectParentId: memberId },
    });

    // 统计团队总业绩 (下级的订单总额)
    const directMemberIds = await this.prisma.umsMember.findMany({
      where: { parentId: memberId },
      select: { memberId: true },
    });

    const indirectMemberIds = await this.prisma.umsMember.findMany({
      where: { indirectParentId: memberId },
      select: { memberId: true },
    });

    const allMemberIds = [...directMemberIds.map((m) => m.memberId), ...indirectMemberIds.map((m) => m.memberId)];

    let totalTeamSales = new Prisma.Decimal(0);
    if (allMemberIds.length > 0) {
      const result = await this.prisma.omsOrder.aggregate({
        where: {
          memberId: { in: allMemberIds },
          payStatus: 'PAID',
        },
        _sum: { payAmount: true },
      });
      totalTeamSales = result._sum.payAmount || new Prisma.Decimal(0);
    }

    return {
      myLevel: member.levelId,
      directCount,
      indirectCount,
      totalTeamSales: Number(totalTeamSales),
    };
  }

  /**
   * 获取我的团队列表
   */
  async getTeamList(memberId: string, type: 'direct' | 'indirect', pageNum: number = 1, pageSize: number = 10) {
    const where = type === 'direct' ? { parentId: memberId } : { indirectParentId: memberId };

    const [list, total] = await Promise.all([
      this.prisma.umsMember.findMany({
        where,
        select: {
          memberId: true,
          nickname: true,
          avatar: true,
          levelId: true,
          createTime: true,
        },
        skip: (pageNum - 1) * pageSize,
        take: pageSize,
        orderBy: { createTime: 'desc' },
      }),
      this.prisma.umsMember.count({ where }),
    ]);

    return Result.page(list, total);
  }

  /**
   * 查询升级申请状态
   */
  async getUpgradeStatus(memberId: string): Promise<UpgradeApplyVo | null> {
    const apply = await this.prisma.umsUpgradeApply.findFirst({
      where: { memberId },
      orderBy: { createTime: 'desc' },
    });

    if (!apply) return null;

    return {
      id: apply.id,
      fromLevel: apply.fromLevel,
      toLevel: apply.toLevel,
      applyType: apply.applyType,
      status: apply.status,
      createTime: apply.createTime,
    };
  }
}
