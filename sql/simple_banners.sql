-- =================================================================
-- 🗄️ Simple Banners Table Schema (ตัวอย่างการทำงานร่วมกับระบบ Uploads)
-- =================================================================

-- 1. PostgreSQL Schema
CREATE TABLE IF NOT EXISTS simple_banners (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    link_url VARCHAR(1000),
    sort_order INTEGER DEFAULT 1,
    is_active SMALLINT DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(100),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_by VARCHAR(100),
    deleted_at TIMESTAMP,
    deleted_by VARCHAR(100)
);

CREATE INDEX IF NOT EXISTS idx_simple_banners_active ON simple_banners (is_active, sort_order);

COMMENT ON TABLE simple_banners IS 'ตารางตัวอย่าง Simple Banners สำหรับศึกษาการเชื่อมต่อกับระบบ Uploads';
COMMENT ON COLUMN simple_banners.id IS 'Primary Key';
COMMENT ON COLUMN simple_banners.title IS 'ชื่อแบนเนอร์';
COMMENT ON COLUMN simple_banners.link_url IS 'ลิงก์เป้าหมายเมื่อคลิก';
COMMENT ON COLUMN simple_banners.sort_order IS 'ลำดับการแสดงผล';
COMMENT ON COLUMN simple_banners.is_active IS 'สถานะ: 1 = เปิดใช้งาน, 0 = ลบ/ปิดใช้งาน';
COMMENT ON COLUMN simple_banners.created_at IS 'เวลาสร้าง';
COMMENT ON COLUMN simple_banners.created_by IS 'ผู้สร้าง';
COMMENT ON COLUMN simple_banners.updated_at IS 'เวลาแก้ไข';
COMMENT ON COLUMN simple_banners.updated_by IS 'ผู้แก้ไข';
COMMENT ON COLUMN simple_banners.deleted_at IS 'เวลาลบแบบ Soft Delete';
COMMENT ON COLUMN simple_banners.deleted_by IS 'ผู้ลบ';

/*
-- 2. MySQL Alternative
CREATE TABLE IF NOT EXISTS `simple_banners` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `title` VARCHAR(255) NOT NULL,
    `link_url` VARCHAR(1000) NULL,
    `sort_order` INT DEFAULT 1,
    `is_active` SMALLINT DEFAULT 1,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    `created_by` VARCHAR(100) NULL,
    `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `updated_by` VARCHAR(100) NULL,
    `deleted_at` DATETIME NULL,
    `deleted_by` VARCHAR(100) NULL,
    INDEX `idx_simple_banners_active` (`is_active`, `sort_order`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
*/
