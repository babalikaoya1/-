import { 旅程, 限制, 距离蓄力 } from './规则.mjs';

const 元素 = 名 => document.getElementById(名);
const 画布 = 元素('画布');
const 画笔 = 画布.getContext('2d');
const 图片 = {};
const 素材表 = { 待机: '无限与小黑-待机', 施法: '无限与小黑-施法', 东东: '东东', 结局: '救援成功' };
let 游戏 = new 旅程();
let 阶段 = '封面';
let 已暂停 = false;
let 语音开启 = true;
let 已加载 = false;
let 动画时间 = 0;
let 蓄力开始 = 0;
let 蓄力毫秒 = 0;
let 活跃输入 = null;
let 穿越 = null;
let 上次时间 = performance.now();
let 对白剩余 = 0;
let 得分剩余 = 0;
let 逻辑高 = 900;
let 比例 = 1;
let 镜头 = { 横: -360, 纵: -570 };
const 缓动 = 值 => 1 - Math.pow(1 - 限制(值, 0, 1), 3);
const 插值 = (始, 末, 进度) => 始 + (末 - 始) * 进度;

function 调整尺寸() {
  const 尺寸 = 画布.getBoundingClientRect();
  比例 = 尺寸.width / 720;
  逻辑高 = 尺寸.height / 比例;
  const 像素比 = Math.min(window.devicePixelRatio || 1, 2);
  画布.width = Math.round(尺寸.width * 像素比);
  画布.height = Math.round(尺寸.height * 像素比);
  画笔.setTransform(像素比 * 比例, 0, 0, 像素比 * 比例, 0, 0);
}
new ResizeObserver(调整尺寸).observe(画布);

