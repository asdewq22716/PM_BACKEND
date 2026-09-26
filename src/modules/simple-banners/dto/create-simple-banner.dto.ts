import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsArray, IsNumber } from 'class-validator';

export class CreateSimpleBannerDto {
  @ApiProperty({ description: 'ชื่อแบนเนอร์', example: 'โปรโมชั่นเปิดตัวระบบ' })
  @IsNotEmpty({ message: 'กรุณากรอกชื่อแบนเนอร์' })
  @IsString()
  title: string;

  @ApiPropertyOptional({ description: 'ลิงก์เป้าหมายเมื่อคลิก', example: 'https://example.com' })
  @IsOptional()
  @IsString()
  link_url?: string;

  @ApiPropertyOptional({
    description: 'Array ID ของไฟล์รูปภาพที่ได้จากการอัปโหลดผ่าน POST /api/uploads มาก่อนหน้า (is_temp = 1)',
    type: [Number],
    example: [1, 2],
  })
  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  image_ids?: number[];
}
