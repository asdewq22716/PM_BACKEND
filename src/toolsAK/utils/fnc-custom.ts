/**
 * ==========================================
 * 📂 fnc-custom.ts - คลาสอำนวยความสะดวกส่วนกลาง (ToolsAK)
 * ==========================================
 */
export class FncCustom {
  private static readonly THAI_MONTHS_FULL = [
    'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม',
  ];

  private static readonly THAI_MONTHS_SHORT = [
    'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
    'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.',
  ];

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
    const d = this.parseToDate(date);
    if (!d) return '';

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

  // =================================================================
  // 🧠 Smart Date Parser: แปลง Input ทุกรูปแบบ (ข้อความไทย, พ.ศ., DD/MM/YYYY) -> Date (ค.ศ.)
  // =================================================================

  /**
   * Smart Parser: แปลงวันที่ทุกรูปแบบให้กลายเป็น Javascript Date (ค.ศ. สากล)
   * รองรับ:
   * - '2023-01-01' (YYYY-MM-DD)
   * - '01/01/2023' หรือ '01/01/2566' (DD/MM/YYYY)
   * - '26 กันยายน 2569' หรือ '26 ก.ย. 2569' หรือ '26 ก.ย. 69' (ข้อความไทย)
   * - '2569-01-01' (พ.ศ.)
   * - Date object หรือ Timestamp
   */
  static parseToDate(input: any): Date | null {
    if (!input) return null;
    if (input instanceof Date) return isNaN(input.getTime()) ? null : input;
    if (typeof input === 'number') return new Date(input);

    const str = String(input).trim();
    if (!str) return null;

    // 1. ตรวจสอบรูปแบบข้อความภาษาไทย (เช่น "26 กันยายน 2569", "26 ก.ย. 69", "26 ก.ย. 2569")
    const thaiDateMatch = str.match(/^(\d{1,2})\s+([^\s\d]+)\s+(\d{2,4})(?:\s+(?:เวลา\s*)?(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/);
    if (thaiDateMatch) {
      const day = parseInt(thaiDateMatch[1], 10);
      const monthStr = thaiDateMatch[2].replace('.', '');
      let year = parseInt(thaiDateMatch[3], 10);
      const hours = thaiDateMatch[4] ? parseInt(thaiDateMatch[4], 10) : 0;
      const minutes = thaiDateMatch[5] ? parseInt(thaiDateMatch[5], 10) : 0;
      const seconds = thaiDateMatch[6] ? parseInt(thaiDateMatch[6], 10) : 0;

      // หาเดือนจาก array
      let monthIndex = this.THAI_MONTHS_FULL.findIndex((m) => m.startsWith(monthStr));
      if (monthIndex === -1) {
        monthIndex = this.THAI_MONTHS_SHORT.findIndex((m) => m.replace('.', '') === monthStr);
      }

      if (monthIndex !== -1) {
        // จัดการปี พ.ศ. (ถ้าส่งมา 2 หลัก เช่น 69 -> 2569)
        if (year < 100) year += 2500;
        // แปลง พ.ศ. -> ค.ศ.
        if (year > 2400) year -= 543;

        return new Date(year, monthIndex, day, hours, minutes, seconds);
      }
    }

    // 2. ตรวจสอบรูปแบบ DD/MM/YYYY หรือ DD-MM-YYYY (เช่น "26/09/2026" หรือ "26/09/2569")
    const ddmmyyyyMatch = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/);
    if (ddmmyyyyMatch) {
      const day = parseInt(ddmmyyyyMatch[1], 10);
      const month = parseInt(ddmmyyyyMatch[2], 10) - 1;
      let year = parseInt(ddmmyyyyMatch[3], 10);
      const hours = ddmmyyyyMatch[4] ? parseInt(ddmmyyyyMatch[4], 10) : 0;
      const minutes = ddmmyyyyMatch[5] ? parseInt(ddmmyyyyMatch[5], 10) : 0;
      const seconds = ddmmyyyyMatch[6] ? parseInt(ddmmyyyyMatch[6], 10) : 0;

      if (year > 2400) year -= 543; // แปลง พ.ศ. -> ค.ศ.
      return new Date(year, month, day, hours, minutes, seconds);
    }

    // 3. ตรวจสอบรูปแบบ YYYY-MM-DD (เช่น "2023-01-01" หรือ "2566-01-01")
    const yyyymmddMatch = str.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})(.*)?/);
    if (yyyymmddMatch) {
      let year = parseInt(yyyymmddMatch[1], 10);
      const month = parseInt(yyyymmddMatch[2], 10) - 1;
      const day = parseInt(yyyymmddMatch[3], 10);
      const rest = yyyymmddMatch[4] ? yyyymmddMatch[4].trim() : '';

      if (year > 2400) year -= 543; // ถ้าเป็นปี พ.ศ. แปลงเป็น ค.ศ.

      if (rest) {
        const timeMatch = rest.match(/(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?/);
        if (timeMatch) {
          const h = parseInt(timeMatch[1], 10);
          const m = parseInt(timeMatch[2], 10);
          const s = timeMatch[3] ? parseInt(timeMatch[3], 10) : 0;
          return new Date(year, month, day, h, m, s);
        }
      }
      return new Date(year, month, day);
    }

    // 4. Default JS Date parse (ISO String etc.)
    const parsed = new Date(str);
    if (!isNaN(parsed.getTime())) {
      // ถ้าเป็นปี พ.ศ. ที่หลุดเข้ามา
      if (parsed.getFullYear() > 2400) {
        parsed.setFullYear(parsed.getFullYear() - 543);
      }
      return parsed;
    }

    return null;
  }

  /**
   * แปลง Input ใดๆ ให้กลายเป็นมาตรฐาน YYYY-MM-DD (ค.ศ.) สำหรับนำไปลง Database
   * @example
   * FncCustom.toStandardDateString('26 กันยายน 2569') // -> "2026-09-26"
   * FncCustom.toStandardDateString('26/09/2569')      // -> "2026-09-26"
   * FncCustom.toStandardDateString('2023-01-01')      // -> "2023-01-01"
   */
  static toStandardDateString(input: any): string {
    const d = this.parseToDate(input);
    if (!d) return '';

    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * แปลง Input ใดๆ ให้กลายเป็นมาตรฐาน YYYY-MM-DD HH:mm:ss (ค.ศ.)
   */
  static toStandardDateTimeString(input: any): string {
    const d = this.parseToDate(input);
    if (!d) return '';

    const datePart = this.toStandardDateString(d);
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const seconds = String(d.getSeconds()).padStart(2, '0');
    return `${datePart} ${hours}:${minutes}:${seconds}`;
  }

  // =================================================================
  // 🇹🇭 Thai Date & Time Formatters (แปลงออกเป็นภาษาไทย / พ.ศ.)
  // =================================================================

  /**
   * แปลงวันที่เป็น พ.ศ. ภาษาไทย เช่น "26 กันยายน 2569" หรือ "26 ก.ย. 2569"
   */
  static formatThaiDate(input: any, isShort = false): string {
    const d = this.parseToDate(input);
    if (!d) return '-';

    const day = d.getDate();
    const month = isShort ? this.THAI_MONTHS_SHORT[d.getMonth()] : this.THAI_MONTHS_FULL[d.getMonth()];
    const buddhistYear = d.getFullYear() + 543;

    return `${day} ${month} ${buddhistYear}`;
  }

  /**
   * แปลงวันเวลาเป็น พ.ศ. ภาษาไทย เช่น "26 ก.ย. 2569 เวลา 13:45 น."
   */
  static formatThaiDateTime(input: any, isShort = true): string {
    const d = this.parseToDate(input);
    if (!d) return '-';

    const dateStr = this.formatThaiDate(d, isShort);
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');

    return `${dateStr} เวลา ${hours}:${minutes} น.`;
  }

  /**
   * คำนวณความต่างของวันระหว่าง 2 วันที่ (End Date - Start Date)
   */
  static dateDiffDays(startDate: any, endDate: any): number {
    const start = this.parseToDate(startDate);
    const end = this.parseToDate(endDate);
    if (!start || !end) return 0;

    const diffTime = end.getTime() - start.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  /**
   * บวก/ลบ วันจากวันที่กำหนด
   */
  static addDays(inputDate: any, days: number): Date | null {
    const d = this.parseToDate(inputDate);
    if (!d) return null;

    const result = new Date(d);
    result.setDate(result.getDate() + days);
    return result;
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
