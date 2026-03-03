import { Injectable } from '@nestjs/common';
import { Result } from 'src/common/response';
import { SessionService } from 'src/module/admin/auth/services/session.service';
import { OnlineListDto } from './dto/index';

@Injectable()
export class OnlineService {
  constructor(private readonly sessionService: SessionService) {}

  /**
   * 在线用户列表-分页
   *
   * @param query 查询条件
   * @returns 分页结果
   */
  async findAll(query: OnlineListDto) {
    const { list, total } = await this.sessionService.getOnlineUsers({
      userName: query.userName,
      ipaddr: query.ipaddr,
      pageNum: Number(query.pageNum),
      pageSize: Number(query.pageSize),
    });

    return Result.page(list, total);
  }

  /**
   * 强制用户下线
   *
   * @param token 用户会话 Token（uuid）
   */
  async delete(token: string) {
    await this.sessionService.deleteSession(token);
    return Result.ok();
  }
}
