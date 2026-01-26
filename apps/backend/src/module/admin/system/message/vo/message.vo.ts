import { ApiProperty } from '@nestjs/swagger';

export class MessageVo {
  @ApiProperty({ description: '消息ID' })
  id: number;

  @ApiProperty({ description: '标题' })
  title: string;

  @ApiProperty({ description: '内容' })
  content?: string;

  @ApiProperty({ description: '类型' })
  type: string;

  @ApiProperty({ description: '接收人ID' })
  receiverId: string;

  @ApiProperty({ description: '是否已读' })
  isRead: boolean;

  @ApiProperty({ description: '创建时间' })
  createTime: Date;
}
