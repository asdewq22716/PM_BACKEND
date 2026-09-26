import { PartialType } from '@nestjs/swagger';
import { CreateSimpleBannerDto } from './create-simple-banner.dto';

export class UpdateSimpleBannerDto extends PartialType(CreateSimpleBannerDto) {}
