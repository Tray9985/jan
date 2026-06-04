import type { ReactNode } from 'react'
import {
  Anthropic,
  ChatGLM,
  Claude,
  Cohere,
  DeepSeek,
  Gemini,
  Google,
  Grok,
  Kimi,
  Meta,
  Minimax,
  Mistral,
  Moonshot,
  OpenAI,
  OpenRouter,
  Perplexity,
  Qwen,
  XAI,
  XiaomiMiMo,
  ZAI,
} from '@lobehub/icons'
import { cn } from '@/lib/utils'

interface ModelBrandIconProps {
  modelId: string
  size?: number
  className?: string
}

interface AvatarRenderProps {
  size: number
  shape: 'circle'
  className?: string
}

interface ModelAvatarMapping {
  keywords: RegExp[]
  render: (props: AvatarRenderProps) => ReactNode
}

const modelAvatarMappings: ModelAvatarMapping[] = [
  {
    keywords: [/gpt-3/i],
    render: (props) => <OpenAI.Avatar {...props} type="gpt3" />,
  },
  {
    keywords: [/gpt-4/i],
    render: (props) => <OpenAI.Avatar {...props} type="gpt4" />,
  },
  {
    keywords: [/gpt-5/i],
    render: (props) => <OpenAI.Avatar {...props} type="gpt5" />,
  },
  {
    keywords: [/gpt-oss/i],
    render: (props) => <OpenAI.Avatar {...props} type="oss" />,
  },
  {
    keywords: [/(^|[/_-])o[134]-/i, /(^|[/_-])o[134]$/i],
    render: (props) => <OpenAI.Avatar {...props} type="o1" />,
  },
  {
    keywords: [
      /(^|[/_-])gpt-/i,
      /openai/i,
      /davinci/i,
      /babbage/i,
      /whisper/i,
      /embedding/i,
      /moderation/i,
    ],
    render: (props) => <OpenAI.Avatar {...props} />,
  },
  {
    keywords: [/claude/i],
    render: (props) => <Claude.Avatar {...props} />,
  },
  {
    keywords: [/anthropic/i],
    render: (props) => <Anthropic.Avatar {...props} />,
  },
  {
    keywords: [/gemini/i],
    render: (props) => <Gemini.Avatar {...props} />,
  },
  {
    keywords: [/google/i, /learnlm/i],
    render: (props) => <Google.Avatar {...props} />,
  },
  {
    keywords: [/deepseek/i],
    render: (props) => <DeepSeek.Avatar {...props} />,
  },
  {
    keywords: [/qwen/i, /qwq/i, /qvq/i, /tongyi/i],
    render: (props) => <Qwen.Avatar {...props} />,
  },
  {
    keywords: [/kimi/i],
    render: (props) => <Kimi.Avatar {...props} />,
  },
  {
    keywords: [/moonshot/i],
    render: (props) => <Moonshot.Avatar {...props} />,
  },
  {
    keywords: [/mistral/i, /mixtral/i, /codestral/i, /pixtral/i],
    render: (props) => <Mistral.Avatar {...props} />,
  },
  {
    keywords: [/llama/i, /(^|[/_-])l3/i, /meta/i],
    render: (props) => <Meta.Avatar {...props} />,
  },
  {
    keywords: [/command/i, /cohere/i],
    render: (props) => <Cohere.Avatar {...props} />,
  },
  {
    keywords: [/grok/i],
    render: (props) => <Grok.Avatar {...props} />,
  },
  {
    keywords: [/xai/i, /x-ai/i],
    render: (props) => <XAI.Avatar {...props} />,
  },
  {
    keywords: [/minimax/i, /abab/i],
    render: (props) => <Minimax.Avatar {...props} />,
  },
  {
    keywords: [/chatglm/i, /(^|[/_-])glm-/i],
    render: (props) => <ChatGLM.Avatar {...props} />,
  },
  {
    keywords: [/zai/i, /zhipu/i],
    render: (props) => <ZAI.Avatar {...props} />,
  },
  {
    keywords: [/mimo/i],
    render: (props) => <XiaomiMiMo.Avatar {...props} />,
  },
  {
    keywords: [/openrouter/i],
    render: (props) => <OpenRouter.Avatar {...props} />,
  },
  {
    keywords: [/sonar/i, /pplx/i, /perplexity/i],
    render: (props) => <Perplexity.Avatar {...props} />,
  },
]

const getModelAvatarMapping = (
  modelId: string
): ModelAvatarMapping | undefined => {
  // 匹配模型品牌头像
  return modelAvatarMappings.find((item) =>
    item.keywords.some((keyword) => keyword.test(modelId))
  )
}

export function ModelBrandIcon({
  modelId,
  size = 18,
  className,
}: ModelBrandIconProps) {
  if (!modelId) return null

  const mapping = getModelAvatarMapping(modelId)

  if (!mapping) {
    const initial = modelId.trim().charAt(0).toUpperCase()

    return (
      <div
        className={cn(
          'shrink-0 flex items-center justify-center border bg-muted text-muted-foreground font-medium',
          className
        )}
        style={{
          borderRadius: '50%',
          fontSize: Math.max(10, Math.floor(size * 0.55)),
          height: size,
          width: size,
        }}
      >
        {initial}
      </div>
    )
  }

  return mapping.render({
    size,
    shape: 'circle',
    className: cn('shrink-0', className),
  })
}
