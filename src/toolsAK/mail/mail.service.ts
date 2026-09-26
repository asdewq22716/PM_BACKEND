import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

export interface SendMailOptions {
  to: string | string[];
  subject: string;
  html: string;
  from?: string;
  cc?: string | string[];
  bcc?: string | string[];
  attachments?: Array<{
    filename: string;
    content?: any;
    path?: string;
    contentType?: string;
  }>;
}

@Injectable()
export class MailService {
  private transporter: nodemailer.Transporter | null = null;
  private readonly logger = new Logger(MailService.name);

  constructor(private readonly configService: ConfigService) {
    const host = this.configService.get<string>('SMTP_HOST') || 'smtp.gmail.com';
    const port = Number(this.configService.get<number>('SMTP_PORT')) || 587;
    const user = this.configService.get<string>('SMTP_USER');
    const pass = this.configService.get<string>('SMTP_PASS');

    if (user && pass && user !== 'your_email@gmail.com') {
      try {
        this.transporter = nodemailer.createTransport({
          host,
          port,
          secure: port === 465,
          auth: { user, pass },
        });
        this.logger.log(`📧 [MailService] SMTP configured for ${user} (${host}:${port})`);
      } catch (err: any) {
        this.logger.error(`Failed to initialize SMTP transporter: ${err.message}`);
      }
    } else {
      this.logger.log('📧 [MailService] SMTP credentials not provided. Running in Mock/Simulation Mode.');
    }
  }

  /**
   * ฟังก์ชันส่งอีเมล (รองรับ Mock Mode อัตโนมัติเมื่อยังไม่ตั้งค่า SMTP)
   */
  async sendMail(options: SendMailOptions): Promise<boolean> {
    const { to, subject, html, attachments, cc, bcc } = options;
    const defaultSender = this.configService.get<string>('SMTP_FROM') || this.configService.get<string>('SMTP_USER') || 'no-reply@pm-system.com';
    const from = options.from || `"PM Notification" <${defaultSender}>`;

    const recipients = Array.isArray(to) ? to.join(', ') : to;

    // Simulation Mode: หากยังไม่ได้ตั้งค่า SMTP หรือ Transport ไม่พร้อม
    if (!this.transporter) {
      this.logger.warn(`[Simulated Email] To: ${recipients} | Subject: ${subject}`);
      this.logger.debug(`[Simulated Email HTML Content Preview]:\n${html.substring(0, 300)}...`);
      return true;
    }

    try {
      const mailOptions = {
        from,
        to: recipients,
        cc: Array.isArray(cc) ? cc.join(', ') : cc,
        bcc: Array.isArray(bcc) ? bcc.join(', ') : bcc,
        subject,
        html,
        attachments,
      };

      const info = await this.transporter.sendMail(mailOptions);
      this.logger.log(`Email sent successfully to ${recipients} (Message ID: ${info.messageId})`);
      return true;
    } catch (error: any) {
      this.logger.error(`Failed to send email to ${recipients}: ${error.message}`, error.stack);
      // ไม่ throw error เพื่อไม่ให้ขัดขวาง Business Flow หลักของระบบ
      return false;
    }
  }
}
