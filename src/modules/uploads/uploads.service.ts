import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import * as fs from 'fs';
import * as path from 'path';
import { FncDB, DbPoolService, FncCustom } from '../../toolsAK';

export interface LinkFilesParams {
  uploadIds: number[];
  refTable: string;
  refId: number;
  tag: string;
  userId: string;
  client?: any;
}

export interface UnlinkFilesParams {
  refTable: string;
  refId: number;
  tag?: string;
  userId: string;
  client?: any;
}

export interface SyncFilesParams {
  newUploadIds: number[];
  refTable: string;
  refId: number;
  tag: string;
  userId: string;
  client?: any;
}

export interface DirectUploadOptions {
  refTable?: string;
  refId?: number;
  tag?: string;
  userId?: string;
  client?: any;
}

@Injectable()
export class UploadsService {
  private readonly logger = new Logger(UploadsService.name);

  constructor(
    private readonly db: FncDB,
    private readonly dbPool: DbPoolService,
  ) {}

  /**
   * 1. บันทึกข้อมูลไฟล์ชั่วคราวลงตาราง uploads (is_temp = 1)
   */
  async saveTempFile(file: Express.Multer.File, createdBy?: string) {
    const url = `/uploads/temp/${file.filename}`;
    const nowBangkok = FncCustom.dateNowBangkokString();

    const insertData = {
      original_name: file.originalname,
      saved_name: file.filename,
      path: url,
      mime_type: file.mimetype,
      size: file.size,
      extension: path.extname(file.originalname),
      is_temp: 1, // 1 = ไฟล์ชั่วคราว
      created_at: nowBangkok,
      created_by: createdBy || 'system',
      is_active: 1,
    };

    const record = await this.db.insert('uploads', insertData);

    return {
      id: record.id,
      original_name: record.original_name,
      url: record.path,
      mime_type: record.mime_type,
      size: record.size,
    };
  }

  /**
   * 2. อัปโหลดไฟล์ตรงเข้าโฟลเดอร์ปลายทางทันที (Direct Upload / Simple Upload)
   * โดยไม่ต้องรอผูกทีหลัง (is_temp = 0)
   */
  async saveDirectFile(
    file: Express.Multer.File,
    options: DirectUploadOptions = {},
  ) {
    const refTable = options.refTable || 'general';
    const destDir = path.join(process.cwd(), 'public', 'uploads', refTable);

    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }

    // ย้ายไฟล์จาก temp ไปยังโฟลเดอร์ปลายทาง
    const oldFilePath = path.join(process.cwd(), 'public', 'uploads', 'temp', file.filename);
    const newFilePath = path.join(destDir, file.filename);
    let finalUrl = `/uploads/temp/${file.filename}`;

    if (fs.existsSync(oldFilePath)) {
      try {
        fs.renameSync(oldFilePath, newFilePath);
        finalUrl = `/uploads/${refTable}/${file.filename}`;
      } catch (error) {
        this.logger.error(`Failed to move direct file ${file.filename}:`, error);
        throw new BadRequestException(`ไม่สามารถย้ายไฟล์เข้า ${refTable} ได้`);
      }
    }

    const nowBangkok = FncCustom.dateNowBangkokString();
    const insertData = {
      original_name: file.originalname,
      saved_name: file.filename,
      path: finalUrl,
      mime_type: file.mimetype,
      size: file.size,
      extension: path.extname(file.originalname),
      ref_table: options.refTable || null,
      ref_id: options.refId || null,
      tag: options.tag || null,
      sort_order: 1,
      is_temp: 0, // 0 = ไฟล์จริง
      created_at: nowBangkok,
      created_by: options.userId || 'system',
      is_active: 1,
    };

    const record = await this.db.insert('uploads', insertData, options.client);

