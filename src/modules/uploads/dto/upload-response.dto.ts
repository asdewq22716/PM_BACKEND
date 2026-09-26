import { ApiProperty } from '@nestjs/swagger';

export class UploadResponseDto {
  @ApiProperty({ description: 'ID ของไฟล์ในตาราง uploads', example: 1 })
  id: number;

  @ApiProperty({ description: 'ชื่อไฟล์ต้นฉบับ', example: 'document.pdf' })
  original_name: string;

  @ApiProperty({ description: 'URL สำหรับเข้าถึงไฟล์', example: '/uploads/temp/e7d4bf6a-4d2a-43c2-841f-82bb3d58ef8a.pdf' })
  url: string;

  @ApiProperty({ description: 'ประเภท MIME ของไฟล์', example: 'application/pdf' })
  mime_type: string;

  @ApiProperty({ description: 'ขนาดไฟล์ (bytes)', example: 1048576 })
  size: number;
}
