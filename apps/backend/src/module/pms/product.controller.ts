import { Body, Controller, Get, Post, Put, Query, Param } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { Api } from 'src/common/decorators/api.decorator';
import { PmsProductService } from './product.service';
import { CreateProductDto, ListProductDto } from './dto';
import { ProductVo } from './vo';

@ApiTags('商品管理')
@ApiBearerAuth('Authorization')
@Controller('pms/product')
export class PmsProductController {
  constructor(private readonly pmsProductService: PmsProductService) {}

  @Api({ summary: '创建商品' })
  @Post()
  create(@Body() createProductDto: CreateProductDto) {
    return this.pmsProductService.create(createProductDto);
  }

  @Api({ summary: '商品列表', type: ProductVo, isPager: true })
  @Get('list')
  findAll(@Query() query: ListProductDto) {
    return this.pmsProductService.findAll(query);
  }

  @Api({ summary: '商品详情', type: ProductVo })
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.pmsProductService.findOne(id);
  }

  @Api({ summary: '更新商品' })
  @Put(':id')
  update(@Param('id') id: string, @Body() createProductDto: CreateProductDto) {
    return this.pmsProductService.update(id, createProductDto);
  }
}
