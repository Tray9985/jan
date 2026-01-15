import {
  ChatCompletionContentPartText,
  ChatCompletionMessageParam,
} from 'openai/resources'
import { ContentType, ThreadMessage } from '@janhq/core'
import { isCompletionResponse, sendCompletion } from '@/lib/completion'
import { removeReasoningContent } from '@/utils/reasoning'

const CONTEXT_SUMMARY_PROMPT = `Summarize the conversation as a numbered list of Q/A pairs so the assistant can continue without earlier messages.

Rules:
- Each item is one pair: a user question and the assistant’s answer.
- Keep the user question verbatim.
- The answer should be a concise summary within 100 characters. If the original answer is already 100 characters or fewer, keep it unchanged.
- If a user question has no assistant answer yet, leave the answer empty.
- Use the conversation’s main language.

Output format:
1) Question: ...
   Answer: ...
2) Question: ...
   Answer: ...

Return only the list.`

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
      const normalized = content || '.'
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
