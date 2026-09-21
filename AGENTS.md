# 📋 PM Backend - AI & Project Development Rules (AGENTS.md)

เอกสารนี้รวบรวมกฎเกณฑ์ มาตรฐาน และแนวทางการพัฒนาสำหรับโปรเจกต์ **PM_BACKEND** (Project Management Backend System) เพื่อให้ทีมพัฒนาและ AI Assistant ปฏิบัติตามอย่างเคร่งครัด

---

## 🛠️ 1. ข้อมูลและเทคโนโลยีหลักของระบบ (Tech Stack & Architecture)

- **Framework**: [NestJS 11+](https://nestjs.com/) บน Node.js (TypeScript)
- **Database Engine**: รองรับแบบ Dual Database (PostgreSQL และ MySQL) ขับเคลื่อนผ่าน `ToolsAK/database` (`DbPoolService` และ `FncDB`)
- **In-Memory & Cache Engine**: Redis ขับเคลื่อนผ่าน `ioredis` (สำหรับ Caching, Rate Limiting, Token Blacklist, และ Background Job Queue)
- **Authentication**: Passport JWT (`@nestjs/jwt`, `@nestjs/passport`, `passport-jwt`, `cookie-parser`)
- **Validation**: `class-validator` และ `class-transformer` เปิด Global ValidationPipe (`whitelist: true`, `forbidNonWhitelisted: true`, `transform: true`)
- **API Global Prefix**: กำหนด Prefix เป็น `/api` (เช่น `http://localhost:4722/api/...`) โดยอัตโนมัติ
- **API Documentation**: [Swagger / OpenAPI](http://localhost:4722/api/docs) (เข้าใช้งานผ่าน `/api/docs` โดยตรง) พร้อม Bearer Authentication
- **Timezone**: กำหนดเป็น `Asia/Bangkok` (UTC+7)
- **Universal Toolkit**: กล่องเครื่องมือกลาง `src/toolsAK`

---

## 📁 2. โครงสร้างโปรเจกต์และการจัดวางโมดูล (Folder & Module Structure)

ในการเพิ่ม Feature ใหม่ ให้จัดวางโครงสร้างตามมาตรฐานดังนี้:

```text
sql/                            # 🗄️ แหล่งเก็บไฟล์โครงสร้าง Database Schema / DDL Scripts (.sql)
src/
├── main.ts                     # Entry point (Bootstrap, Pipes, Filters, Interceptors, Swagger)
├── app.module.ts               # Root Application Module
├── app.controller.ts           # Root Controller (Health check / Ping)
├── app.service.ts              # Root Service
├── toolsAK/                    # 🧰 กล่องเครื่องมือส่วนกลาง (ห้ามแก้โค้ดภายในโดยไม่จำเป็น)
│   ├── auth/                   # Guards, Strategies, Decorators (@CurrentUser, @Public)
│   ├── database/               # DbPoolService, FncDB (QueryBuilder, CRUD, Transactions)
│   ├── http/                   # BaseApiService (Axios wrapper with error handling)
│   ├── response/               # AllExceptionsFilter, TransformInterceptor
│   ├── upload/                 # Multer storage, thai filename decoder
│   └── utils/                  # FncCustom (Date, Audit Context)
└── modules/                    # 🚀 โมดูลฟีเจอร์ของระบบ (แยกตาม Domain/Feature)
    └── <feature-name>/
        ├── <feature-name>.module.ts
        ├── <feature-name>.controller.ts
        ├── <feature-name>.service.ts
        ├── dto/
        │   ├── create-<feature-name>.dto.ts
        │   ├── update-<feature-name>.dto.ts
        │   └── query-<feature-name>.dto.ts
        └── interfaces/ หรือ entities/
```

### กฎการแยกหน้าที่ของโค้ด (Separation of Concerns):
1. **Controller**: ทำหน้าที่รับ Request, Validate Input ผ่าน DTO, เรียก Service, และ Return ผลลัพธ์เท่านั้น **ห้ามเขียน Business Logic หรือยิง Database ตรงใน Controller**
   - ⚠️ **Routing Note**: เนื่องจากระบบเปิดใช้ Global Prefix `/api` ใน `main.ts` แล้ว ให้ประกาศ `@Controller('<resource>')` ตามปกติ เช่น `@Controller('tasks')` จะกลายเป็น `/api/tasks` อัตโนมัติ **ห้ามใส่ `/api` ซ้ำใน Decorator**
2. **Service**: แหล่งรวม Business Logic, การคำนวณ, การเรียก Database ผ่าน `FncDB`, และการจัดการ Transaction
3. **DTO (Data Transfer Object)**: ประกาศโครงสร้างข้อมูลที่รับเข้า/ส่งออก พร้อม Validation Decorators และ Swagger Decorators

---

## 🧰 3. กฎการใช้งานโมดูลกลาง ToolsAK (ToolsAK Guidelines)

### 3.1 การจัดการฐานข้อมูล (Database & `FncDB`)
- **SQL Schema & Script Storage**: โครงสร้างตาราง (Table Schemas), DDL Scripts, และข้อมูลเริ่มต้น (Seeds) จะถูกเก็บไว้ที่โฟลเดอร์ `sql/` ที่ Root ของโปรเจกต์ เพื่อให้อ่านและอ้างอิงได้สะดวก
- ให้ Inject `FncDB` เข้ามาใน Service สำหรับการทำงานกับ Database
- **CRUD Operations**: ใช้ Helper methods ที่มีมาให้เมื่อทำได้ เช่น `fncDb.insert()`, `fncDb.update()`, `fncDb.delete()`, `fncDb.select()`, `fncDb.exists()`
- **Query Builder**: ใช้ `fncDb.queryBuilder({ select, where, orderBy, limit, offset })` สำหรับ Query ที่มีเงื่อนไขซับซ้อน/Dynamic
- **Raw Query**: ใช้ `fncDb.query(sql, params)` โดยต้องใส่พารามิเตอร์แบบ Parameterized เสมอเพื่อป้องกัน SQL Injection
- ⚠️ **กฎสำคัญเรื่องวันเวลา (Timezone: Asia/Bangkok)**:
  - เมื่อทำ `INSERT` หรือ `UPDATE` ข้อมูลที่มีฟิลด์วันเวลา (เช่น `created_at`, `updated_at`, `action_time` เป็นต้น) **ต้องใช้เวลาตาม Timezone `Asia/Bangkok` (UTC+7) เสมอ** เพื่อป้องกันปัญหา Server หรือ DB Timezone เพี้ยน (เช่น ติด UTC)
  - แนะนำให้ใช้ `FncCustom.dateNowBangkokString()` ส่งเป็นค่าเวลา เช่น:
    ```typescript
    await this.fncDb.insert('tasks', {
      task_name: dto.taskName,
      created_at: FncCustom.dateNowBangkokString(),
      updated_at: FncCustom.dateNowBangkokString(),
    });
    ```
- **Transactions**: เมื่อมี Operation หลายขั้นตอนที่ต้องเป็น Atomic ให้ใช้ Transaction เสมอ:
  ```typescript
  const client = await this.fncDb.startTransaction();
  try {
    // ทำงานขั้นตอนที่ 1
    await this.fncDb.queryTx(client, 'INSERT INTO ...', [...]);
    // ทำงานขั้นตอนที่ 2
    await this.fncDb.queryTx(client, 'UPDATE ...', [...]);

    await this.fncDb.commit(client);
    return { success: true };
  } catch (error) {
    await this.fncDb.rollback(client);
    throw error;
  }
  ```

### 3.2 รูปแบบ API Response และ Error Handling
- **Success Response**: ตัวระบบมี `TransformInterceptor` หุ้ม Response ให้อัตโนมัติในรูปแบบ:
  ```json
  {
    "status": 200,
    "success": true,
    "message": "Success",
    "data": <ผลลัพธ์ที่ return จาก service/controller>
  }
  ```
  👉 **ดังนั้นใน Controller/Service ให้ return ข้อมูล Object/Array ออกมาโดยตรง ไม่ต้องห่อ `{ success: true, data: ... }` ซ้ำซ้อน**
- **Error Response**: เมื่อเกิดข้อผิดพลาด ให้โยน Built-in HttpException ของ NestJS เสมอ (เช่น `BadRequestException`, `NotFoundException`, `ForbiddenException`, `UnauthorizedException`) ตัว `AllExceptionsFilter` จะแปลงเป็น JSON Format มาตรฐานให้อัตโนมัติ:
  ```typescript
  if (!user) {
    throw new NotFoundException('ไม่พบข้อมูลผู้ใช้งานที่ระบุ');
  }
  ```

### 3.3 การยืนยันตัวตนและการเข้าถึง (Authentication & Guards)
- Route ทั่วไปจะตรวจสอบสิทธิ์ผ่าน JWT Guard
- หากเป็น Route สาธารณะ (ไม่ต้อง Login เช่น Login, Register, Public Health) ให้ใช้ Decorator `@Public()`:
  ```typescript
  @Public()
  @Post('login')
  async login(@Body() dto: LoginDto) { ... }
  ```
- การดึงข้อมูล User ที่ผ่านการ Login แล้ว ให้ใช้ Decorator `@CurrentUser()`:
  ```typescript
  @Get('profile')
  async getProfile(@CurrentUser() user: any) { ... }
  ```

### 3.4 การอัปโหลดไฟล์ (File Upload)
- ใช้ `tempStorageOptions` จาก `toolsAK` ในการรับไฟล์ เพื่อรองรับชื่อไฟล์ภาษาไทย (`decodeOriginalName`) และป้องกันปัญหาชื่อไฟล์ซ้ำด้วย UUID
- ตรวจสอบขนาดไฟล์ (Limit สูงสุด 100MB ตามที่กำหนดในระบบ)

### 3.5 การเรียก API ภายนอก (External HTTP Service)
- ให้สืบทอด (Extend) หรือใช้งาน `BaseApiService` จาก `toolsAK` เพื่อให้ได้ระบบ Logging และ Error Handling ที่ดักจับสถานะปลายทางล่มหรือ Timeout ได้อย่างเป็นมาตรฐาน

### 3.6 วันเวลา และ Audit Logs (Timezone: Asia/Bangkok บังคับใช้)
- **Timezone**: บังคับใช้ `Asia/Bangkok` (UTC+7) ทุกจุด
- **ฟังก์ชันวันที่/เวลาใน `FncCustom`**:
  - `FncCustom.dateNowBangkokString()`: ดึงวันเวลาปัจจุบันสำหรับ Bangkok Format `YYYY-MM-DD HH:mm:ss` (สำหรับ Insert/Update DB)
  - `FncCustom.formatBangkok(date)`: แปลงวันที่ใดๆ ให้เป็น Format Bangkok `YYYY-MM-DD HH:mm:ss`
  - `FncCustom.dateNowISOString()`: ดึงวันเวลาในรูปแบบ ISO String
- **Audit Logs**: ดึง Context การทำงาน (User ID, IP Address, User Agent) ผ่าน `FncCustom.getAuditContext(req)`

### 3.7 การใช้งาน Redis & Caching (`ioredis`)
- **Library หลัก**: ใช้ `ioredis` สำหรับการเชื่อมต่อและจัดการคำสั่ง Redis ทั้งหมด
- **รูปแบบการตั้งชื่อ Key (Key Naming Convention)**: ใช้รูปแบบ `<prefix>:<module>:<identifier>` เช่น:
  - แคชข้อมูลโปรเจกต์: `pm:project:detail:123`
  - แคชสรุป Dashboard: `pm:dashboard:summary`
  - Cooldown / Rate Limit: `pm:ratelimit:ip:127.0.0.1`
  - Token Blacklist: `pm:auth:blacklist:<token>`
- **กำหนดเวลาหมดอายุ (TTL) เสมอ**: ทุกครั้งที่บันทึก Cache ต้องระบุเวลาหมดอายุ (เช่น `'EX', 300` หรือ 5 นาที) เพื่อไม่ให้เปลือง RAM
- **Cache Invalidation**: เมื่อมีการ `INSERT`, `UPDATE`, หรือ `DELETE` ข้อมูลในตาราง ต้องทำการลบ Key แคชที่เกี่ยวข้องทิ้งทันที (`redis.del(...)`) เพื่อป้องกันข้อมูลเก่าค้าง

---

## 📝 4. มาตรฐานการเขียนโค้ด TypeScript & DTOs (Coding Standards)

1. **Strict Typing**:
   - หลีกเลี่ยงการใช้ `any` เมื่อสามารถระบุ Type หรือ Interface ที่ชัดเจนได้
   - สร้าง Interface หรือ Type กำกับ Response และ Entity เสมอ
2. **DTO & Validation Rules**:
   - ทุก Input ที่รับเข้ามาทาง `@Body()`, `@Query()`, `@Param()` ต้องผ่าน DTO
   - ใช้ `class-validator` กำกับทุก Property เช่น `@IsString()`, `@IsNotEmpty()`, `@IsOptional()`, `@IsEmail()`, `@IsNumber()`
   - ใช้ `class-transformer` เช่น `@Type(() => Number)` สำหรับ Query Parameters ที่เป็นตัวเลข
3. **Naming Conventions**:
   - **File Names**: ใช้ `kebab-case` เช่น `project-task.service.ts`, `create-task.dto.ts`
   - **Classes & Interfaces**: ใช้ `PascalCase` เช่น `ProjectTaskService`, `CreateTaskDto`
   - **Variables, Functions & Methods**: ใช้ `camelCase` เช่น `getProjectById`, `totalCount`
   - **Constants & Enums**: ใช้ `UPPER_SNAKE_CASE` เช่น `DEFAULT_PAGE_SIZE`, `ROLE_ADMIN`
   - **Database Tables & Columns**: ใช้ `snake_case` เช่น `user_accounts`, `created_at`

---

## 📖 5. มาตรฐาน Swagger / OpenAPI Documentation

เพื่อให้ API Document ครบถ้วนและสามารถทดสอบได้ผ่าน `/api/docs`:
1. ทุก Controller ต้องใส่:
   - `@ApiTags('<ชื่อกลุ่ม API>')`
   - `@ApiBearerAuth('bearer')`
2. ทุก Endpoint ต้องใส่:
   - `@ApiOperation({ summary: '<คำอธิบายสั้นๆ ภาษาไทย>' })`
   - `@ApiResponse({ status: 200, description: '<คำอธิบายผลลัพธ์>' })`
3. ทุก Property ใน DTO ต้องใส่:
   - `@ApiProperty({ description: '...', example: '...' })` หรือ `@ApiPropertyOptional(...)`

ตัวอย่าง:
```typescript
@ApiTags('Projects')
@ApiBearerAuth('bearer')
@Controller('projects')
export class ProjectController {
  @Post()
  @ApiOperation({ summary: 'สร้างโครงการใหม่' })
  @ApiResponse({ status: 201, description: 'สร้างโครงการสำเร็จ' })
  async createProject(@Body() dto: CreateProjectDto, @CurrentUser() user: any) {
    return this.projectService.create(dto, user);
  }
}
```

---

## 🔒 6. ความปลอดภัยและ Environment Configuration

1. **Environment Variables**:
   - อ่านค่าผ่าน `ConfigService` หรือ `process.env`
   - ต้องมีค่า Default fallback ที่ปลอดภัยและมีบันทึกใน `.env.example` ทุกครั้งที่มี Key ใหม่
   - **ห้ามใส่ Hardcoded Secrets, Passwords, Token Keys ในโค้ดเด็ดขาด**
2. **CORS & Body Size**:
   - กำหนดผ่าน `main.ts` เท่านั้น (ปัจจุบันรองรับ Body Size สูงสุด 100MB)

---

## 🤖 7. คำแนะนำสำหรับ AI Assistant ในการ Implement โค้ด

1. **สรุปแนวทางก่อนเริ่ม Coding เสมอ (Plan & Confirm First)**: หากผู้ใช้ยังไม่ได้สั่งให้เริ่มลงมือเขียนโค้ดชัดเจน (เช่น ยังอยู่ในขั้นตอนถามไอเดีย หรือปรึกษาแนวทาง) **ต้องพูดคุย ปรึกษา และสรุปขั้นตอนการทำงานให้ผู้ใช้เห็นภาพและอนุมัติก่อนเสมอ ห้ามลงมือแก้ไขหรือสร้างโค้ดโดยพลการจนกว่าผู้ใช้จะบอกให้ลงมือทำ**
2. **อธิบายและสอนแนวคิดการทำงาน (Explain & Teach)**: เมื่อมีการนำเทคโนโลยีหรือฟีเจอร์ใหม่อย่าง **Redis (`ioredis`)**, Caching, หรือ Queue มาใช้ในโปรเจกต์ **AI จะต้องอธิบายวิธีการทำงาน แนวคิด (Concept), และการเขียนโค้ดอย่างละเอียด เข้าใจง่าย เพื่อให้ผู้ใช้ได้ฝึกและเข้าใจกระบวนการทำงานจริงควบคู่ไปด้วยเสมอ**
3. **ตรวจเช็กก่อนแก้ไข**: อ่านโครงสร้างไฟล์เดิมก่อนเสมอ เพื่อให้โค้ดใหม่สอดคล้องกับแบบแผนเดิม
4. **รักษาความสะอาดของโค้ด**: ไม่ลบ Comments หรือ Utility ที่มีอยู่เดิมโดยไม่จำเป็น
5. **ห้าม Over-engineer**: เขียนโค้ดที่กระชับ ตรงประเด็น อ่านง่าย และ Maintain สะดวก
6. **ถามเพื่อความชัดเจน**: หาก Requirement ไม่ชัดเจนหรือไม่แน่ใจในความต้องการของผู้ใช้ ให้สอบถามก่อนเริ่มลงมือทำเสมอ
