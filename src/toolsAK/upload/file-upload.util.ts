import { diskStorage } from 'multer';
import { extname } from 'path';
import { v4 as uuidv4 } from 'uuid';
import * as fs from 'fs';

export const ensureDirExists = (dir: string) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

/**
 * แก้ชื่อไฟล์ภาษาไทยแตก:
 * Multer อ่านชื่อไฟล์จาก HTTP Header ด้วย Latin1 (ISO-8859-1)
 * แต่ Browser ส่งมาเป็น UTF-8 → ต้อง re-encode กลับให้ถูกต้อง
 */
export const decodeOriginalName = (name: string): string => {
  try {
    return Buffer.from(name, 'latin1').toString('utf8');
  } catch {
    return name;
  }
};

export const tempStorageOptions = {
  storage: diskStorage({
    destination: (req: any, file: Express.Multer.File, cb: any) => {
      file.originalname = decodeOriginalName(file.originalname);
      const tempPath = './public/uploads/temp';
      ensureDirExists(tempPath);
      cb(null, tempPath);
    },
    filename: (req: any, file: Express.Multer.File, cb: any) => {
      const uniqueSuffix = uuidv4();
      const ext = extname(file.originalname);
      cb(null, `${uniqueSuffix}${ext}`);
    },
  }),
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB
  },
};
