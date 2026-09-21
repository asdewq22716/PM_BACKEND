import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        // 1. ดึงจาก Authorization Header (Bearer <token>)
        ExtractJwt.fromAuthHeaderAsBearerToken(),
        // 2. ดึงจาก Cookie ชื่อ 'access_token'
        (request: any) => {
          const cookieToken = request?.cookies?.['access_token'];
          return cookieToken || null;
        },
      ]),
      ignoreExpiration: false,
      secretOrKey:
        configService.get<string>('JWT_SECRET') ||
        'pm_backend_fallback_secret_key',
    });
  }

  /**
   * ถูกเรียกเมื่อ Token ถูกต้องตาม Signature และยังไม่หมดอายุ
   * คืนค่า Object เพื่อเซ็ตเข้าสู่ req.user
   */
  async validate(payload: any) {
    if (!payload || (!payload.sub && !payload.userId && !payload.id)) {
      throw new UnauthorizedException('Token ไม่ถูกต้องหรือไม่พบข้อมูลผู้ใช้งาน');
    }

    return {
      userId: payload.sub || payload.userId || payload.id,
      username: payload.username || payload.email || '',
      roles: payload.roles || [],
      ...payload,
    };
  }
}
