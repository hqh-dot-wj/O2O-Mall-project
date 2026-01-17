
import { Controller, Post, Body, Get, Param, Query, Put, Delete } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { AttributeService } from './attribute.service';
import { CreateTemplateDto } from './dto/attribute.dto';
import { Result } from 'src/common/response';

@ApiTags('PMS-参数规格模板')
@Controller('pms/attribute')
export class AttributeController {
    constructor(private readonly service: AttributeService) { }

    @ApiOperation({ summary: '创建参数模板' })
    @Post('template')
    create(@Body() dto: CreateTemplateDto) {
        return this.service.create(dto);
    }

    @ApiOperation({ summary: '更新参数模板(仅改名)' })
    @Put('template/:id')
    update(@Param('id') id: string, @Body() dto: CreateTemplateDto) {
        return this.service.update(+id, dto);
    }

    @ApiOperation({ summary: '删除参数模板' })
    @Delete('template/:id')
    remove(@Param('id') id: string) {
        return this.service.remove(+id);
    }

    @ApiOperation({ summary: '分页查询模板列表' })
    @Get('template/list')
    findAll(@Query() query: { pageNum?: number; pageSize?: number; name?: string }) {
        return this.service.findAll(query);
    }

    @ApiOperation({ summary: '获取模板详情(含属性)' })
    @Get('template/:id')
    findOne(@Param('id') id: string) {
        return this.service.findOne(+id);
    }

    // 获取某个分类下的所有属性 (给发布商品页用的核心接口)
    // 注意：需要去 modify CategoryService/Controller 里的逻辑吗？
    // 或者在这里提供一个接口: 根据 categoryId 查 attributes
    @ApiOperation({ summary: '根据分类ID获取绑定的所有属性(发布商品用)' })
    @Get('category/:catId')
    async getByCategory(@Param('catId') catId: string) {
        // 逻辑：
        // 1. 查这个分类绑定的 templateId
        // 2. 查 template 下的 attributes
        // 这里需要调用 Prisma，Service 已经没有 Category 的引用了? 
        // 其实可以直接在 AttributeService 里注入 PrismaService 直接查 PmsCategory 表。
        // 在 attribute.service.ts 里补充这个方法。

        // 临时在 Controller 调用 Service 的新方法 (需要去 Service 补一个)
        return this.service.getByCategory(+catId);
    }
}
