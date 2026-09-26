import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  UploadedFiles,
  Req,
  BadRequestException,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiConsumes, ApiBody, ApiBearerAuth } from '@nestjs/swagger';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard, tempStorageOptions } from '../../toolsAK';
import { UploadsService } from './uploads.service';

@ApiTags('Uploads')
@Controller('uploads')
export class UploadsController {
  constructor(private readonly uploadsService: UploadsService) {}

  // =================================================================
  // 1. API อัปโหลดไฟล์ชั่วคราว (รองรับทั้ง 1 ไฟล์ หรือ หลายไฟล์ สูงสุด 10 ไฟล์)
  // =================================================================
  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearer') // ต้องล็อกอินก่อน
  @ApiOperation({ summary: 'อัปโหลดไฟล์ชั่วคราว (รองรับทีละหลายไฟล์)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        files: {
          type: 'array',
          items: {
            type: 'string',
            format: 'binary',
          },
          description: 'เลือกไฟล์ที่ต้องการอัปโหลด (เลือกได้หลายไฟล์)',
        },
      },
    },
  })
  @UseInterceptors(FilesInterceptor('files', 10, tempStorageOptions)) // ใช้คีย์คำว่า 'files'
  async uploadTempFiles(@UploadedFiles() files: Array<Express.Multer.File>, @Req() req: any) {
    if (!files || files.length === 0) {
      throw new BadRequestException('No files provided');
    }

    const userId = req.user?.userId || req.user?.id ? (req.user.userId || req.user.id).toString() : 'anonymous';

    const results = [];
    for (const file of files) {
      const result = await this.uploadsService.saveTempFile(file, userId);
      results.push(result);
    }

    // คืนค่ากลับไปเป็น Array ของข้อมูลไฟล์เสมอ แม้จะอัปแค่ 1 ไฟล์ก็ตาม
    return results;
  }

  // =================================================================
  // 2. API อัปโหลดไฟล์เดี่ยวแบบ Simple (1 ไฟล์)
  // =================================================================
  @Post('single')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'อัปโหลดไฟล์เดี่ยว (Simple Upload 1 ไฟล์)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'เลือกไฟล์ 1 ไฟล์ที่ต้องการอัปโหลด',
        },
      },
    },
  })
  @UseInterceptors(FileInterceptor('file', tempStorageOptions)) // ใช้คีย์คำว่า 'file'
  async uploadSingleFile(@UploadedFile() file: Express.Multer.File, @Req() req: any) {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    const userId = req.user?.userId || req.user?.id ? (req.user.userId || req.user.id).toString() : 'anonymous';
    return this.uploadsService.saveTempFile(file, userId);
  }
}
