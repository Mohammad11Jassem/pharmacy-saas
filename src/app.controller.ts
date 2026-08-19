import {
  Body,
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Post,
} from '@nestjs/common';
import { AppService } from './app.service';
import { Auth } from './iam/authentication/decorators/auth.decorator';
import { AuthType } from './iam/authentication/enums/auth-type.enum';
import { NotificationService } from './notification/notification.service';
import { NotificationUseCase } from './notification/notification.use-case';
import { getMessaging } from 'firebase-admin/messaging';
@Controller()
export class AppController {
  constructor(private readonly appService: AppService ) {}
  private readonly ragUrl =
    'https://44d5-185-100-234-183.ngrok-free.app/rag-test/ask';


  @Auth(AuthType.None)  
  @Post('test-firebase-notification')
  async testFirebaseNotification(@Body('fcmToken') fcmToken: string) {
    console.log('Received FCM Token:', fcmToken);
    await getMessaging().send({
          token: fcmToken,
    
          notification: {
            title: "اختبار إشعار Firebase",
            body: "اختبار إشعار Firebase من MediXa.",
          },
        });
  }
  @Auth(AuthType.None)
  @Get('health-check')
  getHello(): string {
    return this.appService.getHello();
  }

  @Auth(AuthType.None)
  @Post('test-rag')
  async testRag() {
    const controller = new AbortController();

    const timeoutId = setTimeout(() => {
      controller.abort();
    }, 60_000);

    try {
      const response = await fetch(this.ragUrl, {
        method: 'POST',

        headers: {
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true',
        },

        body: JSON.stringify({
          question: 'ما استخدامات دواء DOMPERON؟',
          topK: 4,
        }),

        signal: controller.signal,
      });

      const responseBody = await this.parseResponse(response);

      if (!response.ok) {
        throw new HttpException(
          {
            success: false,
            message: 'مشروع الـRAG أعاد استجابة خطأ.',
            ragStatusCode: response.status,
            details: responseBody,
          },
          HttpStatus.BAD_GATEWAY,
        );
      }

      return {
        success: true,
        message: 'تم الاتصال بمشروع الـRAG بنجاح.',
        data: responseBody,
      };
    } catch (error: unknown) {
      if (error instanceof HttpException) {
        throw error;
      }

      if (error instanceof Error && error.name === 'AbortError') {
        throw new HttpException(
          {
            success: false,
            message: 'انتهت مهلة انتظار مشروع الـRAG.',
          },
          HttpStatus.GATEWAY_TIMEOUT,
        );
      }

      throw new HttpException(
        {
          success: false,
          message: 'تعذر الاتصال بمشروع الـRAG.',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
        HttpStatus.BAD_GATEWAY,
      );
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private async parseResponse(response: Response): Promise<unknown> {
    const contentType = response.headers.get('content-type');

    if (contentType?.includes('application/json')) {
      return response.json();
    }

    return response.text();
  }
}
