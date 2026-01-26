import { Injectable } from '@nestjs/common';
import { PlayTemplateRepository } from './template.repository';
import { CreatePlayTemplateDto, ListPlayTemplateDto, UpdatePlayTemplateDto } from './dto/template.dto';
import { Result } from 'src/common/response/result';
import { BusinessException } from 'src/common/exceptions/business.exception';
import { FormatDateFields } from 'src/common/utils';
import { Transactional } from 'src/common/decorators/transactional.decorator'; // 假设有这个装饰器

@Injectable()
export class PlayTemplateService {
  constructor(private readonly repo: PlayTemplateRepository) {}

  /**
   * 查询玩法模板列表
   * @param query 查询参数
   * @returns 分页列表
   */
  async findAll(query: ListPlayTemplateDto) {
    const { rows, total } = await this.repo.search(query);
    // ✅ 中文注释：使用 FormatDateFields 统一格式化日期字段，确保 VO 契约一致
    return Result.page(FormatDateFields(rows), total);
  }

  /**
   * 查询详情
   * @param id 模板ID
   */
  async findOne(id: string) {
    const template = await this.repo.findById(id);
    // ✅ 中文注释：使用语义化的断言抛出异常，替代传统 if-throw
    BusinessException.throwIfNull(template, '未找到指定的玩法模板');
    return Result.ok(FormatDateFields(template));
  }

  /**
   * 创建玩法模板
   * @param dto 创建数据
   */
  @Transactional() // ✅ 中文注释：显式事务声明，防止部分数据创建失败导致的不一致
  async create(dto: CreatePlayTemplateDto) {
    // 1. 业务唯一性校验 (卫语句)
    const exists = await this.repo.findByCode(dto.code);
    BusinessException.throwIf(exists !== null, '模板编码已存在，请重新输入');

    // 2. 执行持久化
    const template = await this.repo.create(dto);
    return Result.ok(FormatDateFields(template), '创建成功');
  }

  /**
   * 更新玩法模板
   * @param id 模板ID
   * @param dto 更新数据
   */
  @Transactional()
  async update(id: string, dto: UpdatePlayTemplateDto) {
    // 1. 存在性检查
    const template = await this.repo.findById(id);
    BusinessException.throwIfNull(template, '待更新的模板不存在');

    // 2. 编码唯一性检查 (如果修改了编码)
    if (dto.code && dto.code !== template.code) {
      const exists = await this.repo.findByCode(dto.code);
      BusinessException.throwIf(exists !== null, '模版编码已被其他模版占用');
    }

    // 3. 执行更新
    const updated = await this.repo.update(id, dto);
    return Result.ok(FormatDateFields(updated), '更新成功');
  }

  /**
   * 删除玩法模板
   * @param id 模板ID
   */
  async delete(id: string) {
    // 1. 检查是否存在
    const template = await this.repo.findById(id);
    BusinessException.throwIfNull(template, '待删除的模板不存在');

    // 2. 执行软删除
    await this.repo.softDelete(id);
    return Result.ok(null, '删除成功');
  }
}
