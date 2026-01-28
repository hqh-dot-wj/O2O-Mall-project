import { Test, TestingModule } from '@nestjs/testing';
import { WithdrawalService } from './withdrawal.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { WithdrawalRepository } from './withdrawal.repository';
import { WalletService } from '../wallet/wallet.service';
import { WithdrawalAuditService } from './withdrawal-audit.service';
import { ListWithdrawalDto } from './dto/list-withdrawal.dto';
import { Decimal } from '@prisma/client/runtime/library';
import { WithdrawalStatus } from '@prisma/client';
import { BusinessException } from 'src/common/exceptions';

describe('WithdrawalService', () => {
  let service: WithdrawalService;
  let prismaService: PrismaService;
  let withdrawalRepo: WithdrawalRepository;
  let walletService: WalletService;
  let auditService: WithdrawalAuditService;

  const mockPrismaService = {
    umsMember: {
      findUnique: jest.fn(),
    },
  };

  const mockWithdrawalRepo = {
    create: jest.fn(),
    findOne: jest.fn(),
    findPage: jest.fn(),
  };

  const mockWalletService = {
    getOrCreateWallet: jest.fn(),
    freezeBalance: jest.fn(),
  };

  const mockAuditService = {
    approve: jest.fn(),
    reject: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WithdrawalService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: WithdrawalRepository,
          useValue: mockWithdrawalRepo,
        },
        {
          provide: WalletService,
          useValue: mockWalletService,
        },
        {
          provide: WithdrawalAuditService,
          useValue: mockAuditService,
        },
      ],
    }).compile();

    service = module.get<WithdrawalService>(WithdrawalService);
    prismaService = module.get<PrismaService>(PrismaService);
    withdrawalRepo = module.get<WithdrawalRepository>(WithdrawalRepository);
    walletService = module.get<WalletService>(WalletService);
    auditService = module.get<WithdrawalAuditService>(WithdrawalAuditService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('apply', () => {
    const mockWallet = {
      id: 'wallet1',
      memberId: 'member1',
      balance: new Decimal(100),
      frozen: new Decimal(0),
    };

    const mockMember = {
      memberId: 'member1',
      nickname: '用户1',
    };

    it('应该成功申请提现', async () => {
      const mockWithdrawal = {
        id: 'withdrawal1',
        tenantId: 'tenant1',
        memberId: 'member1',
        amount: new Decimal(50),
        method: 'WECHAT',
        status: WithdrawalStatus.PENDING,
      };

      mockWalletService.getOrCreateWallet.mockResolvedValue(mockWallet);
      mockPrismaService.umsMember.findUnique.mockResolvedValue(mockMember);
      mockWalletService.freezeBalance.mockResolvedValue({});
      mockWithdrawalRepo.create.mockResolvedValue(mockWithdrawal);

      const result = await service.apply('member1', 'tenant1', 50, 'WECHAT');

      expect(result.data.id).toBe('withdrawal1');
      expect(mockWalletService.freezeBalance).toHaveBeenCalledWith(
        'member1',
        new Decimal(50),
      );
      expect(mockWithdrawalRepo.create).toHaveBeenCalled();
    });

    it('应该抛出异常 - 金额低于最小提现金额', async () => {
      await expect(service.apply('member1', 'tenant1', 0.5, 'WECHAT')).rejects.toThrow(
        BusinessException,
      );

      expect(mockWalletService.freezeBalance).not.toHaveBeenCalled();
    });

    it('应该抛出异常 - 钱包不存在', async () => {
      mockWalletService.getOrCreateWallet.mockResolvedValue(null);

      await expect(service.apply('member1', 'tenant1', 50, 'WECHAT')).rejects.toThrow(
        BusinessException,
      );

      expect(mockWalletService.freezeBalance).not.toHaveBeenCalled();
    });

    it('应该抛出异常 - 余额不足', async () => {
      const insufficientWallet = {
        ...mockWallet,
        balance: new Decimal(30),
      };

      mockWalletService.getOrCreateWallet.mockResolvedValue(insufficientWallet);

      await expect(service.apply('member1', 'tenant1', 50, 'WECHAT')).rejects.toThrow(
        BusinessException,
      );

      expect(mockWalletService.freezeBalance).not.toHaveBeenCalled();
    });
  });

  describe('audit', () => {
    const mockWithdrawal = {
      id: 'withdrawal1',
      memberId: 'member1',
      amount: new Decimal(50),
      status: WithdrawalStatus.PENDING,
      member: {
        memberId: 'member1',
        nickname: '用户1',
      },
    };

    it('应该成功审核通过', async () => {
      mockWithdrawalRepo.findOne.mockResolvedValue(mockWithdrawal);
      mockAuditService.approve.mockResolvedValue({ code: 200 });

      const result = await service.audit('withdrawal1', 'APPROVE', 'admin1');

      expect(mockAuditService.approve).toHaveBeenCalledWith(mockWithdrawal, 'admin1');
      expect(result.code).toBe(200);
    });

    it('应该成功审核驳回', async () => {
      mockWithdrawalRepo.findOne.mockResolvedValue(mockWithdrawal);
      mockAuditService.reject.mockResolvedValue({ code: 200 });

      const result = await service.audit('withdrawal1', 'REJECT', 'admin1', '余额异常');

      expect(mockAuditService.reject).toHaveBeenCalledWith(
        mockWithdrawal,
        'admin1',
        '余额异常',
      );
      expect(result.code).toBe(200);
    });

    it('应该抛出异常 - 提现申请不存在', async () => {
      mockWithdrawalRepo.findOne.mockResolvedValue(null);

      await expect(
        service.audit('withdrawal1', 'APPROVE', 'admin1'),
      ).rejects.toThrow(BusinessException);

      expect(mockAuditService.approve).not.toHaveBeenCalled();
    });

    it('应该抛出异常 - 不支持的审核操作', async () => {
      mockWithdrawalRepo.findOne.mockResolvedValue(mockWithdrawal);

      await expect(
        service.audit('withdrawal1', 'INVALID' as any, 'admin1'),
      ).rejects.toThrow(BusinessException);
    });
  });

  describe('getList', () => {
    it('应该返回提现列表', async () => {
      const mockResult = {
        rows: [
          {
            id: 'withdrawal1',
            memberId: 'member1',
            amount: new Decimal(50),
            status: WithdrawalStatus.PENDING,
            member: {
              memberId: 'member1',
              nickname: '用户1',
              mobile: '13800138000',
              avatar: 'avatar.jpg',
            },
          },
        ],
        total: 1,
      };

      mockWithdrawalRepo.findPage.mockResolvedValue(mockResult);

      const dto = new ListWithdrawalDto();
      dto.pageNum = 1;
      dto.pageSize = 20;
      dto.status = WithdrawalStatus.PENDING;

      const result = await service.getList(dto);

      expect(result.data.rows.length).toBe(1);
      expect(result.data.total).toBe(1);
      expect(mockWithdrawalRepo.findPage).toHaveBeenCalled();
    });

    it('应该支持关键词搜索', async () => {
      const mockResult: any = {
        rows: [],
        total: 0,
      };

      mockWithdrawalRepo.findPage.mockResolvedValue(mockResult);

      const dto = new ListWithdrawalDto();
      dto.pageNum = 1;
      dto.pageSize = 20;
      dto.keyword = '用户1';

      await service.getList(dto);

      const call = mockWithdrawalRepo.findPage.mock.calls[0][0];
      expect(call.where.member.OR).toBeDefined();
    });

    it('应该支持会员ID筛选', async () => {
      const mockResult: any = {
        rows: [],
        total: 0,
      };

      mockWithdrawalRepo.findPage.mockResolvedValue(mockResult);

      const dto = new ListWithdrawalDto();
      dto.pageNum = 1;
      dto.pageSize = 20;
      dto.memberId = 'member1';

      await service.getList(dto);

      const call = mockWithdrawalRepo.findPage.mock.calls[0][0];
      expect(call.where.memberId).toBe('member1');
    });
  });

  describe('getMemberWithdrawals', () => {
    it('应该返回用户的提现记录', async () => {
      const mockResult = {
        rows: [
          {
            id: 'withdrawal1',
            memberId: 'member1',
            amount: new Decimal(50),
            status: WithdrawalStatus.APPROVED,
          },
        ],
        total: 1,
      };

      mockWithdrawalRepo.findPage.mockResolvedValue(mockResult);

      const result = await service.getMemberWithdrawals('member1', 1, 20);

      expect(result.data.rows.length).toBe(1);
      expect(result.data.total).toBe(1);
      expect(mockWithdrawalRepo.findPage).toHaveBeenCalledWith({
        pageNum: 1,
        pageSize: 20,
        where: { memberId: 'member1' },
        orderBy: 'createTime',
        order: 'desc',
      });
    });
  });
});
