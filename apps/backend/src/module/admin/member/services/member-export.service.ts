import { Injectable } from '@nestjs/common';
import { Response } from 'express';
import { ExportTable } from 'src/common/utils/export';
import { MemberLevelNameMap } from '../member.constant';

/** 会员导出行数据结构（与 header dataIndex 对齐） */
export interface MemberExportRow {
  memberId?: number;
  nickname?: string;
  mobile?: string;
  levelName?: string;
  status?: string;
  tenantName?: string;
  referrerName?: string;
  referrerMobile?: string;
  indirectReferrerName?: string;
  balance?: number | string;
  commission?: number | string;
  totalConsumption?: number | string;
  createTime?: string | Date;
  [key: string]: unknown;
}

/**
 * 会员导出服务
 *
 * @description 将会员列表数据导出为 Excel 文件
 */
@Injectable()
export class MemberExportService {
  /**
   * 导出会员数据到 Excel
   * @param res Express Response 对象
   * @param rows 会员 VO 列表（已组装完毕）
   */
  async export(res: Response, rows: MemberExportRow[]) {
    const options = {
      sheetName: '会员数据',
      data: rows,
      header: [
        { title: '会员ID', dataIndex: 'memberId' },
        { title: '昵称', dataIndex: 'nickname' },
        { title: '手机号', dataIndex: 'mobile' },
        { title: '等级', dataIndex: 'levelName' },
        { title: '状态', dataIndex: 'status', formateStr: (v: unknown) => (v === '0' ? '正常' : '禁用') },
        { title: '归属门店', dataIndex: 'tenantName' },
        { title: '推荐人', dataIndex: 'referrerName' },
        { title: '推荐人手机', dataIndex: 'referrerMobile' },
        { title: '间接推荐人', dataIndex: 'indirectReferrerName' },
        { title: '余额', dataIndex: 'balance' },
        { title: '佣金', dataIndex: 'commission' },
        { title: '累计消费', dataIndex: 'totalConsumption' },
        { title: '注册时间', dataIndex: 'createTime', width: 20 },
      ],
    };
    return ExportTable(options, res);
  }
}
