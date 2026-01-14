import {
  ChatCompletionContentPartText,
  ChatCompletionMessageParam,
} from 'openai/resources'
import { ContentType, ThreadMessage } from '@janhq/core'
import { isCompletionResponse, sendCompletion } from '@/lib/completion'
import { removeReasoningContent } from '@/utils/reasoning'

type ToolCallRecord = {
  tool?: {
    id?: number | string
    function?: {
      name?: string
      arguments?: object | string
    }
  }
  response?: unknown
  state?: string
}

const CONTEXT_SUMMARY_PROMPT = `Summarize the conversation so the assistant can continue without the earlier messages.

Requirements:
- Keep key facts, decisions, constraints, and user preferences.
- Preserve code snippets, file paths, commands, and identifiers.
- Include tool call results when they matter.
- Use the original language(s) from the conversation.
- Be concise and avoid speculation.

Return only the summary.`

const getInlineFileContents = (message: ThreadMessage) => {
  const inlineFileContents = Array.isArray(
    (message.metadata as { inline_file_contents?: Array<{
      name?: string
      content?: string
    }> })?.inline_file_contents
  )
    ? ((message.metadata as { inline_file_contents?: Array<{
        name?: string
        content?: string
      }> }).inline_file_contents ?? []).filter((file) => file?.content)
    : []

  if (!inlineFileContents.length) return ''

  return inlineFileContents
    .map((file) => `File: ${file.name || 'attachment'}\n${file.content ?? ''}`)
    .join('\n\n')
}

const buildInlineText = (base: string, inlineText: string) => {
  if (!inlineText) return base
  return base ? `${base}\n\n${inlineText}` : inlineText
}

const formatMessageContent = (message: ThreadMessage) => {
  const inlineText = getInlineFileContents(message)
  const parts = Array.isArray(message.content) ? message.content : []
  const contentText = parts
    .map((part) => {
      if (part.type === ContentType.Text) {
        return part.text?.value ?? ''
      }
      if (part.type === ContentType.Image) {
        const url = part.image_url?.url
        return url ? `[image: ${url}]` : '[image]'
      }
      return ''
    })
    .filter(Boolean)
    .join('\n')

  const normalizedText =
    message.role === 'assistant'
      ? removeReasoningContent(contentText)
      : contentText

  return buildInlineText(normalizedText, inlineText)
}

const formatToolArguments = (args: object | string | undefined) => {
  if (!args) return ''
  if (typeof args === 'string') return args
  return JSON.stringify(args)
}

const formatToolResponse = (response: unknown) => {
  if (response === undefined || response === null) return ''
  if (typeof response === 'string') return response
  if (typeof response === 'object') {
    const result = response as {
      content?: Array<{
        text?: string
        data?: string
        image_url?: { url?: string }
      }>
      error?: string
    }
    if (Array.isArray(result.content) && result.content.length) {
      const formatted = result.content
        .map((part) => {
          if (part.text) return part.text
          if (part.image_url?.url) return `[image: ${part.image_url.url}]`
          if (part.data) return '[image data omitted]'
          return ''
        })
        .filter(Boolean)
        .join('\n')
      if (formatted) return formatted
    }
    if (result.error) {
      return `Error: ${result.error}`
    }
  }
  return JSON.stringify(response)
}

const formatToolCalls = (message: ThreadMessage) => {
  const toolCalls = Array.isArray(
    (message.metadata as { tool_calls?: ToolCallRecord[] })?.tool_calls
  )
    ? ((message.metadata as { tool_calls?: ToolCallRecord[] }).tool_calls ?? [])
    : []

  if (!toolCalls.length) return ''

  const formattedCalls = toolCalls
    .map((call, index) => {
      const name = call.tool?.function?.name ?? 'unknown_tool'
      const args = formatToolArguments(call.tool?.function?.arguments)
      const result = formatToolResponse(call.response)
      const lines = [`Tool call ${index + 1}: ${name}`]
      if (args) lines.push(`Arguments: ${args}`)
      if (result) lines.push(`Result: ${result}`)
      return lines.join('\n')
    })
    .join('\n\n')

  return `Tool calls:\n${formattedCalls}`
}

const formatConversationText = (messages: ThreadMessage[]) => {
  return messages
    .map((message) => {
      const roleLabel =
        message.role === 'assistant'
          ? 'Assistant'
          : message.role === 'user'
            ? 'User'
            : message.role === 'system'
              ? 'System'
              : 'Tool'
      const content = formatMessageContent(message)
      const toolCalls = formatToolCalls(message)
      const combined = [content, toolCalls].filter(Boolean).join('\n')
      const normalized = combined || '.'
      return `${roleLabel}:\n${normalized}`
    })
    .join('\n\n')
}

export const generateContextSummary = async ({
  thread,
  provider,
  messages,
  baseParams,
  supportsReasoning,
  abortController,
}: {
  thread: Thread
  provider: ModelProvider
  messages: ThreadMessage[]
  baseParams: Record<string, unknown>
  supportsReasoning: boolean
  abortController: AbortController
}): Promise<string> => {
  if (!messages.length) {
    throw new Error('No messages available for context summary')
  }

  const summaryMessages: ChatCompletionMessageParam[] = [
    {
      role: 'system',
      content: CONTEXT_SUMMARY_PROMPT,
    },
    {
      role: 'user',
      content: formatConversationText(messages) || '.',
    },
  ]

  let summaryParams: Record<string, unknown> = {
    ...baseParams,
    stream: false,
    max_tokens: 512,
    temperature: 0.2,
  }

  if (supportsReasoning) {
    summaryParams = {
      ...summaryParams,
      reasoning: { enabled: false },
    }
  } else if ('reasoning' in summaryParams) {
    const { reasoning, ...rest } = summaryParams
    summaryParams = rest
  }

  const summaryCompletion = await sendCompletion(
    thread,
    provider,
    summaryMessages,
    abortController,
    [],
    false,
    summaryParams as Record<string, object>
  )
  if (!summaryCompletion || !isCompletionResponse(summaryCompletion)) {
    throw new Error('Failed to generate context summary')
  }

  const rawSummary = summaryCompletion.choices?.[0]?.message?.content
  const normalizedSummary = Array.isArray(rawSummary)
    ? rawSummary
        .map((part) =>
          part?.type === 'text'
            ? (part as ChatCompletionContentPartText).text
            : ''
        )
        .join('')
    : rawSummary ?? ''
  const cleanedSummary = normalizedSummary.trim()
  if (!cleanedSummary) {
    throw new Error('Context summary was empty')
  }

  return cleanedSummary
}
