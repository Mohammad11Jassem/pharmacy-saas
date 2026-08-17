import { Injectable } from '@nestjs/common';

import { SmartSuggestionsRepository } from './smart-suggestions.repository';
import { IncomingOrderItem, SmartSuggestion } from './smart-suggestion.type';

@Injectable()
export class SmartSuggestionsService {
  constructor(private readonly repository: SmartSuggestionsRepository) {}

  /**
   * مقترحات الطلب الذكية.
   */
  async getSmartSuggestions(pharmacyId: number): Promise<SmartSuggestion[]> {
    return this.repository.getSmartSuggestions(pharmacyId);
  }

  /**
   * تتبع الطلبات القادمة من المورد.
   */
  async getIncomingOrders(pharmacyId: number): Promise<IncomingOrderItem[]> {
    return this.repository.getIncomingOrders(pharmacyId);
  }
}
