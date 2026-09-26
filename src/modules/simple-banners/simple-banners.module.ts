import { Module } from '@nestjs/common';
import { SimpleBannersController } from './simple-banners.controller';
import { SimpleBannersService } from './simple-banners.service';
import { UploadsModule } from '../uploads';

@Module({
  imports: [UploadsModule],
  controllers: [SimpleBannersController],
  providers: [SimpleBannersService],
  exports: [SimpleBannersService],
})
export class SimpleBannersModule {}
