import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Decorator สำหรับระบุว่า Route/Endpoint นี้เปิดเป็น Public
 * ไม่จำเป็นต้องส่ง JWT Token เข้ามาตรวจสอบ
 * 
 * @example
 * @Public()
 * @Get('public-data')
 * getPublicData() { ... }
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
