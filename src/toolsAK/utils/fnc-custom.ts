/**
 * ==========================================
 * 📂 fnc-custom.ts - คลาสอำนวยความสะดวกส่วนกลาง (ToolsAK)
 * ==========================================
 */
export class FncCustom {
  /**
   * ดึง Date object ปัจจุบัน
   */
  static dateNow(): Date {
    return new Date();
  }

  /**
   * ดึงวันเวลาปัจจุบันในรูปแบบ ISO String
   */
  static dateNowISOString(): string {
    return new Date().toISOString();
  }

  /**
   * ดึงวันเวลาปัจจุบันสำหรับ Asia/Bangkok (UTC+7) ในรูปแบบ string (YYYY-MM-DD HH:mm:ss)
   * แนะนำให้ใช้สำหรับบันทึกลง Database เสมอ เพื่อป้องกันปัญหา Server Timezone เพี้ยน
   */
  static dateNowBangkokString(): string {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Bangkok',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
    return formatter.format(new Date()).replace(',', '');
  }

  /**
   * แปลง Date หรือ Timestamp เป็น Asia/Bangkok Format (YYYY-MM-DD HH:mm:ss)
   */
  static formatBangkok(date: Date | string | number = new Date()): string {
    const d = new Date(date);
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Bangkok',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
    return formatter.format(d).replace(',', '');
  }

  /**
   * ดึง Context การทำงาน (User ID, IP Address, User Agent)
   */
  static getAuditContext(req: any) {
    return {
      userId: req.user?.userId || req.user?.id || null,
      ipAddress: req.ip || req.connection?.remoteAddress || null,
      userAgent: req.headers ? req.headers['user-agent'] || null : null,
    };
  }
}
