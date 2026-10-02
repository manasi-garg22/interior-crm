import { getEnv } from '@crm/config'

/**
 * Email provider contract. Two drivers ship: `console` (dev) and `resend`
 * (plain fetch — no SDK, so swapping to SES or Postmark touches one file).
 */

export type EmailMessage = {
  to: string | string[]
  subject: string
  html: string
  text?: string
  replyTo?: string
}

export type EmailResult =
  | { ok: true; externalId: string; driver: string }
  | { ok: false; error: string; driver: string; retryable: boolean }

export interface EmailProvider {
  readonly driver: string
  readonly isLive: boolean
  send(message: EmailMessage): Promise<EmailResult>
}

/** Prints the message instead of sending it. Default in development. */
export class ConsoleEmailProvider implements EmailProvider {
  readonly driver = 'console'
  readonly isLive = false

  public readonly sent: EmailMessage[] = []

  async send(message: EmailMessage): Promise<EmailResult> {
    this.sent.push(message)
    console.warn(
      `[email:console] to=${Array.isArray(message.to) ? message.to.join(',') : message.to} subject="${message.subject}"`,
    )
    return { ok: true, externalId: `console-${Date.now()}`, driver: this.driver }
  }
}

export class ResendEmailProvider implements EmailProvider {
  readonly driver = 'resend'
  readonly isLive = true

  constructor(
    private readonly apiKey: string,
    private readonly from: string,
  ) {}

  async send(message: EmailMessage): Promise<EmailResult> {
    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: this.from,
          to: Array.isArray(message.to) ? message.to : [message.to],
          subject: message.subject,
          html: message.html,
          text: message.text,
          reply_to: message.replyTo,
        }),
      })

      if (!response.ok) {
        const body = await response.text()
        return {
          ok: false,
          error: `Resend responded ${response.status}: ${body.slice(0, 200)}`,
          driver: this.driver,
          // 4xx means the request is wrong; retrying will not fix it.
          retryable: response.status >= 500 || response.status === 429,
        }
      }

      const json = (await response.json()) as { id?: string }
      return { ok: true, externalId: json.id ?? 'unknown', driver: this.driver }
    } catch (cause) {
      return {
        ok: false,
        error: cause instanceof Error ? cause.message : 'Unknown transport error',
        driver: this.driver,
        retryable: true,
      }
    }
  }
}

let provider: EmailProvider | undefined

export function getEmailProvider(): EmailProvider {
  if (provider) return provider
  const env = getEnv()
  provider =
    env.EMAIL_DRIVER === 'resend' && env.EMAIL_API_KEY
      ? new ResendEmailProvider(env.EMAIL_API_KEY, env.EMAIL_FROM)
      : new ConsoleEmailProvider()
  return provider
}

export function setEmailProvider(next: EmailProvider | undefined): void {
  provider = next
}
