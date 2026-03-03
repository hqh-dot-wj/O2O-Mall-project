import { Type } from 'class-transformer';
import { IsBoolean, IsIn, IsNumber, IsOptional, IsString, IsUrl, Max, Min, ValidateNested } from 'class-validator';

/**
 * IP 地理位置查询配置
 */
export class IpLocationConfig {
  @IsUrl({ require_tld: false })
  apiUrl: string;

  @IsNumber()
  @Min(1000)
  @Max(30000)
  timeout: number;

  @IsNumber()
  @Min(60)
  @Max(86400)
  cacheTtl: number;
}

/**
 * 日志配置
 */
export class LoggerConfig {
  @IsString()
  dir: string;

  @IsIn(['fatal', 'error', 'warn', 'info', 'debug', 'trace'])
  level: string;

  @IsBoolean()
  prettyPrint: boolean;

  @IsBoolean()
  toFile: boolean;

  @IsString({ each: true })
  excludePaths: string[];

  @IsString({ each: true })
  sensitiveFields: string[];
}

/**
 * 文件上传配置
 */
export class FileConfig {
  @IsBoolean()
  isLocal: boolean;

  @IsString()
  location: string;

  @IsUrl({ require_tld: false })
  domain: string;

  @IsString()
  serveRoot: string;

  @IsNumber()
  @Min(1)
  @Max(200)
  maxSize: number;

  @IsBoolean()
  thumbnailEnabled: boolean;
}

/**
 * 应用配置
 */
export class AppConfig {
  @IsIn(['development', 'test', 'production'])
  env: string;

  @IsString()
  prefix: string;

  @IsNumber()
  @Min(1)
  @Max(65535)
  port: number;

  @ValidateNested()
  @Type(() => LoggerConfig)
  logger: LoggerConfig;

  @ValidateNested()
  @Type(() => FileConfig)
  file: FileConfig;

  @ValidateNested()
  @Type(() => IpLocationConfig)
  @IsOptional()
  ipLocation?: IpLocationConfig;
}
