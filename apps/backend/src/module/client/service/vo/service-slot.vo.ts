import { ApiProperty } from '@nestjs/swagger';

export class DateVo {
  @ApiProperty({ description: '日期值 (YYYY-MM-DD)' })
  value: string;

  @ApiProperty({ description: '显示文本 (如: 今天, 明天, 1月20日)' })
  label: string;

  @ApiProperty({ description: '星期 (如: 周一)' })
  week: string;
}

export class TimeSlotVo {
  @ApiProperty({ description: '开始时间 (HH:mm)' })
  time: string;

  @ApiProperty({ description: '结束时间 (HH:mm)' })
  endTime: string;

  @ApiProperty({ description: '是否可用' })
  available: boolean;

  @ApiProperty({ description: '不可用原因', required: false })
  reason?: string;
}

export class AvailableDatesVo {
  @ApiProperty({ type: [DateVo] })
  dates: DateVo[];
}

export class TimeSlotsVo {
  @ApiProperty({ type: [TimeSlotVo] })
  slots: TimeSlotVo[];
}
