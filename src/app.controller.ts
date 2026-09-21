import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AppService } from './app.service';
import { CurrentUser, JwtAuthGuard } from './toolsAK';

@ApiTags('Health & System')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @ApiOperation({ summary: 'ตรวจเช็คสถานะการทำงานของระบบและ Database (Health Check)' })
  @ApiResponse({
    status: 200,
    description: 'ส่งกลับสถานะ Server และสถานะ Database Connection',
  })
  getHealth() {
    return this.appService.getHealthStatus();
  }

  @Get('profile-test')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'ตัวอย่าง Endpoint ที่ป้องกันด้วย JwtAuthGuard จาก ToolsAK' })
  @ApiResponse({
    status: 200,
    description: 'ส่งกลับข้อมูล User จาก Token ใน req.user ผ่าน @CurrentUser()',
  })
  getProfileTest(@CurrentUser() user: any) {
    return {
      message: 'ยินดีต้อนรับ! Token ของคุณถูกต้อง',
      user: user,
    };
  }
}
