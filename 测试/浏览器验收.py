"""使用真实浏览器验收操作、画面和完整救援流程，不修改游戏分数。"""
from pathlib import Path
from playwright.sync_api import sync_playwright
import sys
import time

输出目录 = Path('验收输出')
输出目录.mkdir(exist_ok=True)
完整验收 = '--完整' in sys.argv

with sync_playwright() as 自动化:
    浏览器 = 自动化.chromium.launch(executable_path=r'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe', headless=True)
    页面 = 浏览器.new_page(viewport={'width': 1440, 'height': 960}, device_scale_factor=1, has_touch=True)
    错误 = []
    页面.on('pageerror', lambda 异常: 错误.append(str(异常)))
    页面.goto('http://127.0.0.1:4173', wait_until='networkidle')
    页面.wait_for_function("async () => (await import('/游戏.mjs')).读取状态().已加载")
    页面.wait_for_timeout(800)
    页面.screenshot(path=str(输出目录 / '电脑启程.png'))
    页面.locator('#开始').click()
    页面.wait_for_timeout(900)
    页面.screenshot(path=str(输出目录 / '电脑游戏.png'))

    def 状态():
        return 页面.evaluate("async () => (await import('/游戏.mjs')).读取状态()")

    def 等待落地():
        截止 = time.monotonic() + 10
        while time.monotonic() < 截止:
            if 状态()['阶段'] in ['待机', '完成']:
                return
            页面.wait_for_timeout(60)
        raise AssertionError(f'等待落地超时：{状态()}；错误：{错误}')

    def 穿越(毫秒=None):
        时长 = 状态()['理想蓄力'] if 毫秒 is None else 毫秒
        页面.locator('#画布').focus()
        按下时刻 = time.monotonic()
        页面.keyboard.down('Space')
        assert 状态()['阶段'] == '蓄力', f'按下后未蓄力：{状态()}；错误：{错误}'
        页面.wait_for_timeout(max(1, 时长 - (time.monotonic() - 按下时刻) * 1000))
        页面.keyboard.up('Space')
        assert 状态()['阶段'] == '入洞', f'松开后未入洞：{状态()}；错误：{错误}'
        if 状态()['次数'] == 0 and 毫秒 == 1:
            页面.wait_for_timeout(170)
            页面.screenshot(path=str(输出目录 / '入洞动画.png'))
            页面.wait_for_timeout(450)
            页面.screenshot(path=str(输出目录 / '出洞动画.png'))
        等待落地()

    穿越(1)
    assert 状态()['保护次数'] == 1 and 状态()['分数'] == 0, f'短按后状态：{状态()}；错误：{错误}'
    assert 页面.locator('#对白').is_visible()
    assert 页面.locator('#对白文字').inner_text() == '没关系，慢慢来'
    页面.screenshot(path=str(输出目录 / '落空保护.png'))
    print('通过：过短落点被接住，分数保持0，安慰对白显示，操作恢复', flush=True)
    穿越(1700)
    assert 状态()['保护次数'] == 2 and 状态()['分数'] == 0
    print('通过：过长落点被接住，连续落空不失败', flush=True)
    穿越()
    assert 状态()['分数'] == 2 and 状态()['连击'] == 1
    print('通过：真实空格按压命中中心并加2分', flush=True)

    页面.keyboard.down('Space')
    页面.wait_for_timeout(120)
    页面.locator('#暂停').click()
    页面.keyboard.up('Space')
    assert 状态()['已暂停'] and 状态()['阶段'] == '待机'
    页面.locator('#继续').click()
    assert 状态()['分数'] == 2
    print('通过：蓄力时暂停会取消本次蓄力，继续后分数不变', flush=True)

    if 完整验收:
        for 序号 in range(40):
            if 状态()['目标终点']:
                break
            穿越()
        assert 状态()['分数'] == 299 and 状态()['目标终点'], f'终点尚未抵达：{状态()}'
        页面.screenshot(path=str(输出目录 / '东东终点.png'))
        穿越(1)
        assert 状态()['分数'] == 299 and 状态()['阶段'] == '待机' and 状态()['目标终点']
        print('通过：真实操作抵达299分，终点落空保护不误通关', flush=True)
        穿越()
        assert 状态()['分数'] == 300 and 状态()['阶段'] == '完成'
        assert 页面.locator('#结局层').is_visible()
        页面.screenshot(path=str(输出目录 / '救援成功.png'))
        print('通过：终点成功落地后恰为300分，救援结局显示', flush=True)
        页面.locator('#再玩').click()
        assert 状态()['分数'] == 0 and 状态()['连击'] == 0 and 状态()['保护次数'] == 0
        print('通过：通关重玩清理分数、连击和保护次数', flush=True)

    页面.set_viewport_size({'width': 390, 'height': 844})
    页面.wait_for_timeout(700)
    assert 页面.evaluate('document.documentElement.scrollWidth <= window.innerWidth')
    页面.screenshot(path=str(输出目录 / '手机游戏.png'))
    页面.locator('#暂停').click()
    页面.locator('#重新开始').click()
    页面.wait_for_timeout(700)
    画面 = 页面.locator('#画布').bounding_box()
    页面.mouse.move(画面['x'] + 画面['width'] * .5, 画面['y'] + 画面['height'] * .6)
    时长 = 状态()['理想蓄力']
    页面.mouse.down()
    页面.wait_for_timeout(时长)
    页面.mouse.up()
    等待落地()
    assert 状态()['分数'] == 2
    print('通过：390像素手机布局无横向溢出，鼠标按压可完成穿越', flush=True)

    触摸 = 页面.context.new_cdp_session(页面)
    时长 = 状态()['理想蓄力']
    触摸.send('Input.dispatchTouchEvent', {'type': 'touchStart', 'touchPoints': [{'x': 画面['x'] + 画面['width'] * .5, 'y': 画面['y'] + 画面['height'] * .6}]})
    页面.wait_for_timeout(时长)
    触摸.send('Input.dispatchTouchEvent', {'type': 'touchEnd', 'touchPoints': []})
    等待落地()
    assert 状态()['分数'] == 6
    print('通过：真实触摸长按与松手完成穿越，中心连击加4分', flush=True)
    触摸.send('Input.dispatchTouchEvent', {'type': 'touchStart', 'touchPoints': [{'x': 画面['x'] + 画面['width'] * .5, 'y': 画面['y'] + 画面['height'] * .6}]})
    触摸.send('Input.dispatchTouchEvent', {'type': 'touchCancel', 'touchPoints': []})
    assert 状态()['阶段'] == '待机' and 状态()['分数'] == 6
    页面.evaluate("window.dispatchEvent(new Event('blur'))")
    assert 状态()['已暂停']
    print('通过：触摸取消不发起穿越，窗口失焦自动暂停', flush=True)
    assert not 错误, '\n'.join(错误)
    print('通过：浏览器未捕获脚本异常', flush=True)
    浏览器.close()