function 设置阶段(值) {
  阶段 = 值;
  元素('游戏框').dataset.阶段 = 值;
}
function 更新界面() {
  元素('分数').textContent = 游戏.分数;
  元素('进度').style.width = `${游戏.分数 / 3}%`;
  元素('连击').textContent = 游戏.连击 ? `连续 ${游戏.连击} 次正中 · 下一次 +${(游戏.连击 + 1) * 2}` : '每一步，都离东东更近';
  元素('旅途标签').textContent = 游戏.分数 >= 299 ? '东东就在眼前' : '东东在终点等你';
}
function 提示(文字, 时长 = 2100) {
  元素('得分提示').textContent = 文字;
  元素('得分提示').classList.add('显示');
  得分剩余 = 时长;
}
function 安慰() {
  对白剩余 = 3000;
  元素('对白').hidden = false;
  if (语音开启 && 'speechSynthesis' in window) {
    try {
      speechSynthesis.cancel();
      const 话语 = new SpeechSynthesisUtterance('没关系，慢慢来');
      话语.lang = 'zh-CN';
      话语.rate = 0.85;
      话语.volume = 0.75;
      const 中文声音 = speechSynthesis.getVoices().find(声音 => /^zh[-_]CN/i.test(声音.lang));
      if (中文声音) 话语.voice = 中文声音;
      speechSynthesis.speak(话语);
    } catch { /* 浏览器无可用语音时保留文字对白。 */ }
  }
}
function 重置() {
  if (!已加载) return;
  游戏 = new 旅程();
  已暂停 = false;
  穿越 = null;
  活跃输入 = null;
  蓄力毫秒 = 0;
  动画时间 = 0;
  对白剩余 = 0;
  得分剩余 = 0;
  元素('对白').hidden = true;
  元素('得分提示').classList.remove('显示');
  元素('启程面板').hidden = true;
  元素('暂停层').hidden = true;
  元素('结局层').hidden = true;
  元素('操作提示').hidden = false;
  元素('暂停').disabled = false;
  元素('蓄力填充').style.width = '0%';
  元素('操作文字').innerHTML = '按住蓄力 <span>·</span> 松手穿越';
  设置阶段('待机');
  更新界面();
  提示('带上小黑，去找东东', 2200);
  画布.focus({ preventScroll: true });
}
function 开始蓄力(输入) {
  if (阶段 !== '待机' || 已暂停 || 活跃输入 !== null) return;
  活跃输入 = 输入;
  蓄力开始 = performance.now();
  蓄力毫秒 = 0;
  设置阶段('蓄力');
  元素('操作文字').textContent = '松开，打开黑洞';
}
function 取消蓄力() {
  if (阶段 === '蓄力') 设置阶段('待机');
  活跃输入 = null;
  蓄力毫秒 = 0;
  元素('蓄力填充').style.width = '0%';
  元素('操作文字').innerHTML = '按住蓄力 <span>·</span> 松手穿越';
}
function 松开蓄力(输入) {
  if (阶段 !== '蓄力' || 已暂停 || 活跃输入 !== 输入) return;
  穿越 = 游戏.准备穿越(performance.now() - 蓄力开始);
  活跃输入 = null;
  if (!穿越) return;
  动画时间 = 0;
  设置阶段('入洞');
  元素('操作文字').textContent = '穿过黑洞，去往下一站';
  元素('蓄力填充').style.width = '0%';
  得分剩余 = 0;
  元素('得分提示').classList.remove('显示');
}
function 暂停游戏() {
  if (['封面', '完成'].includes(阶段) || 已暂停) return;
  取消蓄力();
  已暂停 = true;
  元素('暂停层').hidden = false;
  if ('speechSynthesis' in window) speechSynthesis.cancel();
  元素('继续').focus({ preventScroll: true });
}
function 继续游戏() {
  已暂停 = false;
  元素('暂停层').hidden = true;
  画布.focus({ preventScroll: true });
}
元素('开始').addEventListener('click', 重置);
元素('重新开始').addEventListener('click', 重置);
元素('再玩').addEventListener('click', 重置);
元素('暂停').addEventListener('click', 暂停游戏);
元素('继续').addEventListener('click', 继续游戏);
元素('声音').addEventListener('click', () => {
  语音开启 = !语音开启;
  元素('声音').classList.toggle('静音', !语音开启);
  元素('声音').setAttribute('aria-label', 语音开启 ? '关闭语音' : '开启语音');
  元素('声音').title = 语音开启 ? '关闭语音' : '开启语音';
  if (!语音开启 && 'speechSynthesis' in window) speechSynthesis.cancel();
});
画布.addEventListener('pointerdown', 事件 => {
  if (!事件.isPrimary || 事件.button !== 0) return;
  事件.preventDefault();
  画布.focus({ preventScroll: true });
  开始蓄力(事件.pointerId);
  if (活跃输入 === 事件.pointerId) 画布.setPointerCapture(事件.pointerId);
});
画布.addEventListener('pointerup', 事件 => 松开蓄力(事件.pointerId));
画布.addEventListener('pointercancel', 事件 => { if (活跃输入 === 事件.pointerId) 取消蓄力(); });
画布.addEventListener('lostpointercapture', 事件 => { if (活跃输入 === 事件.pointerId) 取消蓄力(); });
画布.addEventListener('contextmenu', 事件 => 事件.preventDefault());
window.addEventListener('keydown', 事件 => {
  if (事件.code === 'Escape') { if (已暂停) 继续游戏(); else 暂停游戏(); }
  if (事件.code !== 'Space' || 事件.target.closest?.('button,a,input,textarea')) return;
  事件.preventDefault();
  if (!事件.repeat) 开始蓄力('键盘');
});
window.addEventListener('keyup', 事件 => { if (事件.code === 'Space') 松开蓄力('键盘'); });
window.addEventListener('blur', 暂停游戏);
document.addEventListener('visibilitychange', () => { if (document.hidden) 暂停游戏(); });

