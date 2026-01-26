import { Controller, Get, Query, Param } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Api } from 'src/common/decorators/api.decorator';
import { ClientProductService } from './product.service';
import { ClientListProductDto } from './dto';
import { ClientProductVo, ClientProductDetailVo, ClientCategoryVo } from './vo';

@ApiTags('C端-商品模块')
@Controller('client/product')
export class ClientProductController {
  constructor(private readonly productService: ClientProductService) {}

  /**
   * 获取商品列表
   */
  @Api({ summary: '获取商品列表', type: ClientProductVo, isPager: true })
  @Get('list')
  findAll(@Query() query: ClientListProductDto) {
    return this.productService.findAll(query);
  }

  /**
   * 获取商品详情
   */
  @Api({ summary: '获取商品详情', type: ClientProductDetailVo })
  @Get('detail/:id')
  findOne(@Param('id') id: string) {
    return this.productService.findOne(id);
  }

  /**
   * 获取商品分类树
   */
  @Api({ summary: '获取商品分类树', type: ClientCategoryVo, isArray: true })
  @Get('category/tree')
  findCategoryTree() {
    return this.productService.findCategoryTree();
  }

  /**
   * 获取商品分类列表
   */
  @Api({ summary: '获取商品分类列表', type: ClientCategoryVo, isArray: true })
  @Get('category/list')
  findCategoryList(@Query('parentId') parentId?: number) {
    return this.productService.findCategoryList(parentId);
  }
}
