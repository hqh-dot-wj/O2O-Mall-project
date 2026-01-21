import { Controller, Get, Post, Body, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { ServiceSlotService } from './service-slot.service';
import { TimeSlotDto, LockSlotDto } from './dto/service-slot.dto';
import { Result } from 'src/common/response';
import { Member } from '../common/decorators/member.decorator';

@ApiTags('C端-服务预约')
@Controller('client/service')
export class ServiceSlotController {
    constructor(private readonly serviceSlotService: ServiceSlotService) { }

    @Get('available-dates')
    @ApiOperation({ summary: '获取可预约日期' })
    async getAvailableDates() {
        const result = await this.serviceSlotService.getAvailableDates();
        return Result.ok({ dates: result });
    }

    @Get('time-slots')
    @ApiOperation({ summary: '获取可用时间段' })
    async getTimeSlots(@Query() dto: TimeSlotDto) {
        const result = await this.serviceSlotService.getTimeSlots(dto.date);
        return Result.ok({ slots: result });
    }

    @Post('lock-slot')
    @ApiOperation({ summary: '锁定时间段' })
    async lockSlot(@Member('memberId') memberId: string, @Body() dto: LockSlotDto) {
        await this.serviceSlotService.lockSlot(dto.date, dto.time, memberId);
        return Result.ok(null, '锁定成功');
    }
}
