export const BATCH_MAINTENANCE_QUEUE = 'batch-maintenance-queue';

export const EXPIRE_BATCHES_JOB = 'expire-batches';

export interface ExpireBatchesJobData {
  /**
   * YYYY-MM-DD
   *
   * أي Batch تاريخ صلاحيته أصغر من هذا التاريخ
   * يعتبر منتهي الصلاحية.
   */
  cutoffDate: string;
}
