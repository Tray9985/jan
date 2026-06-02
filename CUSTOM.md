# 自定义修改记录

本文档记录在此 Fork 基础上对上游的所有定制修改。保持简洁，说明为什么改、改了什么效果，不包含代码细节。供后续 LLM 维护时快速理解上下文。

---

## 1. 从 Provider API 保留完整模型元数据

**为什么改：** 上游只从 API 响应中提取 `id`，丢弃了 `display_name`、`reasoning`、`tool_call`、`attachment` 等字段。这使得模型列表只能显示原始 ID，无法自动识别模型能力。

**效果：** 
- `fetchModelsFromProvider` 现在返回包含 `id`、`displayName`、`reasoning`、`tool_call`、`attachment`、`temperature` 的完整对象
- `Model` 类型新增 `providerMetadata` 字段，保存 API 返回的全部原始数据（含 `family`、`modalities`、`cost`、`limit` 等），供后续扩展使用
- 对标准 OpenAI 兼容 API（只返回 `id`）无影响，各字段兜底为 `undefined`

**涉及文件：** `modelProviders.d.ts`、`providers/types.ts`、`providers/default.ts`、`providers/tauri.ts`、`useProviderModels.ts`

## 2. 模型列表显示 display_name

**为什么改：** 模型 ID 通常是技术标识符（如 `deepseek-v4-pro`），对用户不友好。API 返回的 `display_name` 更适合展示。

**效果：** ModelCombobox 下拉列表显示 `displayName`（回退到 `id`），ID 作为小号辅助文字。搜索同时覆盖 `displayName + name + id`。

**涉及文件：** `ModelCombobox.tsx`

## 3. 添加模型时自动填充能力和元数据

**为什么改：** 原有逻辑通过静态配置表判断模型能力，无法覆盖自定义 Provider 的新模型。API 返回的 `reasoning`、`tool_call`、`attachment` 等布尔字段可直接使用。

**效果：**
- 从 Provider API 获取模型时，`reasoning`、`tool_call`、`attachment` 自动转为 `capabilities` 数组（`reasoning→'reasoning'`、`tool_call→'tools'`、`attachment→'vision'`）
- API 未返回能力信息时，退回使用静态配置 `getModelCapabilities()`，不影响第三方 Provider
- `displayName` 自动填充
- 完整 API 元数据存入 `providerMetadata`

**涉及文件：** `AddModel.tsx`、`$providerName.tsx`

## 4. 远程 Provider 增加「删除全部模型」按钮

**为什么改：** 上游的「删除全部模型」按钮仅限本地 Provider（llamacpp、mlx），远程 API Provider 没有此功能。需要手动逐个删除很不方便。

**效果：** 远程 Provider 的模型列表头部增加删除全部按钮，与刷新、添加模型按钮并列。

**涉及文件：** `$providerName.tsx`

## 5. 分支策略

**为什么改：** 需要持续同步上游 `janhq/jan`，同时保留自己的定制。

**效果：**
- `main` 分支保持纯净，仅用于 `git merge upstream/main`
- `custom` 分支承载所有定制修改
- 同步上游时：`main` 合并上游 → `custom` 合并 `main`

---

## 维护注意事项

- 如果上游修改了 `fetchModelsFromProvider` 的解析逻辑或返回类型，需要合并时注意对齐
- `providerMetadata` 字段是可选的，不会影响上游代码的兼容性
- 能力自动填充有兜底逻辑（回退静态配置），上游新增 Provider 或模型不受影响
- 构建 macOS 包时，ARM-only 使用 `yarn tauri build --target aarch64-apple-darwin`
