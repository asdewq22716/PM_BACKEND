import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { FncDB, DbPoolService, FncCustom } from '../../toolsAK';
import { UploadsService } from '../uploads';
import { CreateSimpleBannerDto } from './dto/create-simple-banner.dto';
import { UpdateSimpleBannerDto } from './dto/update-simple-banner.dto';

@Injectable()
export class SimpleBannersService {
  private readonly logger = new Logger(SimpleBannersService.name);

  constructor(
    private readonly db: FncDB,
    private readonly dbPool: DbPoolService,
    private readonly uploadsService: UploadsService,
  ) {}

  // =================================================================
  // 1. CREATE: สร้างข้อมูลแบนเนอร์ และผูก ID รูปภาพที่ได้จาก /api/uploads
  // =================================================================
  async create(createBannerDto: CreateSimpleBannerDto, userId: string) {
    const client = await this.db.startTransaction();
    try {
      // 1.1 ตรวจสอบว่า ID รูปภาพที่ส่งมามีอยู่ในระบบจริงหรือไม่
      if (createBannerDto.image_ids && createBannerDto.image_ids.length > 0) {
        for (const id of createBannerDto.image_ids) {
          const exists = await this.db.exists('uploads', { id, is_active: 1 }, client);
          if (!exists) {
            throw new BadRequestException(`ไม่พบไฟล์รูปภาพ ID: ${id} ในระบบ หรือถูกลบไปแล้ว`);
          }
        }
      }

      // 1.2 บันทึกข้อมูลแบนเนอร์ลงตาราง simple_banners
      const nowBangkok = FncCustom.dateNowBangkokString();
      const bannerData = {
        title: createBannerDto.title,
        link_url: createBannerDto.link_url || null,
        sort_order: 1,
        is_active: 1,
        created_at: nowBangkok,
        created_by: userId,
        updated_at: nowBangkok,
        updated_by: userId,
      };

      const banner = await this.db.insert('simple_banners', bannerData, client);

      // 1.3 สั่งย้ายไฟล์จาก temp ไปยัง /public/uploads/simple_banners และเปลี่ยน is_temp = 0
      if (createBannerDto.image_ids && createBannerDto.image_ids.length > 0) {
        await this.uploadsService.linkFiles({
          uploadIds: createBannerDto.image_ids, // 👈 ส่ง Array ของ ID ที่อัปโหลดไว้เข้ามา
          refTable: 'simple_banners',           // 👈 ระบุชื่อตาราง
          refId: Number(banner.id),             // 👈 ระบุ ID ของ Record ที่สร้างขึ้นใหม่
          tag: 'cover',                         // 👈 ระบุหมวดหมู่/Tag
          userId,
          client,                               // 👈 ทำงานภายใต้ Database Transaction
        });
      }

      await this.db.commit(client);
      return { id: banner.id, message: 'สร้างแบนเนอร์และผูกรูปภาพสำเร็จ' };
    } catch (error: any) {
      await this.db.rollback(client);
      this.logger.error(`Failed to create simple banner: ${error.message}`);
      throw error;
    }
  }

  // =================================================================
  // 2. FIND ALL: ดึงรายการแบนเนอร์ทั้งหมด พร้อม Array ของรูปภาพ (Subquery)
  // =================================================================
  async findAll() {
    // ใช้ buildFilesSubquery ดึงรายการรูปภาพที่ผูกไว้ ออกมาเป็น JSON Array ให้อัตโนมัติ
    const imagesSubquery = this.uploadsService.buildFilesSubquery('simple_banners', 'b.id', 'cover');

    const sql = `
      SELECT 
        b.*,
        ${imagesSubquery} AS images
      FROM simple_banners b
      WHERE b.deleted_at IS NULL AND b.is_active = 1
      ORDER BY b.sort_order ASC, b.created_at DESC
    `;
    return this.db.query(sql);
  }

  // =================================================================
  // 3. FIND ONE: ดึงข้อมูลแบนเนอร์รายตัวตาม ID พร้อมรูปภาพ
  // =================================================================
  async findOne(id: number) {
    const isPg = this.dbPool.getDbType() === 'postgres';
    const imagesSubquery = this.uploadsService.buildFilesSubquery('simple_banners', 'b.id', 'cover');

    const sql = `
      SELECT 
        b.*,
        ${imagesSubquery} AS images
      FROM simple_banners b
      WHERE b.id = ${isPg ? '$1' : '?'} AND b.deleted_at IS NULL
    `;
    const results = await this.db.query(sql, [id]);

    if (!results || results.length === 0) {
      throw new NotFoundException(`ไม่พบข้อมูลแบนเนอร์ ID: ${id}`);
    }

    return results[0];
  }

  // =================================================================
  // 4. UPDATE: แก้ไขข้อมูล และ Sync รูปภาพใหม่ (คำนวณ Diff เพิ่ม/ลบ/จัดลำดับ ให้อัตโนมัติ)
  // =================================================================
  async update(id: number, updateBannerDto: UpdateSimpleBannerDto, userId: string) {
    await this.findOne(id); // ตรวจสอบว่าแบนเนอร์มีอยู่จริง

    const client = await this.db.startTransaction();
    try {
      const bannerData: Record<string, any> = {
        updated_at: FncCustom.dateNowBangkokString(),
        updated_by: userId,
      };

      if (updateBannerDto.title !== undefined) bannerData.title = updateBannerDto.title;
      if (updateBannerDto.link_url !== undefined) bannerData.link_url = updateBannerDto.link_url;

      await this.db.update('simple_banners', bannerData, { id }, client);

      // 4.1 Sync รูปภาพ:
      // - รูปที่อยู่ใน DB เดิมแต่ไม่อยู่ใน Array ใหม่ -> จะถูกลบ (Soft delete)
      // - รูปใหม่ที่เพิ่งอัปโหลดมา -> จะถูกย้ายจาก Temp เข้าโฟลเดอร์จริง
      // - รูปเดิมที่ยังมีอยู่ -> ปรับปรุงลำดับ sort_order ให้ตรงกับ Array ใหม่
      if (updateBannerDto.image_ids !== undefined) {
        await this.uploadsService.syncFiles({
          newUploadIds: updateBannerDto.image_ids,
          refTable: 'simple_banners',
          refId: id,
          tag: 'cover',
          userId,
          client,
        });
      }

      await this.db.commit(client);
      return { id, message: 'อัปเดตข้อมูลแบนเนอร์สำเร็จ' };
    } catch (error: any) {
      await this.db.rollback(client);
      throw error;
    }
  }

  // =================================================================
  // 5. DELETE: ลบข้อมูลแบนเนอร์ (Soft Delete) และยกเลิกการผูกรูปทั้งหมด
  // =================================================================
  async remove(id: number, userId: string) {
    await this.findOne(id);

    const client = await this.db.startTransaction();
    try {
      const deletedAt = FncCustom.dateNowBangkokString();

      // Soft delete แบนเนอร์
      await this.db.update(
        'simple_banners',
        { is_active: 0, deleted_at: deletedAt, deleted_by: userId },
        { id },
        client,
      );

      // ยกเลิกการผูกรูปภาพทั้งหมดของแบนเนอร์นี้
      await this.uploadsService.unlinkFiles({
        refTable: 'simple_banners',
        refId: id,
        userId,
        client,
      });

      await this.db.commit(client);
      return { id, message: 'ลบแบนเนอร์สำเร็จ' };
    } catch (error: any) {
      await this.db.rollback(client);
      throw error;
    }
  }
}
