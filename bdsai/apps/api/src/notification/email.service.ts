import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * EmailService — Story 6.2.
 * Email-first (FR15). Dùng Resend API nếu RESEND_API_KEY configured,
 * fallback log-only trong dev.
 */

interface EmailPayload {
  to: string;
  subject: string;
  body: string;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly resendApiKey: string | undefined;
  private readonly fromEmail: string;

  constructor(private readonly config: ConfigService) {
    this.resendApiKey = this.config.get<string>('RESEND_API_KEY');
    this.fromEmail = this.config.get<string>('EMAIL_FROM') ?? 'no-reply@bdsai.vn';
  }

  async send(payload: EmailPayload): Promise<boolean> {
    if (!this.resendApiKey) {
      // Dev mode — log only.
      this.logger.log(
        { action: 'email-send', to: payload.to, subject: payload.subject, mode: 'dev-log' },
        `[DEV EMAIL] To: ${payload.to} | Subject: ${payload.subject}`,
      );
      return true;
    }

    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          authorization: `Bearer ${this.resendApiKey}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          from: this.fromEmail,
          to: payload.to,
          subject: payload.subject,
          text: payload.body,
        }),
      });
      if (!res.ok) {
        const errText = await res.text();
        this.logger.error(
          { action: 'email-send', reason: 'resend-api-error', status: res.status, err: errText },
          'Resend API error',
        );
        return false;
      }
      this.logger.log(
        { action: 'email-send', to: payload.to, subject: payload.subject, mode: 'resend' },
        'Email sent via Resend',
      );
      return true;
    } catch (e) {
      this.logger.error(
        { action: 'email-send', reason: 'network-error', err: e instanceof Error ? e.message : String(e) },
        'Email send network error',
      );
      return false;
    }
  }
}
