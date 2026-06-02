# 自定义需求

以下需求是在上游 janhq/jan 基础之上的定制，依赖上游代码实现。LLM 维护时应直接阅读代码理解实现方式。

---

## 模型展示名称

Provider API 返回的模型列表，有好看的人类可读名称。应该用这个名称展示，而不是裸 ID。

## 模型能力自动识别

自定义 Provider 的 API 会返回每个模型是否支持推理、工具调用、文件附件、温度调节。添加模型到 Provider 时，应该根据这些 API 返回值自动勾选对应的能力，不需要用户手动选择。

如果 API 没有返回这些信息（比如标准 OpenAI 兼容 API），则保持原有行为，不受影响。

## 完整 API 数据保留

API 返回的模型信息远不止 ID 和能力标记（还有模型家族、模态、成本、上下文长度等）。这些数据统一存起来，后续做上下文记录等功能时会用到。

`providerMetadata` 现在存储原始 API 响应（而非截断后的 `ProviderModelInfo`），可直接读取 `limit.context`、`cost.input/output` 等字段。

不要为了存这些数据而让现有模型类型膨胀，用独立字段存放即可。

## 远程 Provider 删除全部模型

Provider 设置页的模型列表头部，本地 Provider 有「删除全部模型」入口，但远程 API Provider 没有。需要为远程 Provider 也加上。

## Token 计数器

### 对所有 Provider 可见

Token 计数器不再限制为 llamacpp 专属。远程 API 模型也显示，上下文长度优先从 `providerMetadata.limit.context` 取（API 返回的原始数据），未配置时回退到模型设置的 `ctx_len`。

### 费用显示

剩余（Remaining）下方增加费用行，格式 `$0.00`。单价从 `providerMetadata.cost` 取（每百万 token 价格），价格为 0 也显示。

### 紧凑模式开关

设置 > 外观页面，在「显示 Token 速度」下方有「紧凑令牌计数器」开关。默认开启（输入框内显示），关闭后显示在输入框下方。

## 移除 Chrome 浏览器按钮

输入栏的 Jan Browser MCP Chrome 图标按钮及其关联逻辑全部移除，用不到。

## 分支策略

`main` 分支纯同步上游 janhq/jan，不做任何修改。
`custom` 分支承载所有定制。同步上游流程：`main` merge upstream → `custom` merge main。

开发、构建、提交都在 `custom` 分支上进行。

---

## I18N 全面中文化

所有用户可见文本必须使用 `useTranslation` 的 `t()` 调用，不得硬编码英文字符串。locale 文件位于 `web-app/src/locales/`。

### locale 文件

- `en/` — 基准文件，key 只能在此新增
- `zh-CN/` — 简体中文翻译，value 必须为简体中文
- `zh-TW/` — 繁体中文翻译，value 必须为繁体中文

### 翻译原则

- 技术术语不翻译：Claude Code、MCP、JSON、CLI、Token（LLM上下文）、GPU、Vulkan、Top-K
- 专有名词不翻译：GitHub、Discord、Jan（产品名）、Swagger、API
- 能力标签可翻译：Vision→视觉、Audio→音频、Reasoning→推理、Tools→工具、Web Search→网页搜索
- TokenCounter 中 Prompt→输入、Completion→输出、Used→已用、Remaining→剩余、Context Window→上下文窗口、Cost→费用
- Sampling 弹窗辅助文案：Sampling→采样参数、Reset all→全部重置、Add parameter→添加参数
- 参数区域：No overrides→无自定义覆盖、Not supported→不支持、Available Tools→可用工具
- 占位符示例值（如 `http://proxy.example.com:8080`）不翻译

### 修改 locale 文件注意事项

- JSON locale 文件的编辑使用 `edit` 工具时，`oldString` **不得包含父级闭合括号 `}`**，否则会意外吞掉后续 key 导致整段丢失
- 每次编辑 locale JSON 后**必须**运行 `python3 -c "import json; json.load(open(file))"` 验证语法完整性
- 大型 JSON 编辑更安全的方式是读取 → 修改内存 → 用 `write` 工具写回完整文件，而不是用 `edit` 做局部替换

---

## 自动检查更新

默认关闭。上游开启，定制版改为 `autoUpdateCheck: false`。

## 消息正文段落间距

`markdown.css` 中 `.markdown p` 的段落间距从 `1em` 降为 `0.5em`，让空行更紧凑。

## macOS 禁用双指缩放

WKWebView 原生手势会缩放整个 UI，通过拦截 `gesturestart` 事件和 `touch-action: pan-x pan-y` CSS 禁用。

## 构建

### ARM-only 构建

本地开发环境为 Apple Silicon，只需构建 ARM 版本：

```
yarn tauri build --target aarch64-apple-darwin
```

### 构建后不打开 DMG

构建流程自身会处理打开操作。不要用 `open` 命令打开 DMG，除非用户要求。

### 构建时间

Vite 构建时注入 `BUILD_TIME` 全局常量（格式 `ISO 时间，截取前 19 位`），在「通用 → 应用版本」行显示为 `v{version} ({BUILD_TIME})`。
