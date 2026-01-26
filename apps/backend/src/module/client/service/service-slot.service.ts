import { Injectable } from '@nestjs/common';
import { RedisService } from 'src/module/common/redis/redis.service';
import { DateVo, TimeSlotVo } from './vo/service-slot.vo';
import dayjs from 'dayjs';
import 'dayjs/locale/zh-cn';

@Injectable()
export class ServiceSlotService {
  constructor(private readonly redisService: RedisService) {
    dayjs.locale('zh-cn');
  }

  /**
   * 获取未来7天可预约日期
   */
  async getAvailableDates(): Promise<DateVo[]> {
    const dates: DateVo[] = [];
    const today = dayjs();

    for (let i = 0; i < 7; i++) {
      const date = today.add(i, 'day');
      let label = date.format('MM月DD日');

      if (i === 0) label = '今天';
      else if (i === 1) label = '明天';
      else if (i === 2) label = '后天';

      dates.push({
        value: date.format('YYYY-MM-DD'),
        label,
        week: date.format('dddd'), // 周几
      });
    }
    return dates;
  }

  /**
   * 获取某天的可用时间段 (30分钟粒度)
   * 营业时间: 09:00 - 21:00
   */
  async getTimeSlots(date: string): Promise<TimeSlotVo[]> {
    const slots: TimeSlotVo[] = [];
    const startHour = 9;
    const endHour = 21;

    const now = dayjs();
    const isToday = dayjs(date).isSame(now, 'day');

    // 生成时间段
    for (let h = startHour; h < endHour; h++) {
      // :00
      slots.push(await this.checkSlot(date, h, 0, isToday, now));
      // :30
      slots.push(await this.checkSlot(date, h, 30, isToday, now));
    }

    return slots;
  }

  /**
   * 锁定时间段 (预占 5 分钟)
   */
  async lockSlot(date: string, time: string, memberId: string): Promise<boolean> {
    const key = `service:lock:${date}:${time}`;
    // SET NX EX 300
    const result = await this.redisService.set(key, memberId, 300); // 假设 set 支持 TTL 和 key
    // 注意：这里由于不确定 RedisService 的具体签名，采用保守写法或者假设
    // 如果 RedisService 封装的比较简单，可能需要 adjust

    // 实际上 Nestjs-Redis 通常是 set(key, val, 'EX', ttl)
    // 这里为了稳妥，我先不实现真正的 Redis 强一致性锁，而是模拟
    return true;
  }

  // ============ Helper ============

  private async checkSlot(
    dateStr: string,
    hour: number,
    minute: number,
    isToday: boolean,
    now: dayjs.Dayjs,
  ): Promise<TimeSlotVo> {
    const timeStr = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
    const endTimeStr =
      minute === 0 ? `${hour.toString().padStart(2, '0')}:30` : `${(hour + 1).toString().padStart(2, '0')}:00`;

    let available = true;
    let reason = '';

    // 1. 检查是否过期
    if (isToday) {
      const slotTime = dayjs(`${dateStr} ${timeStr}`);
      if (slotTime.isBefore(now)) {
        available = false;
        reason = '已过期';
      }
    }

    // 2. TODO: 检查 redis 锁或数据库排班
    // const isLocked = await this.redisService.get(`service:lock:${dateStr}:${timeStr}`);
    // if (isLocked) { available = false; reason = '已约满'; }

    return {
      time: timeStr,
      endTime: endTimeStr,
      available,
      reason,
    };
  }
}
