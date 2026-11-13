export const 限制 = (值, 最小, 最大) => Math.max(最小, Math.min(最大, 值));
export const 蓄力距离 = 毫秒 => 24 + 限制(毫秒, 0, 1600) / 1600 * 440;
export const 距离蓄力 = 距离 => 限制((距离 - 24) / 440 * 1600, 0, 1600);

export function 判定落点(平台, 点) {
  const 横 = Math.abs(点.横 - 平台.横) / 平台.半宽;
  const 纵 = Math.abs(点.纵 - 平台.纵) / 平台.半深;
  const 偏离 = 平台.形状 === '方' ? 横 + 纵 : Math.hypot(横, 纵);
  return 偏离 > 1 ? '保护' : 偏离 <= 0.25 ? '中心' : '普通';
}

export function 结算(分数, 连击, 落点, 终点 = false) {
  if (落点 === '保护') return { 分数, 连击: 0, 增加: 0, 完成: false };
  if (终点) return { 分数: 300, 连击: 0, 增加: 300 - 分数, 完成: true };
  const 新连击 = 落点 === '中心' ? 连击 + 1 : 0;
  const 新分数 = Math.min(299, 分数 + (新连击 ? 新连击 * 2 : 1));
  return { 分数: 新分数, 连击: 新连击, 增加: 新分数 - 分数, 完成: false };
}

export class 旅程 {
  constructor(随机 = Math.random) {
    this.随机 = 随机;
    this.分数 = 0;
    this.连击 = 0;
    this.次数 = 0;
    this.保护次数 = 0;
    this.完成 = false;
    this.位置 = { 横: 0, 纵: 0 };
    this.当前 = { 横: 0, 纵: 0, 半宽: 78, 半深: 38, 高度: 54, 形状: '圆', 序号: 0, 延伸: [] };
    this.平台 = [this.当前];
    this.目标 = this.下一平台();
    this.待结算 = null;
  }
  下一平台() {
    const 序号 = this.次数 + 1;
    const 终点 = this.分数 === 299;
    const 方向 = this.随机() > 0.5 ? 1 : -1;
    return {
      横: this.位置.横 + 方向 * (135 + this.随机() * 65),
      纵: this.位置.纵 - (140 + this.随机() * 40),
      半宽: 终点 ? 88 : 67 + this.随机() * 9,
      半深: 终点 ? 42 : 32 + this.随机() * 4,
      高度: 48 + 序号 % 3 * 8,
      形状: 终点 || 序号 % 3 !== 1 ? '圆' : '方',
      序号, 终点, 延伸: [],
    };
  }
  准备穿越(毫秒) {
    if (this.完成 || this.待结算) return null;
    const 横 = this.目标.横 - this.位置.横;
    const 纵 = this.目标.纵 - this.位置.纵;
    const 距离 = Math.hypot(横, 纵) || 1;
    const 长度 = 蓄力距离(毫秒);
    const 落点 = { 横: this.位置.横 + 横 / 距离 * 长度, 纵: this.位置.纵 + 纵 / 距离 * 长度 };
    this.待结算 = {
      起点: { ...this.位置 }, 落点, 平台: this.目标,
      判定: 判定落点(this.目标, 落点),
    };
    return this.待结算;
  }
  完成穿越() {
    if (!this.待结算) return null;
    const 本次 = this.待结算;
    const 结果 = 结算(this.分数, this.连击, 本次.判定, 本次.平台.终点);
    Object.assign(this, { 分数: 结果.分数, 连击: 结果.连击, 完成: 结果.完成 });
    this.位置 = { ...本次.落点 };
    this.当前 = 本次.平台;
    this.次数++;
    if (本次.判定 === '保护') {
      this.保护次数++;
      this.当前.延伸.push({ ...本次.落点 });
    }
    if (!this.平台.includes(this.当前)) this.平台.push(this.当前);
    this.平台 = this.平台.slice(-4);
    if (!this.完成 && !(本次.平台.终点 && 本次.判定 === '保护')) this.目标 = this.下一平台();
    this.待结算 = null;
    return { ...结果, 判定: 本次.判定 };
  }
}
