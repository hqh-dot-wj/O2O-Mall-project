/**
 * 缓存的 key 枚举
 */
export enum CacheEnum {
  /** 登录用户 redis key */
  LOGIN_TOKEN_KEY = 'login_tokens:',

  /** 验证码 redis key */
  CAPTCHA_CODE_KEY = 'captcha_codes:',

  /** 参数管理 cache key */
  SYS_CONFIG_KEY = 'sys_config:',

  /** 字典管理 cache key */
  SYS_DICT_KEY = 'sys_dict:',

  /** 防重提交 redis key */
  REPEAT_SUBMIT_KEY = 'repeat_submit:',

  /** 限流 redis key */
  RATE_LIMIT_KEY = 'rate_limit:',

  /** 登录账户密码错误次数 redis key */
  PWD_ERR_CNT_KEY = 'pwd_err_cnt:',

  /** 公众号类型 */
  GZ_TYPE = 'gz_type:',

  /** 微信code存储 */
  MA_CODE = 'ma_code:',

  /** 用户缓存 */
  SYS_USER_KEY = 'user:',

  /** 部门缓存 */
  SYS_DEPT_KEY = 'sys_dept:',

  /** 菜单缓存 */
  SYS_MENU_KEY = 'sys_menu:',

  /** 微信Access Token缓存 */
  WECHAT_ACCESS_TOKEN_KEY = 'wechat_token:',

  /** 钱包缓存 */
  FIN_WALLET_KEY = 'fin_wallet:',

  /** 商品分类树缓存 */
  PMS_CATEGORY_TREE = 'pms:category:tree',

  /** 属性模板缓存 */
  PMS_ATTRIBUTE_TEMPLATE = 'pms:attribute:template',
}
