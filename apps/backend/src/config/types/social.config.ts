import { IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * GitHub OAuth 配置
 */
export class GitHubOAuthConfig {
  @IsString()
  @IsOptional()
  clientId?: string;

  @IsString()
  @IsOptional()
  clientSecret?: string;
}

/**
 * 社交登录配置
 */
export class SocialConfig {
  @ValidateNested()
  @Type(() => GitHubOAuthConfig)
  @IsOptional()
  github?: GitHubOAuthConfig;
}