function 椭圆(横, 纵, 半宽, 半高, 颜色) {
  画笔.beginPath();
  画笔.ellipse(横, 纵, Math.max(0.1, 半宽), Math.max(0.1, 半高), 0, 0, Math.PI * 2);
  if (颜色) { 画笔.fillStyle = 颜色; 画笔.fill(); }
}
function 顶面路径(平台, 横, 纵, 缩放 = 1) {
  const 宽 = 平台.半宽 * 缩放, 深 = 平台.半深 * 缩放;
  画笔.beginPath();
  if (平台.形状 === '方') {
    画笔.moveTo(横, 纵 - 深);画笔.lineTo(横 + 宽, 纵);画笔.lineTo(横, 纵 + 深);画笔.lineTo(横 - 宽, 纵);画笔.closePath();
  } else 画笔.ellipse(横, 纵, 宽, 深, 0, 0, Math.PI * 2);
}
function 绘制背景(时间) {
  const 渐变 = 画笔.createLinearGradient(0, 0, 720, 逻辑高);
  渐变.addColorStop(0, '#edf2e7');渐变.addColorStop(0.48, '#dfe9d7');渐变.addColorStop(1, '#e9eddf');
  画笔.fillStyle = 渐变;画笔.fillRect(0, 0, 720, 逻辑高);
  画笔.save();
  画笔.globalAlpha = 0.32;
  for (let 序号 = 0; 序号 < 7; 序号++) {
    const 横 = (序号 * 137 + Math.sin(时间 / 5000 + 序号) * 15) % 850 - 60;
    const 纵 = (序号 * 219 + 140) % 逻辑高;
    椭圆(横, 纵, 140 + 序号 * 5, 18, '#f9fbf1');
  }
  画笔.globalAlpha = 0.18;
  画笔.strokeStyle = '#7e9c70';画笔.lineWidth = 1;
  for (let 序号 = 0; 序号 < 18; 序号++) {
    const 横 = (序号 * 197 + 53) % 720;
    const 纵 = (序号 * 271 + 时间 / 160) % (逻辑高 + 30);
    画笔.beginPath();画笔.moveTo(横, 纵);画笔.quadraticCurveTo(横 + 9, 纵 - 9, 横 + 15, 纵 - 3);画笔.stroke();
  }
  画笔.restore();
}
function 绘制延伸(平台, 点, 进度 = 1) {
  const 末 = { 横: 插值(平台.横, 点.横, 进度), 纵: 插值(平台.纵, 点.纵, 进度) };
  画笔.save();画笔.lineCap = 'round';
  for (const [偏移, 粗细, 色] of [[22, 66, '#647c69'], [0, 66, '#9dad8c'], [-3, 48, '#bac9a4']]) {
    画笔.beginPath();画笔.moveTo(平台.横, 平台.纵 + 偏移);画笔.lineTo(末.横, 末.纵 + 偏移);
    画笔.strokeStyle = 色;画笔.lineWidth = 粗细;画笔.stroke();
  }
  椭圆(末.横, 末.纵 + 1, 34, 15, '#d0d8b8');
  if (进度 < 1) {
    椭圆(末.横, 末.纵, 33, 12, '#192a29');
    画笔.strokeStyle = '#728579';画笔.lineWidth = 2;画笔.stroke();
  }
  画笔.restore();
}
function 绘制平台(平台, 透明度 = 1) {
  画笔.save();画笔.globalAlpha = 透明度;
  const 横 = 平台.横, 纵 = 平台.纵, 宽 = 平台.半宽, 深 = 平台.半深, 高 = 平台.高度;
  椭圆(横 - 24, 纵 + 高 + 17, 宽 * 1.15, 深 * 0.8, '#506b5119');
  for (const 点 of 平台.延伸 || []) 绘制延伸(平台, 点);
  const 侧渐变 = 画笔.createLinearGradient(横 - 宽, 纵, 横 + 宽, 纵);
  侧渐变.addColorStop(0, '#849b7b');侧渐变.addColorStop(.55, '#b3c1a1');侧渐变.addColorStop(1, '#8da582');
  画笔.fillStyle = 侧渐变;
  if (平台.形状 === '方') {
    画笔.beginPath();画笔.moveTo(横 - 宽, 纵);画笔.lineTo(横, 纵 + 深);画笔.lineTo(横 + 宽, 纵);画笔.lineTo(横 + 宽, 纵 + 高);画笔.lineTo(横, 纵 + 深 + 高);画笔.lineTo(横 - 宽, 纵 + 高);画笔.closePath();画笔.fill();
    画笔.fillStyle = '#6c88685c';画笔.beginPath();画笔.moveTo(横, 纵 + 深);画笔.lineTo(横 + 宽, 纵);画笔.lineTo(横 + 宽, 纵 + 高);画笔.lineTo(横, 纵 + 深 + 高);画笔.fill();
  } else {
    画笔.beginPath();画笔.ellipse(横, 纵 + 高, 宽, 深, 0, 0, Math.PI);画笔.lineTo(横 - 宽, 纵);画笔.ellipse(横, 纵, 宽, 深, 0, Math.PI, Math.PI * 2);画笔.closePath();画笔.fill();
  }
  顶面路径(平台, 横, 纵);画笔.fillStyle = 平台.终点 ? '#efe9c4' : ['#cedbb5','#dce4cc','#c2d2ac'][平台.序号 % 3];画笔.fill();
  顶面路径(平台, 横, 纵 - 1, .91);画笔.strokeStyle = 平台.终点 ? '#bbab6c88' : '#f6f9e999';画笔.lineWidth = 1.5;画笔.stroke();
  if (平台.终点) {
    绘制图片('东东', 横 + 6, 纵 + 10, 90, false);
    画笔.fillStyle = '#77855d';画笔.font = '14px "Microsoft YaHei"';画笔.textAlign = 'center';画笔.fillText('东东', 横, 纵 - 82);
    画笔.font = '10px "Microsoft YaHei"';画笔.fillStyle = '#89926b';画笔.fillText('终 点', 横, 纵 + 深 + 高 - 15);
  } else {
    椭圆(横, 纵, 15, 7, '#a2ba8766');
    画笔.strokeStyle = '#789464';画笔.lineWidth = 1.3;画笔.beginPath();画笔.moveTo(横 - 4, 纵 + 3);画笔.quadraticCurveTo(横 - 5, 纵 - 8, 横 + 8, 纵 - 7);画笔.quadraticCurveTo(横 + 7, 纵 + 1, 横 - 4, 纵 + 3);画笔.stroke();
  }
  画笔.restore();
}
function 绘制图片(名称, 横, 脚底, 高度, 反向 = false, 压缩 = 1) {
  const 图 = 图片[名称];if (!图) return;
  const 宽度 = 高度 * 图.naturalWidth / 图.naturalHeight;
  const 锚点 = 名称 === '东东' ? [.5, .80] : 名称 === '施法' ? [.48, .986] : [.44, .986];
  画笔.save();画笔.translate(横, 脚底);画笔.scale(反向 ? -1 : 1, 压缩);
  画笔.drawImage(图, -宽度 * 锚点[0], -高度 * 锚点[1], 宽度, 高度);画笔.restore();
}
function 绘制黑洞(点, 缩放 = 1, 时刻 = 0) {
  画笔.save();
  椭圆(点.横, 点.纵, 48 * 缩放, 16 * 缩放, '#25393422');
  椭圆(点.横, 点.纵, 41 * 缩放, 12 * 缩放, '#0b1114');
  画笔.strokeStyle = '#536b6466';画笔.lineWidth = 2;画笔.stroke();
  画笔.strokeStyle = '#9fb29b80';画笔.lineWidth = 1;
  画笔.beginPath();画笔.ellipse(点.横, 点.纵, 46 * 缩放, 15 * 缩放, 0, 时刻 / 200, 时刻 / 200 + 1.3);画笔.stroke();
  画笔.restore();
}
function 绘制场景(时间, 帧间隔) {
  绘制背景(时间);
  let 关注 = 游戏.位置;
  if (穿越 && ['出洞', '落地'].includes(阶段)) 关注 = 穿越.落点;
  const 目标镜头 = { 横: (关注.横 + 游戏.目标.横) / 2 - 360, 纵: Math.max(关注.纵, 游戏.目标.纵) - 逻辑高 * (阶段 === '封面' ? .52 : .68) };
  const 跟随 = 1 - Math.exp(-帧间隔 / (阶段 === '出洞' ? 160 : 240));
  镜头.横 = 插值(镜头.横, 目标镜头.横, 跟随);镜头.纵 = 插值(镜头.纵, 目标镜头.纵, 跟随);
  画笔.save();画笔.translate(-镜头.横, -镜头.纵);
  const 平台集 = [...游戏.平台];if (!平台集.includes(游戏.目标)) 平台集.push(游戏.目标);
  平台集.sort((甲, 乙) => 甲.纵 - 乙.纵);
  for (const 平台 of 平台集) 绘制平台(平台, 平台 === 游戏.当前 || 平台 === 游戏.目标 ? 1 : .5);
  if (阶段 === '出洞' && 穿越.判定 === '保护') 绘制延伸(穿越.平台, 穿越.落点, 缓动(动画时间 / 400));
  if (阶段 === '落地' && 穿越.判定 === '保护') 绘制延伸(穿越.平台, 穿越.落点);
  const 反向 = 游戏.目标.横 > 游戏.位置.横;
  const 人高 = 205;
  if (阶段 === '入洞') {
    const 进度 = 限制(动画时间 / 440, 0, 1);
    绘制黑洞(穿越.起点, 缓动(进度 * 4), 时间);
    画笔.save();画笔.beginPath();画笔.rect(穿越.起点.横 - 150, 穿越.起点.纵 - 300, 300, 300);画笔.clip();
    绘制图片('施法', 穿越.起点.横, 穿越.起点.纵 + 缓动(Math.max(0, 进度 - .15) / .85) * 220, 人高, 反向);
    画笔.restore();
  } else if (阶段 === '出洞') {
    const 进度 = 限制(动画时间 / 700, 0, 1);
    const 洞口 = { 横: 穿越.落点.横, 纵: 穿越.落点.纵 - 245 };
    绘制黑洞(洞口, Math.min(1, 进度 * 7) * (进度 > .82 ? (1 - 进度) / .18 : 1), 时间);
    const 下落 = Math.pow(进度, .85) * 245;
    画笔.save();画笔.beginPath();画笔.rect(洞口.横 - 180, 洞口.纵, 360, 350);画笔.clip();
    绘制图片(穿越.判定 === '保护' ? '施法' : '待机', 洞口.横, 洞口.纵 + 下落, 人高, 反向);画笔.restore();
  } else if (阶段 === '落地') {
    绘制图片(穿越.判定 === '保护' ? '施法' : '待机', 穿越.落点.横, 穿越.落点.纵, 人高, 反向, 1 - Math.sin(限制(动画时间 / 300, 0, 1) * Math.PI) * .05);
  } else {
    椭圆(游戏.位置.横, 游戏.位置.纵 + 1, 25, 9, '#4d694b24');
    绘制图片(阶段 === '蓄力' ? '施法' : '待机', 游戏.位置.横, 游戏.位置.纵, 人高, 反向, 阶段 === '蓄力' ? 1 - Math.min(蓄力毫秒 / 1600, 1) * .035 : 1);
    if (阶段 === '蓄力') {
      画笔.strokeStyle = '#476d4990';画笔.lineWidth = 2;画笔.beginPath();画笔.ellipse(游戏.位置.横, 游戏.位置.纵 + 2, 36, 14, 0, -Math.PI / 2, -Math.PI / 2 + 限制(蓄力毫秒 / 1600, 0, 1) * Math.PI * 2);画笔.stroke();
    }
  }
  画笔.restore();
}
function 更新动画(间隔, 当前时间) {
  if (阶段 === '蓄力') {
    蓄力毫秒 = Math.min(1600, 当前时间 - 蓄力开始);
    元素('蓄力填充').style.width = `${蓄力毫秒 / 16}%`;
  }
  if (['入洞', '出洞', '落地'].includes(阶段)) 动画时间 += 间隔;
  if (阶段 === '入洞' && 动画时间 >= 440) {
    动画时间 = 0;设置阶段('出洞');
    if (穿越.判定 === '保护') 安慰();
  } else if (阶段 === '出洞' && 动画时间 >= 700) {
    动画时间 = 0;设置阶段('落地');
  } else if (阶段 === '落地' && 动画时间 >= 300) {
    const 之前分数 = 游戏.分数;
    const 结果 = 游戏.完成穿越();
    更新界面();穿越 = null;
    if (结果.完成) {
      设置阶段('完成');元素('结局层').hidden = false;元素('操作提示').hidden = true;
      元素('对白').hidden = true;元素('暂停').disabled = true;元素('再玩').focus({ preventScroll: true });
    } else {
      设置阶段('待机');
      元素('操作文字').innerHTML = 游戏.目标.终点 ? '东东就在前面 <span>·</span> 再试一次' : '按住蓄力 <span>·</span> 松手穿越';
      if (结果.判定 !== '保护') 提示(结果.判定 === '中心' ? `正中中心  +${结果.增加}` : `稳稳落地  +${结果.增加}`);
      if (之前分数 < 299 && 游戏.分数 === 299) 提示('找到东东了，再向前一步', 3500);
    }
  }
  if (对白剩余 > 0) { 对白剩余 -= 间隔; if (对白剩余 <= 0) 元素('对白').hidden = true; }
  if (得分剩余 > 0) { 得分剩余 -= 间隔; if (得分剩余 <= 0) 元素('得分提示').classList.remove('显示'); }
}
function 循环(时间) {
  const 间隔 = Math.min(时间 - 上次时间, 50);上次时间 = 时间;
  if (!已暂停) { 更新动画(间隔, 时间);绘制场景(时间, 间隔); }
  requestAnimationFrame(循环);
}
调整尺寸();requestAnimationFrame(循环);
Promise.all(Object.entries(素材表).map(([名称, 文件]) => new Promise((成功, 失败) => {
  const 图 = new Image();图.onload = () => { 图片[名称] = 图;成功(); };图.onerror = 失败;图.src = `人物/${文件}.png`;
}))).then(() => {
  已加载 = true;元素('开始').disabled = false;元素('开始').innerHTML = '和他们一起出发 <span>↗</span>';
}).catch(() => { 元素('加载错误').hidden = false;元素('开始').textContent = '素材未加载，请刷新重试'; });

// 只读快照用于验收，不提供改分或跳过动画的接口。
export function 读取状态() {
  return { 阶段, 已暂停, 已加载, 分数: 游戏.分数, 连击: 游戏.连击, 次数: 游戏.次数, 保护次数: 游戏.保护次数, 目标终点: !!游戏.目标.终点, 判定: 穿越?.判定 ?? null, 理想蓄力: 距离蓄力(Math.hypot(游戏.目标.横 - 游戏.位置.横, 游戏.目标.纵 - 游戏.位置.纵)) };
}
