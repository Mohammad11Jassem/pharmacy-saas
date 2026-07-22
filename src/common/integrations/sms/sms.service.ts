import {
  BadRequestException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SmsSendResult } from './interfaces/sms-send-result.interface';
// import axios from 'axios';
const DEFAULT_SMS_URL = 'https://www.traccar.org/sms/';
const DEFAULT_TIMEOUT_MS = 30_000;

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);

  constructor(private readonly configService: ConfigService) {}

  /**
   * Sends a general SMS message.
   */
  async sendSms(phone: string, message: string): Promise<SmsSendResult> {
    const normalizedPhone = phone?.trim();
    const normalizedMessage = message?.trim();

    if (!normalizedPhone) {
      throw new BadRequestException('Phone number is required');
    }

    if (!normalizedMessage) {
      throw new BadRequestException('SMS message is required');
    }

    const token = this.configService.get<string>('TRACCAR_SMS_TOKEN');

    if (!token) {
      this.logger.error('TRACCAR_SMS_TOKEN is not configured');

      throw new ServiceUnavailableException('SMS service is not configured');
    }

    const url =
      this.configService.get<string>('TRACCAR_SMS_URL') ?? DEFAULT_SMS_URL;

    const timeoutMs = this.getTimeoutMs();

    const abortController = new AbortController();

    // this is for the fetch timeout, since fetch does not have a built-in timeout option so we use AbortController to abort the request after the specified timeout
    /**
     * يبدأ طلب إرسال SMS.
يبدأ مؤقت مدته 30 ثانية.
إذا ردت خدمة SMS قبل 30 ثانية، يكمل الطلب بشكل طبيعي.
إذا لم ترد خلال 30 ثانية، يتم تنفيذ 
ندها يتم إلغاء fetch.
يرمي fetch خطأ اسمه عادةً: AbortError
     */
    const timeoutId = setTimeout(() => {
      abortController.abort();
    }, timeoutMs);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: token,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          to: normalizedPhone,
          message: normalizedMessage,
        }),
        signal: abortController.signal,
      });

      // const response = await axios.post(
      //   url,
      //   {
      //     to: phone,
      //     message: message,
      //   },
      //   {
      //     headers: {
      //       Authorization: token,
      //       'Content-Type': 'application/json',
      //       Accept: 'application/json',
      //     },
      //     timeout: 30000,
      //   },
      // );
      if (!response.ok) {
        this.logger.error(
          `SMS provider rejected request. Phone: ${this.maskPhone(
            normalizedPhone,
          )}, status: ${response.status}`,
        );

        throw new ServiceUnavailableException(
          'SMS provider rejected the request',
        );
      }

      this.logger.log(
        `SMS sent successfully to ${this.maskPhone(normalizedPhone)}`,
      );

      return {
        success: true,
        statusCode: response.status,
      };
    } catch (error: unknown) {
      if (error instanceof ServiceUnavailableException) {
        throw error;
      }

      const isTimeout = error instanceof Error && error.name === 'AbortError';

      const reason = error instanceof Error ? error.message : 'Unknown error';

      this.logger.error(
        `SMS sending failed for ${this.maskPhone(
          normalizedPhone,
        )}. Reason: ${reason}`,
      );

      throw new ServiceUnavailableException(
        isTimeout
          ? 'SMS provider request timed out'
          : 'Unable to send SMS currently',
      );
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Sends a previously generated OTP.
   *
   * OTP generation and storage should be handled
   * by the related authentication or verification service.
   */
  async sendOtp(phone: string, otp: string): Promise<SmsSendResult> {
    return this.sendSms(
      phone,
      //   `Your verification code is: ${otp}`,
      `Your number is: ${otp}`,
    );
  }

  private getTimeoutMs(): number {
    const configuredTimeout = this.configService.get<string>(
      'SMS_REQUEST_TIMEOUT_MS',
    );

    const parsedTimeout = Number(configuredTimeout);

    return Number.isFinite(parsedTimeout) && parsedTimeout > 0
      ? parsedTimeout
      : DEFAULT_TIMEOUT_MS;
  }

  private maskPhone(phone: string): string {
    if (phone.length <= 4) {
      return '****';
    }

    return `${'*'.repeat(phone.length - 4)}${phone.slice(-4)}`;
  }
}
