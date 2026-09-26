-- =================================================================
-- 🗄️ Uploads Table Schema for PM_BACKEND
-- =================================================================

-- 1. PostgreSQL Schema
CREATE TABLE IF NOT EXISTS uploads (
    id SERIAL PRIMARY KEY,
    original_name VARCHAR(255) NOT NULL,
    saved_name VARCHAR(255) NOT NULL,
    path VARCHAR(2000) NOT NULL,
    mime_type VARCHAR(100),
    size BIGINT,
    extension VARCHAR(20),
    ref_table VARCHAR(50),
    ref_id INTEGER,
    tag VARCHAR(50),
    sort_order INTEGER DEFAULT 1,
    is_temp SMALLINT DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(100),
    deleted_at TIMESTAMP,
    deleted_by VARCHAR(100),
    is_active SMALLINT DEFAULT 1
);

-- Index สำหรับค้นหาไฟล์ตามตารางและความสัมพันธ์
CREATE INDEX IF NOT EXISTS idx_uploads_ref ON uploads (ref_table, ref_id);
-- Index สำหรับค้นหาไฟล์ที่ยังเป็น temp เพื่อเคลียร์ไฟล์ขยะ
CREATE INDEX IF NOT EXISTS idx_uploads_temp_cleanup ON uploads (is_temp, created_at);

-- Comments อธิบายแต่ละฟิลด์
COMMENT ON TABLE uploads IS 'ตารางสำหรับเก็บข้อมูลการอัปโหลดไฟล์ของระบบ';
COMMENT ON COLUMN uploads.id IS 'Primary Key ของไฟล์';
COMMENT ON COLUMN uploads.original_name IS 'ชื่อไฟล์ต้นฉบับ';
COMMENT ON COLUMN uploads.saved_name IS 'ชื่อที่บันทึกจริงในระบบ (UUID)';
COMMENT ON COLUMN uploads.path IS 'พาร์ทไฟล์ เช่น /uploads/xxx.jpg หรือ /uploads/temp/xxx.jpg';
COMMENT ON COLUMN uploads.mime_type IS 'ประเภทไฟล์ เช่น image/jpeg, application/pdf';
COMMENT ON COLUMN uploads.size IS 'ขนาดไฟล์ (bytes)';
COMMENT ON COLUMN uploads.extension IS 'นามสกุลไฟล์ เช่น .jpg, .pdf';
COMMENT ON COLUMN uploads.ref_table IS 'ตารางที่อ้างถึง เช่น projects, tasks';
COMMENT ON COLUMN uploads.ref_id IS 'ID ของตารางที่ผูก เช่น project_id = 1';
COMMENT ON COLUMN uploads.tag IS 'ประเภทหรือ Tag เช่น thumbnail, attachment, avatar';
COMMENT ON COLUMN uploads.sort_order IS 'ลำดับการเรียงลำดับไฟล์';
COMMENT ON COLUMN uploads.is_temp IS 'สถานะไฟล์ชั่วคราว: 1 = ชั่วคราว (ยังไม่ยืนยัน), 0 = ไฟล์จริง';
COMMENT ON COLUMN uploads.created_at IS 'เวลาที่อัปโหลด';
COMMENT ON COLUMN uploads.created_by IS 'User ID หรือชื่อผู้สร้าง';
COMMENT ON COLUMN uploads.deleted_at IS 'เวลาลบแบบ Soft Delete';
COMMENT ON COLUMN uploads.deleted_by IS 'User ID หรือชื่อผู้ลบ';
COMMENT ON COLUMN uploads.is_active IS 'สถานะการใช้งาน: 1 = ใช้งาน, 0 = ถูกลบ/ยกเลิก';

/*
-- 2. กรณีใช้ MySQL (Schema Alternative)
CREATE TABLE IF NOT EXISTS `uploads` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `original_name` VARCHAR(255) NOT NULL,
    `saved_name` VARCHAR(255) NOT NULL,
    `path` VARCHAR(2000) NOT NULL,
    `mime_type` VARCHAR(100) NULL,
    `size` BIGINT NULL,
    `extension` VARCHAR(20) NULL,
    `ref_table` VARCHAR(50) NULL,
    `ref_id` INT NULL,
    `tag` VARCHAR(50) NULL,
    `sort_order` INT DEFAULT 1,
    `is_temp` SMALLINT DEFAULT 1,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `created_by` VARCHAR(100) NULL,
    `deleted_at` DATETIME NULL,
    `deleted_by` VARCHAR(100) NULL,
    `is_active` SMALLINT DEFAULT 1,
    INDEX `idx_uploads_ref` (`ref_table`, `ref_id`),
    INDEX `idx_uploads_temp_cleanup` (`is_temp`, `created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
*/
