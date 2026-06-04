# 自定义需求

以下内容记录 custom 分支的定制状态。LLM 维护时应直接阅读代码确认实现方式。

---

## 模型展示名称

Provider API 返回的模型列表包含人类可读名称时，界面展示该名称而不是裸 ID。

Local API Server 的默认模型选择器也要展示模型名称：优先 `displayName`，其次 `name`，最后才回退到裸 ID。

Local API Server 的默认模型选择器未选择模型时，必须显示本地化占位文案，不能显示 locale key。

MCP 服务的路由模型选择器右侧只显示模型品牌图标和模型名称，不显示 Provider 文案。

## 模型品牌图标

主模型选择器、Provider 模型列表和 MCP 路由模型选择器都使用模型品牌图标，便于区分 OpenAI、Claude、DeepSeek、Qwen、Kimi、Mistral、Grok 等模型家族。

## 模型能力自动识别

自定义 Provider 的 API 返回每个模型是否支持推理、工具调用、文件附件、温度调节。添加模型到 Provider 时，根据这些 API 返回值自动勾选对应的能力，不需要用户手动选择。

未返回能力信息的标准 OpenAI 兼容 API，仍按用户手动配置能力处理。

## 完整 API 数据保留

API 返回的模型信息包含模型家族、模态、成本、上下文长度等扩展数据。这些数据统一存储，用于上下文记录等功能。

`providerMetadata` 存储原始 API 响应，可直接读取 `limit.context`、`cost.input/output` 等字段。

原始 API 响应存放在独立字段中，不扩展现有模型展示类型。

## 远程 Provider 删除全部模型

Provider 设置页的模型列表头部，本地 Provider 和远程 API Provider 都提供「删除全部模型」入口。

## Token 计数器

### 对所有 Provider 可见

Token 计数器对本地模型和远程 API 模型都可见。上下文长度优先从 `providerMetadata.limit.context` 取，未配置时回退到模型设置的 `ctx_len`。

### 费用显示

剩余（Remaining）下方显示费用行，格式 `$0.00`。单价从 `providerMetadata.cost` 取（每百万 token 价格），价格为 0 也显示。

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

### 采样参数文案

采样参数区域和添加参数菜单的说明文案必须走 locale，不直接读取硬编码英文描述。相关 key：

- `samplingDesc` — 参数说明
- `samplingHint` — 已启用参数下方的短提示
- `samplingGroup` — 参数组说明
- `samplingCategory` — 添加参数菜单分类名

新增或调整采样参数时，必须同步更新 `en`、`zh-CN`、`zh-TW` 三份 `common.json`。

### 修改 locale 文件注意事项

- JSON locale 文件的编辑使用 `edit` 工具时，`oldString` **不得包含父级闭合括号 `}`**，否则会意外吞掉后续 key 导致整段丢失
- 每次编辑 locale JSON 后**必须**运行 `python3 -c "import json; json.load(open(file))"` 验证语法完整性
- 大型 JSON 编辑更安全的方式是读取 → 修改内存 → 用 `write` 工具写回完整文件，而不是用 `edit` 做局部替换

---

## 自动检查更新

自动检查更新默认关闭，配置值为 `autoUpdateCheck: false`。

## 外观侧边栏背景

侧边栏背景不跟随「设置 → 外观 → 主题色」变化。主题色只更新 `--primary`，侧边栏固定使用 Gray 的背景值：亮色 `#f1f1f1`，暗色 `#171717`。

## 消息 Markdown 渲染

聊天消息的 Markdown 渲染采用紧凑间距：标题、段落、列表、引用和分割线都减少块间距，但正文行高保持 `1.6`，避免影响中文多行阅读。

Markdown 表格使用带圆角的整体卡片样式，Export 操作放在表格顶部工具栏内，工具栏使用淡背景色，避免按钮漂在表格上方。

无序列表圆点统一为主题色实心圆；数字编号列表保持默认数字样式。

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
