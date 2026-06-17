import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { Prisma } from "../../generated/prisma/client";

@Injectable()
export class UnitOfWork {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async execute<T>(
    work: (
      tx: Prisma.TransactionClient,
    ) => Promise<T>,
  ): Promise<T> {
     const result =
      await this.prisma.$transaction(work);
    return result;
  }

  async executeSerializable<T>(
    work: (tx: Prisma.TransactionClient) => Promise<T>,
    maxRetries = 5,
  ): Promise<T> {
    let lastError: unknown;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await this.prisma.$transaction(work, {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
          maxWait: 5000,
          timeout: 15000,
        });
      } catch (error) {
        lastError = error;

        if (!this.isRetryableTransactionError(error) || attempt === maxRetries) {
          throw error;
        }

        await this.sleep(50 * attempt);
      }
    }

    throw lastError;
  }

  private isRetryableTransactionError(error: unknown): boolean {
    return (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2034'
    );
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}