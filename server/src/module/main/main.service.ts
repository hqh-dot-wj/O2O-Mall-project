import { Injectable } from '@nestjs/common';
import { Result } from 'src/common/response';
import { SUCCESS_CODE } from 'src/common/response';
import { UserService } from '../system/user/user.service';
import { LoginlogService } from '../monitor/loginlog/loginlog.service';
import { AxiosService } from 'src/module/common/axios/axios.service';
import { RegisterDto, LoginDto } from './dto/index';
import { MenuService } from '../system/menu/menu.service';
import { ClientInfoDto } from 'src/common/decorators/common.decorator';
import { StatusEnum } from 'src/common/enum/index';
@Injectable()
export class MainService {
  constructor(
    private readonly menuService: MenuService,
  ) { }



  /**
   * 登陆记录
   */
  loginRecord() { }

  /**
   * 获取路由菜单
   */
  async getRouters(userId: number) {
    const menus = await this.menuService.getMenuListByUserId(userId);
    return Result.ok(menus);
  }
}
