export interface BuildEmailOptions {
  title: string;
  message: string;
  headerColor?: string;
  buttonText?: string;
  buttonUrl?: string;
  footerText?: string;
}

export class MailFormat {
  /**
   * สร้าง HTML Email Template แบบ Responsive Card มาตรฐาน
   */
  static buildNotificationEmail(options: BuildEmailOptions): string {
    const {
      title,
      message,
      headerColor = '#2563eb', // Indigo / Blue
      buttonText,
      buttonUrl,
      footerText = 'อีเมลฉบับนี้เป็นการแจ้งเตือนอัตโนมัติจากระบบ กรุณาอย่าตอบกลับอีเมลนี้',
    } = options;

    const timestamp = new Date().toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' });

    let buttonHtml = '';
    if (buttonText && buttonUrl) {
      buttonHtml = `
        <div style="text-align: center; margin: 30px 0;">
          <a href="${buttonUrl}" target="_blank" style="background-color: ${headerColor}; color: #ffffff; padding: 12px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            ${buttonText}
          </a>
        </div>
      `;
    }

    return `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 20px auto; border: 1px solid #e5e7eb; border-radius: 10px; overflow: hidden; background-color: #ffffff; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
        <!-- Header -->
        <div style="background-color: ${headerColor}; color: #ffffff; padding: 24px; text-align: center;">
          <h2 style="margin: 0; font-size: 22px; font-weight: 600;">${title}</h2>
        </div>
        
        <!-- Content Body -->
        <div style="padding: 28px; color: #374151;">
          <div style="margin: 0 0 20px 0; line-height: 1.7; font-size: 15px; color: #4b5563; white-space: pre-wrap;">${message}</div>
          
          ${buttonHtml}

          <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #f3f4f6; font-size: 13px; color: #9ca3af;">
            วัน-เวลาที่ส่ง: ${timestamp}
          </div>
        </div>
        
        <!-- Footer -->
        <div style="background-color: #f9fafb; padding: 16px; text-align: center; color: #9ca3af; font-size: 12px; border-top: 1px solid #e5e7eb;">
          <p style="margin: 0;">${footerText}</p>
        </div>
      </div>
    `;
  }

  /**
   * สร้าง HTML Template สำหรับส่งรหัส OTP
   */
  static buildOtpEmail(otpCode: string, expireMinutes = 5): string {
    return this.buildNotificationEmail({
      title: '🔐 รหัสยืนยันตัวตน (OTP)',
      message: `ท่านได้ทำการขอรหัส OTP สำหรับยืนยันตัวตนในระบบ\n\nรหัส OTP ของท่านคือ:\n<div style="text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #1e40af; padding: 15px; background: #eff6ff; border-radius: 8px; margin: 15px 0;">${otpCode}</div>\nรหัสนี้จะหมดอายุภายใน ${expireMinutes} นาที โปรดอย่ายื่นรหัสนี้ให้ผู้อื่น`,
      headerColor: '#1e40af',
    });
  }

  /**
   * สร้าง HTML Template สำหรับรีเซ็ตรหัสผ่าน (Reset Password)
   */
  static buildResetPasswordEmail(resetUrl: string, expireMinutes = 30): string {
    return this.buildNotificationEmail({
      title: '🔑 คำขอรีเซ็ตรหัสผ่าน',
      message: `เราได้รับคำขอรีเซ็ตรหัสผ่านสำหรับบัญชีของคุณ กรุณากดปุ่มด้านล่างเพื่อตั้งรหัสผ่านใหม่\nลิงก์นี้จะมีอายุการใช้งาน ${expireMinutes} นาที หากคุณไม่ได้ทำรายการนี้ สามารถเพิกเฉยต่ออีเมลฉบับนี้ได้`,
      buttonText: 'ตั้งรหัสผ่านใหม่',
      buttonUrl: resetUrl,
      headerColor: '#d97706',
    });
  }
}