    return {
      id: record.id,
      original_name: record.original_name,
      url: record.path,
      mime_type: record.mime_type,
      size: record.size,
      ref_table: record.ref_table,
      ref_id: record.ref_id,
      tag: record.tag,
    };
  }

  /**
   * 3. ผูกไฟล์เข้ากับตารางเป้าหมาย และย้ายไฟล์ออกจากโฟลเดอร์ temp ไปยังโฟลเดอร์ปลายทาง
   */
  async linkFiles({
    uploadIds,
    refTable,
    refId,
    tag,
    userId,
    client,
  }: LinkFilesParams): Promise<void> {
    if (!uploadIds || uploadIds.length === 0) return;

    const isPg = this.dbPool.getDbType() === 'postgres';

    // 1. ดึงข้อมูลไฟล์ทั้งหมดจาก DB
    const placeholders = uploadIds
      .map((_, i) => (isPg ? `$${i + 1}` : '?'))
      .join(', ');

    const sql = `SELECT * FROM uploads WHERE id IN (${placeholders}) AND is_active = 1`;
    const files = client
      ? await this.db.queryTx(client, sql, uploadIds)
      : await this.db.query(sql, uploadIds);

    if (files.length !== uploadIds.length) {
      throw new BadRequestException('พบไฟล์บางส่วนที่ระบุไม่ถูกต้องหรือถูกลบไปแล้ว');
    }

    // 2. สร้างโฟลเดอร์ปลายทางถ้ายังไม่มี
    const destDir = path.join(process.cwd(), 'public', 'uploads', refTable);
    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }

    // 3. วนลูปย้ายไฟล์และอัปเดต DB
    for (const file of files) {
      let newUrlPath = file.path;

      // ถ้าย้ายมาจาก temp ให้ย้ายไฟล์จริงใน Storage
      if (Number(file.is_temp) === 1) {
        const oldFilePath = path.join(process.cwd(), 'public', 'uploads', 'temp', file.saved_name);
        const newFilePath = path.join(destDir, file.saved_name);

        if (fs.existsSync(oldFilePath)) {
          try {
            fs.renameSync(oldFilePath, newFilePath);
            newUrlPath = `/uploads/${refTable}/${file.saved_name}`;
          } catch (error) {
            this.logger.error(`Failed to move file ${file.saved_name}:`, error);
            throw new BadRequestException(`ไม่สามารถย้ายไฟล์ ${file.saved_name} ได้`);
          }
        }
      }

      // 4. อัปเดตข้อมูลไฟล์ใน DB
      const sortOrder = uploadIds.indexOf(Number(file.id)) + 1;
      const updateData = {
        ref_table: refTable,
        ref_id: refId,
        tag: tag,
        is_temp: 0,
        sort_order: sortOrder,
        path: newUrlPath,
      };

      if (client) {
        await this.db.update('uploads', updateData, { id: file.id }, client);
      } else {
        await this.db.update('uploads', updateData, { id: file.id });
      }
    }
  }

  /**
   * 4. ยกเลิกการผูกไฟล์ (Soft Delete) ตามเงื่อนไขที่ระบุ
   */
  async unlinkFiles({
    refTable,
    refId,
    tag,
    userId,
    client,
  }: UnlinkFilesParams): Promise<void> {
    const isPg = this.dbPool.getDbType() === 'postgres';
    const deletedAt = FncCustom.dateNowBangkokString();

    const params: any[] = [deletedAt, userId, refTable, refId];

    let sql = isPg
      ? `UPDATE uploads SET is_active = 0, deleted_at = $1, deleted_by = $2 WHERE ref_table = $3 AND ref_id = $4`
      : `UPDATE uploads SET is_active = 0, deleted_at = ?, deleted_by = ? WHERE ref_table = ? AND ref_id = ?`;

    if (tag) {
      sql += isPg ? ` AND tag = $5` : ` AND tag = ?`;
      params.push(tag);
    }

    if (client) {
      await this.db.queryTx(client, sql, params);
    } else {
      await this.db.query(sql, params);
    }
  }

  /**
   * 5. คำนวณ Diff ไฟล์เก่า/ใหม่ และอัปเดตเฉพาะส่วนที่เปลี่ยนแปลงจริง
   */
  async syncFiles({
    newUploadIds,
    refTable,
    refId,
    tag,
    userId,
    client,
  }: SyncFilesParams): Promise<void> {
    const isPg = this.dbPool.getDbType() === 'postgres';

    // 1. ดึงไฟล์ชุดเก่าที่ active อยู่ปัจจุบัน
    const sql = isPg
      ? `SELECT id FROM uploads WHERE ref_table = $1 AND ref_id = $2 AND tag = $3 AND is_active = 1`
      : `SELECT id FROM uploads WHERE ref_table = ? AND ref_id = ? AND tag = ? AND is_active = 1`;

    const currentFiles = client
      ? await this.db.queryTx(client, sql, [refTable, refId, tag])
      : await this.db.query(sql, [refTable, refId, tag]);

    const currentIds: number[] = currentFiles.map((f: any) => Number(f.id));

    // 2. คำนวณ Diff
    const toRemove = currentIds.filter((oldId) => !newUploadIds.includes(oldId));
    const toAdd = newUploadIds.filter((newId) => !currentIds.includes(newId));

    // 3. Soft Delete เฉพาะไฟล์ที่ถูกนำออก
    const deletedAt = FncCustom.dateNowBangkokString();
    for (const removeId of toRemove) {
      const removeSql = isPg
        ? `UPDATE uploads SET is_active = 0, deleted_at = $1, deleted_by = $2 WHERE id = $3`
        : `UPDATE uploads SET is_active = 0, deleted_at = ?, deleted_by = ? WHERE id = ?`;

      if (client) {
        await this.db.queryTx(client, removeSql, [deletedAt, userId, removeId]);
      } else {
        await this.db.query(removeSql, [deletedAt, userId, removeId]);
      }
    }

    // 4. Link เฉพาะไฟล์ใหม่ที่ยังไม่เคยมี
    if (toAdd.length > 0) {
      await this.linkFiles({
        uploadIds: toAdd,
        refTable,
        refId,
        tag,
        userId,
        client,
      });
    }

    // 5. Update sort_order ให้ตรงกับลำดับใน newUploadIds
    for (let i = 0; i < newUploadIds.length; i++) {
      const updateOrderSql = isPg
        ? `UPDATE uploads SET sort_order = $1 WHERE id = $2`
        : `UPDATE uploads SET sort_order = ? WHERE id = ?`;

      if (client) {
        await this.db.queryTx(client, updateOrderSql, [i + 1, newUploadIds[i]]);
      } else {
        await this.db.query(updateOrderSql, [i + 1, newUploadIds[i]]);
      }
    }
  }

  /**
   * 6. ดึงข้อมูลไฟล์รายตัวตาม ID
   */
  async getFileById(id: number) {
    const isPg = this.dbPool.getDbType() === 'postgres';
    const sql = isPg
      ? `SELECT * FROM uploads WHERE id = $1 AND is_active = 1`
      : `SELECT * FROM uploads WHERE id = ? AND is_active = 1`;

    const records = await this.db.query(sql, [id]);
    if (!records || records.length === 0) {
      throw new NotFoundException(`ไม่พบข้อมูลไฟล์ ID: ${id}`);
    }
    return records[0];
  }

  /**
   * 7. ดึงรายการไฟล์ที่ผูกกับ Record
   */
  async getFilesByRef(refTable: string, refId: number, tag?: string) {
    const isPg = this.dbPool.getDbType() === 'postgres';
    const params: any[] = [refTable, refId];

    let sql = isPg
      ? `SELECT id, original_name, path, mime_type, size, extension, sort_order 
         FROM uploads 
         WHERE ref_table = $1 AND ref_id = $2 AND is_active = 1`
      : `SELECT id, original_name, path, mime_type, size, extension, sort_order 
         FROM uploads 
         WHERE ref_table = ? AND ref_id = ? AND is_active = 1`;

    if (tag) {
      sql += isPg ? ` AND tag = $3` : ` AND tag = ?`;
      params.push(tag);
    }

    sql += ` ORDER BY sort_order ASC`;

    return this.db.query(sql, params);
  }

  /**
   * 8. ลบไฟล์ตาม ID (Soft Delete หรือ Hard Delete)
   */
  async deleteFile(id: number, userId: string, hardDelete = false) {
    const file = await this.getFileById(id);

    if (hardDelete) {
      // ลบไฟล์จริงบนดิสก์
      const fullPath = path.join(process.cwd(), 'public', file.path.replace(/^\//, ''));
      if (fs.existsSync(fullPath)) {
        try {
          fs.unlinkSync(fullPath);
        } catch (err: any) {
          this.logger.warn(`Could not delete physical file: ${fullPath} (${err.message})`);
        }
      }
      await this.db.delete('uploads', { id });
    } else {
      const deletedAt = FncCustom.dateNowBangkokString();
      await this.db.update(
        'uploads',
        { is_active: 0, deleted_at: deletedAt, deleted_by: userId },
        { id },
      );
    }

    return { id, message: 'ลบไฟล์สำเร็จ' };
  }

  /**
   * 9. Cron Job ทำงานทุกเที่ยงคืนเพื่อลบไฟล์ Temp ที่อายุเกิน 24 ชั่วโมง
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleTempFileCleanup(): Promise<void> {
    this.logger.log('🧹 [Uploads] Running Temp File Cleanup...');

    const isPg = this.dbPool.getDbType() === 'postgres';
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const cutoffDate = FncCustom.formatBangkok(oneDayAgo);

    const sql = isPg
      ? `SELECT id, saved_name FROM uploads WHERE is_temp = 1 AND created_at < $1`
      : `SELECT id, saved_name FROM uploads WHERE is_temp = 1 AND created_at < ?`;

    const oldFiles = await this.db.query(sql, [cutoffDate]);

    if (oldFiles.length === 0) {
      this.logger.log('🧹 [Uploads] No old temp files to clean up.');
      return;
    }

    let deletedCount = 0;
    for (const file of oldFiles) {
      const filePath = path.join(process.cwd(), 'public', 'uploads', 'temp', file.saved_name);

      if (fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
        } catch (error) {
          this.logger.error(`Failed to delete physical file: ${filePath}`, error);
        }
      }

      await this.db.delete('uploads', { id: file.id });
      deletedCount++;
    }

    this.logger.log(`🧹 [Uploads] Cleaned up ${deletedCount} old temp files.`);
  }

  /**
   * 10. Helper สร้าง SQL Subquery สำหรับดึงไฟล์ออกมาเป็น JSON Array ใน Query เดียว
   */
  buildFilesSubquery(refTable: string, refIdColumn: string, tag: string): string {
    const isPg = this.dbPool.getDbType() === 'postgres';

    if (isPg) {
      return `(
        SELECT COALESCE(
          json_agg(
            json_build_object(
              'id', u.id,
              'path', u.path,
              'original_name', u.original_name,
              'size', u.size,
              'mime_type', u.mime_type,
              'extension', u.extension,
              'sort_order', u.sort_order
            ) ORDER BY u.sort_order ASC
          ),
          '[]'::json
        )
        FROM uploads u 
        WHERE u.ref_table = '${refTable}' 
          AND u.ref_id = ${refIdColumn} 
          AND u.tag = '${tag}' 
          AND u.is_active = 1
      )`;
    } else {
      return `(
        SELECT COALESCE(
          JSON_ARRAYAGG(
            JSON_OBJECT(
              'id', u.id,
              'path', u.path,
              'original_name', u.original_name,
              'size', u.size,
              'mime_type', u.mime_type,
              'extension', u.extension,
              'sort_order', u.sort_order
            )
          ),
          JSON_ARRAY()
        )
        FROM uploads u 
        WHERE u.ref_table = '${refTable}' 
          AND u.ref_id = ${refIdColumn} 
          AND u.tag = '${tag}' 
          AND u.is_active = 1
      )`;
    }
  }
}
