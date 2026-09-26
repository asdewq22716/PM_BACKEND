import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { SimpleBannersService } from './simple-banners.service';
import { CreateSimpleBannerDto } from './dto/create-simple-banner.dto';
import { UpdateSimpleBannerDto } from './dto/update-simple-banner.dto';
import { JwtAuthGuard, CurrentUser, Public } from '../../toolsAK';

@ApiTags('Simple Banners (ตัวอย่าง Uploads)')
@Controller('simple-banners')
export class SimpleBannersController {
  constructor(private readonly simpleBannersService: SimpleBannersService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearer')
  @ApiOperation({
    summary: 'สร้างแบนเนอร์ใหม่ (ส่ง image_ids ที่ได้จากการอัปโหลด /api/uploads เข้ามา)',
  })
  @ApiResponse({ status: 201, description: 'สร้างแบนเนอร์สำเร็จ' })
  create(@Body() dto: CreateSimpleBannerDto, @CurrentUser() user: any) {
    const userId = user?.userId || user?.id ? String(user?.userId || user?.id) : 'system';
    return this.simpleBannersService.create(dto, userId);
  }

  @Public()
  @Get()
  @ApiOperation({ summary: 'ดึงรายการแบนเนอร์ทั้งหมด (พร้อมรูปภาพ JSON Array)' })
  @ApiResponse({ status: 200, description: 'ดึงรายการสำเร็จ' })
  findAll() {
    return this.simpleBannersService.findAll();
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'ดึงรายละเอียดแบนเนอร์ตาม ID' })
  @ApiResponse({ status: 200, description: 'ดึงรายละเอียดสำเร็จ' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.simpleBannersService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'แก้ไขแบนเนอร์ (ส่ง image_ids ชุดใหม่เพื่อ Sync Diff รูปภาพ)' })
  @ApiResponse({ status: 200, description: 'แก้ไขสำเร็จ' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateSimpleBannerDto,
    @CurrentUser() user: any,
  ) {
    const userId = user?.userId || user?.id ? String(user?.userId || user?.id) : 'system';
    return this.simpleBannersService.update(id, dto, userId);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'ลบแบนเนอร์ (Soft Delete พร้อม Unlink รูปภาพ)' })
  @ApiResponse({ status: 200, description: 'ลบสำเร็จ' })
  remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: any) {
    const userId = user?.userId || user?.id ? String(user?.userId || user?.id) : 'system';
    return this.simpleBannersService.remove(id, userId);
  }
}
