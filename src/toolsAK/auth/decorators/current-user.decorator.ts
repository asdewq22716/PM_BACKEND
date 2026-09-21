import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Decorator สำหรับดึงข้อมูล User ปัจจุบันที่ผ่านการ Authenticate แล้วออกจาก Request
 * 
 * @example
 * @Get('profile')
 * @UseGuards(JwtAuthGuard)
 * getProfile(@CurrentUser() user: any) {
 *   return user;
 * }
 * 
 * @example ดึงเฉพาะ field เช่น @CurrentUser('userId') userId: number
 */
export const CurrentUser = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      return null;
    }

    return data ? user[data] : user;
  },
);
