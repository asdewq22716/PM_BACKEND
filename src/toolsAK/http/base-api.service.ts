import { HttpService } from '@nestjs/axios';
import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { AxiosError, AxiosRequestConfig } from 'axios';
import axios from 'axios';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class BaseApiService {
  protected readonly logger = new Logger(BaseApiService.name);

  constructor(protected readonly httpService: HttpService) {}

  protected getDefaultConfig(): AxiosRequestConfig {
    return {};
  }

  protected async request<T>(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH',
    url: string,
    data?: any,
    config?: AxiosRequestConfig,
  ): Promise<T> {
    try {
      const finalConfig: AxiosRequestConfig = {
        ...this.getDefaultConfig(),
        ...config,
        method,
        url,
        data,
      };

      const response = await firstValueFrom(
        this.httpService.request<T>(finalConfig),
      );
      return response.data;
    } catch (error) {
      this.handleApiError(error);
    }
  }

  async get<T>({
    url,
    config,
  }: {
    url: string;
    config?: AxiosRequestConfig;
  }): Promise<T> {
    return this.request<T>('GET', url, undefined, config);
  }

  async post<T>({
    url,
    data,
    config,
  }: {
    url: string;
    data?: any;
    config?: AxiosRequestConfig;
  }): Promise<T> {
    return this.request<T>('POST', url, data, config);
  }

  async put<T>({
    url,
    data,
    config,
  }: {
    url: string;
    data?: any;
    config?: AxiosRequestConfig;
  }): Promise<T> {
    return this.request<T>('PUT', url, data, config);
  }

  async delete<T>({
    url,
    config,
  }: {
    url: string;
    config?: AxiosRequestConfig;
  }): Promise<T> {
    return this.request<T>('DELETE', url, undefined, config);
  }

  private handleApiError(error: any): never {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;
      const response = axiosError.response;

      if (response) {
        this.logger.error(
          `API Respond Error: ${response.status} - ${JSON.stringify(response.data)}`,
        );
        throw new HttpException(
          {
            message: 'เซิร์ฟเวอร์ปลายทางแจ้งข้อผิดพลาด',
            detail: response.data,
          },
          response.status,
        );
      } else if (axiosError.request) {
        this.logger.error('API No Response (Timeout or Down)');
        throw new HttpException(
          'ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้ (Timeout)',
          HttpStatus.GATEWAY_TIMEOUT,
        );
      }
    }

    this.logger.error(`Unexpected Error: ${error.message}`, error.stack);
    throw new HttpException(
      `ระบบขัดข้อง: ${error.message || 'เกิดข้อผิดพลาดภายในระบบ'}`,
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }
}
