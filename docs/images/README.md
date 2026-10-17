# 文档演示 / Documentation demos

README 中的演示均为实际应用界面的 GIF。中文版本使用中文界面，`.en.gif` 使用完整英文界面；不是对截图改字。GIF 不包含声音 / GIFs have no audio.

| 演示 / Demo | 中文界面 | English interface |
| --- | --- | --- |
| 工具、主题与录屏模式 / Tools, theme, recording mode | `overview.gif` | `overview.en.gif` |
| 逐个选音与和弦识别 / Note selection and chords | `selection.gif` | `selection.en.gif` |
| 琶音与同时弹响 / Arpeggio and chord playback | `playback.gif` | `playback.en.gif` |
| Drop D、自定义调弦与主题 / Tuning and theme | `tuning.gif` | `tuning.en.gif` |
| 系统快捷键切换 / Platform shortcut hints | `shortcuts.gif` | `shortcuts.en.gif` |

## 重新生成 / Regeneration

需要 Chrome、Node.js 24，以及带 Pillow 的 Python。Chrome、Pillow 仅用于开发阶段录制和编码，网页运行不依赖它们。

Requires Chrome, Node.js 24, and Python with Pillow. These capture tools are optional development dependencies; they are not part of the running website.

```sh
node scripts/capture-docs.mjs
```

`CHROME_BIN` 可指定 Chrome 路径，`DOCS_PYTHON` 可指定装有 Pillow 的 Python 路径。`DOCS_LANGUAGE=en` 和 `DOCS_SCENE=selection` 可仅重录指定演示。

Set `CHROME_BIN` to override the Chrome executable and `DOCS_PYTHON` to select the Python interpreter with Pillow. Optionally set `DOCS_LANGUAGE=en` and `DOCS_SCENE=selection` to record one demo.

脚本在独立临时浏览器配置中，通过本地调试连接调用实际应用函数；只在录制服务器的响应中注入入口，不修改 `dist/`，不读取个人浏览器配置。原始帧、时长和校验报告保存在被 Git 忽略的 `tmp/` 下。演示使用固定的 C 大三和弦与 Drop D 示例。

The script uses an isolated temporary Chrome profile and calls the actual application functions over a loopback-only debug connection. The capture-only bridge is injected by its local server; it never changes `dist/` or reads your personal browser profile. Raw frames, timings, and verification results stay in the Git-ignored `tmp/` folder. Examples use a fixed C major fingering and a Drop D voicing.

Pillow 按原始顺序和时长编码这些帧；界面本身为黑白风格，统一灰度调色板防止帧间闪烁，不绘制额外按钮或翻译覆盖层。录制前会检查英文文案、错误、语言切换状态保留及 390/1000 像素布局。录制证据来自离屏 Chromium，不能替代实体设备、Safari、触摸板或音频听测。

Pillow encodes the captured frames in order with their recorded durations. A stable grayscale palette matches the monochrome interface and avoids palette flicker; no extra controls or translated text are painted over the capture. Preflight checks cover English copy, validation, language-switch state preservation, and 390/1000-pixel layouts. Headless Chromium evidence does not replace physical-device, Safari, trackpad, or listening tests.

更新功能后请同步录制两种语言，并检查动图文字可读、动作可辨认、README 引用正确。

After a functional change, update both languages and check legibility, visible actions, and README references.
