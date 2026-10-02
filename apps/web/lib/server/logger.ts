/**
 * Structured logger.
 *
 * Deliberately dependency-free: one JSON line per event, which every log
 * aggregator ingests. The redaction list matters more than the transport —
 * lead payloads carry phone numbers and emails, and those must not be dumped
 * wholesale into logs that get shipped to a third party.
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

const LEVEL_WEIGHT: Record<LogLevel, number> = { debug: 10, info: 20, warn: 30, error: 40 }

const REDACTED_KEYS = new Set([
  'password',
  'passwordhash',
  'token',
  'accesstoken',
  'authsecret',
  'secret',
  'apikey',
  'cookie',
  'authorization',
  'phone',
  'whatsappnumber',
  'email',
])

function redact(value: unknown, depth = 0): unknown {
  if (depth > 4) return '[deep]'
  if (value == null) return value
  if (value instanceof Error) {
    return { name: value.name, message: value.message, stack: value.stack }
  }
  if (Array.isArray(value)) return value.map((item) => redact(item, depth + 1))
  if (typeof value === 'object') {
    const out: Record<string, unknown> = {}
    for (const [key, inner] of Object.entries(value as Record<string, unknown>)) {
      out[key] = REDACTED_KEYS.has(key.toLowerCase()) ? '[redacted]' : redact(inner, depth + 1)
    }
    return out
  }
  return value
}

function currentMinLevel(): number {
  const configured = (process.env.LOG_LEVEL ?? '').toLowerCase() as LogLevel
  if (configured in LEVEL_WEIGHT) return LEVEL_WEIGHT[configured]
  return process.env.NODE_ENV === 'production' ? LEVEL_WEIGHT.info : LEVEL_WEIGHT.debug
}

function emit(level: LogLevel, message: string, context?: Record<string, unknown>): void {
  if (LEVEL_WEIGHT[level] < currentMinLevel()) return

  const line = JSON.stringify({
    level,
    message,
    time: new Date().toISOString(),
    ...(context ? { context: redact(context) } : {}),
  })

  if (level === 'error') console.error(line)
  else if (level === 'warn') console.warn(line)
  else console.log(line)
}

export const logger = {
  debug: (message: string, context?: Record<string, unknown>) => emit('debug', message, context),
  info: (message: string, context?: Record<string, unknown>) => emit('info', message, context),
  warn: (message: string, context?: Record<string, unknown>) => emit('warn', message, context),
  error: (message: string, context?: Record<string, unknown>) => emit('error', message, context),

  /** Scopes every line to a module, e.g. logger.child('lead.service'). */
  child(scope: string) {
    return {
      debug: (m: string, c?: Record<string, unknown>) => emit('debug', `[${scope}] ${m}`, c),
      info: (m: string, c?: Record<string, unknown>) => emit('info', `[${scope}] ${m}`, c),
      warn: (m: string, c?: Record<string, unknown>) => emit('warn', `[${scope}] ${m}`, c),
      error: (m: string, c?: Record<string, unknown>) => emit('error', `[${scope}] ${m}`, c),
    }
  },
}

export type Logger = typeof logger
