# Guitarfret-note

一个简洁的吉他指板工具，用来探索音符与和弦、演示指法，以及制作干净的录屏画面。原生 JavaScript / Canvas，打开浏览器即可使用，无需注册或安装。

**[在线使用](https://gsflaming.github.io/Guitarfret-note/)** · [备用访问地址](https://fret-note-studio.gsflaming86.workers.dev/) · [快捷键表](docs/SHORTCUTS.md) · [部署说明](docs/DEPLOYMENT.md)

[![Check and publish](https://github.com/GSflaming/Guitarfret-note/actions/workflows/check-and-publish.yml/badge.svg)](https://github.com/GSflaming/Guitarfret-note/actions/workflows/check-and-publish.yml)

## 可以做什么

- 六弦、24 品指板；支持空弦、多音选择与单音试听。
- 根据调弦、实际音高与最低音识别和弦，包括常见延伸和弦与转位。无法匹配时显示音名。
- 同时弹响或按八分音符播放琶音，支持速度和顺序调整。
- 平移、缩放、品位取景、跟随鼠标，以及浅色／深色主题。
- 标准与多种开放调弦、自定义调弦；通过弦／品或音名输入音符。
- 保存场景；录屏模式隐藏工具，让指板保持干净。
- 自动识别 Windows／macOS，显示对应快捷键；也能手动切换提示。

录屏模式仅隐藏工具，不会自行录制视频。声音由浏览器合成拨弦，并非吉他采样。当前版本专注指板演示，不包含 PDF／AI 识谱。

## 开始使用

直接打开上方「在线使用」链接即可，无需下载代码或启动开发服务。

点击右下角白色「工具」按钮，展开九个圆形功能图标。选择「选音」或直接点击指板添加音符，再按空格弹响；再次点击音符可取消。

左侧独立圆点选择空弦，图上从上到下为一弦至六弦。输入 `6:0 5:2 4:2` 表示弦／品，也可输入 `x 3 2 0 1 0` 六弦至一弦的六位指法；音名支持 `C E G` 或带八度的 `E4`。

展开工具后点击「快捷键」，或按 `?` 打开快捷键表。Windows 使用 Ctrl + 滚轮缩放，Mac 使用 ⌘ + 滚轮；触摸板可双指平移和捏合缩放，触屏支持双指操作。系统检测只用于显示按键提示，浏览器识别不准时可在表中切换。

| 功能 | Windows | macOS |
| --- | --- | --- |
| 展开／收起工具 | C | C |
| 同时弹响 | Space 空格 | Space 空格 |
| 琶音 | A | A |
| 进入／退出录屏模式 | P | P |
| 复位位置与大小 | 0 | 0 |
| 快捷键表 | ? | ? |
| 选弦／选品（指板聚焦时） | 方向键 | 方向键 |
| 选中／取消音符（指板聚焦时） | Enter | Return |
| 收起／停止／退出／清空 | Esc | Esc |
| 鼠标缩放 | Ctrl + 滚轮 | ⌘ + 滚轮 |

字母快捷键直接按，不需要 Ctrl 或 ⌘。输入文字、输入法组合输入和系统组合键不会触发播放。更多焦点与 Esc 说明见[完整快捷键表](docs/SHORTCUTS.md)。

## 数据与隐私

音符、调弦、场景与界面设置仅保存在当前浏览器的 localStorage；更换浏览器或域名不会自动迁移。设备系统检测在本机完成，应用不发送乐谱、音符或平台信息，不调用 AI 或其他外部 API。静态托管平台仍会处理正常网页请求。

## 参与贡献

欢迎[反馈问题或提出建议](https://github.com/GSflaming/Guitarfret-note/issues)，也欢迎改进音乐理论、交互、无障碍体验和文档。

提交 Issue 或 Pull Request 前，请阅读[贡献指南](CONTRIBUTING.md)。其中说明了项目范围、开发环境、提交要求、测试方法与审核流程。普通用户直接使用在线工具即可。

需要自己部署时，请参考[部署说明](docs/DEPLOYMENT.md)。代码采用 [MIT](LICENSE) 许可证。
