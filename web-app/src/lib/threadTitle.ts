import {
  ChatCompletionContentPartText,
  ChatCompletionMessageParam,
} from 'openai/resources'
import { isCompletionResponse, sendCompletion } from '@/lib/completion'

const THREAD_TITLE_PROMPT = `通过聊天记录创建一个具体且简洁的标题，用于概括对话主题。标题为中文，其中关键字可为原始语言。

## 标题要求：
1. 标题要具体反映讨论的话题、目标或主题。
2. 标题字数限制在15字以内，不宜过长！
3. 避免使用引号或特殊格式。
4. 开头必须有emoji，emoji 取决于聊天主题内容或具体某一元素

## 标题格式

emoji + 空格 + 标题描述`

export const generateThreadTitle = async ({
  thread,
  provider,
  userMessage,
  assistantMessage,
  baseParams,
  supportsReasoning,
  conversationText,
}: {
  thread: Thread
  provider: ModelProvider
  userMessage: string
  assistantMessage: string
  baseParams: Record<string, unknown>
  supportsReasoning: boolean
  conversationText?: string
}): Promise<string | undefined> => {
  const titleMessages: ChatCompletionMessageParam[] = conversationText
    ? [
        {
          role: 'system',
          content: THREAD_TITLE_PROMPT,
        },
        {
          role: 'user',
          content: conversationText,
        },
      ]
    : [
        {
          role: 'system',
          content: THREAD_TITLE_PROMPT,
        },
        {
          role: 'user',
          content: `用户：${userMessage}\n助手：${assistantMessage}`,
        },
      ]
  let titleParams: Record<string, unknown> = {
    ...baseParams,
    stream: false,
    max_tokens: 32,
    temperature: 0.2,
  }
  if (supportsReasoning) {
    titleParams = {
      ...titleParams,
      reasoning: { enabled: false },
    }
  } else if ('reasoning' in titleParams) {
    const { reasoning, ...rest } = titleParams
    titleParams = rest
  }

  const titleCompletion = await sendCompletion(
    thread,
    provider,
    titleMessages,
    new AbortController(),
    [],
    false,
    titleParams as unknown as Record<string, object>
  )
  if (!titleCompletion || !isCompletionResponse(titleCompletion)) {
    throw new Error('Failed to generate thread title')
  }
  const rawTitle = titleCompletion.choices?.[0]?.message?.content
  const normalizedTitle = Array.isArray(rawTitle)
    ? rawTitle
        .map((part) =>
          part?.type === 'text'
            ? (part as ChatCompletionContentPartText).text
            : ''
        )
        .join('')
    : rawTitle ?? ''
  const cleanedTitle = normalizedTitle.trim()
  return cleanedTitle || undefined
}
