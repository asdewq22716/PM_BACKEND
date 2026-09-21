import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * OptionalJwtAuthGuard:
 * พยายามอ่านและตรวจสอบ JWT Token หากมี Token ถูกต้องจะนำ user ใส่ใน req.user
 * แต่หากไม่มี Token หรือ Token หมดอายุ จะไม่ throw error แต่ปล่อยให้ผ่านต่อไปได้ (req.user จะเป็น null)
 */
@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  handleRequest(err: any, user: any) {
    if (err || !user) {
      return null;
    }
    return user;
  }
}
