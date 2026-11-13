import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
const 根目录 = path.resolve('dist');
const 类型 = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.png': 'image/png', '.svg': 'image/svg+xml' };
const 服务 = http.createServer(async (请求, 响应) => {
  try {
    const 地址 = new URL(请求.url, 'http://localhost');
    const 相对 = decodeURIComponent(地址.pathname).replace(/^\/+/, '') || 'index.html';
    const 文件 = path.resolve(根目录, 相对);
    if (!文件.startsWith(根目录 + path.sep) || !(await stat(文件)).isFile()) throw new Error('未找到文件');
    响应.writeHead(200, { 'Content-Type': 类型[path.extname(文件)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    响应.end(请求.method === 'HEAD' ? undefined : await readFile(文件));
  } catch { 响应.writeHead(404);响应.end('未找到页面'); }
});
服务.listen(4173, '127.0.0.1', () => console.log('本地游戏已就绪：http://127.0.0.1:4173'));
