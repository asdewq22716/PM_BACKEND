import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsInt } from 'class-validator';
import { Type } from 'class-transformer';

export class DirectUploadDto {
  @ApiPropertyOptional({
    description: 'ชื่อตารางเป้าหมายที่ต้องการผูกไฟล์ (เช่น projects, tasks, users)',
    example: 'projects',
  })
  @IsOptional()
  @IsString()
  ref_table?: string;

  @ApiPropertyOptional({
    description: 'ID ของ Record ในตารางเป้าหมาย',
    example: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  ref_id?: number;

  @ApiPropertyOptional({
    description: 'Tag หรือหมวดหมู่ของไฟล์ (เช่น avatar, cover, attachment, document)',
    example: 'attachment',
  })
  @IsOptional()
  @IsString()
  tag?: string;
}
