type FormatDateOptions = {
  includeTime?: boolean
  locale?: string
}

export const formatDate = (
  date: string | number | Date,
  options?: FormatDateOptions
): string => {
  const includeTime = options?.includeTime ?? true
  const locale = options?.locale ?? 'en-US'

  // Base options shared across both modes
  const base: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    day: 'numeric',
  }

  if (includeTime) {
    // Time mode: short month + time, using local timezone
    return new Date(date).toLocaleString(locale, {
      ...base,
      month: 'short',
      hour: 'numeric',
      minute: 'numeric',
      hour12: true,
    })
  }

  // Date-only mode: long month, using local timezone
  return new Date(date).toLocaleDateString(locale, {
    ...base,
    month: 'long',
  })
}
