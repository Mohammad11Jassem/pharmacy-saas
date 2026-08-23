import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UnitOfWork } from '../../../common/TransactionWrapper/unit-of-work';
import { OfferScope } from '../../../generated/prisma/enums';
import { AssignPrivateOfferDto } from '../dto/assign-private-offer.dto';
import {
  compareCalendarDates,
  getSubscriptionToday,
  toDateOnly,
} from '../helpers/subscription-date.helper';

@Injectable()
export class AssignPrivateOfferUseCase {
  constructor(
    private readonly unitOfWork: UnitOfWork,
  ) {}

  async execute(
    offerId: number,
    dto: AssignPrivateOfferDto,
  ) {
    return this.unitOfWork.execute(
      async (tx) => {
        const now = new Date();
        const today = getSubscriptionToday(now);

        const offer =
          await tx.planOffer.findUnique({
            where: {
              offerId,
            },

            select: {
              offerId: true,

              code: true,

              title: true,

              scope: true,

              isActive: true,

              startsAt: true,

              endsAt: true,

              plan: {
                select: {
                  planId: true,

                  code: true,

                  name: true,
                },
              },
            },
          });

        if (!offer) {
          throw new NotFoundException(
            'Offer not found.',
          );
        }

        if (
          offer.scope !==
          OfferScope.PRIVATE
        ) {
          throw new BadRequestException(
            'Only PRIVATE offers can be assigned to pharmacies.',
          );
        }

        if (!offer.isActive) {
          throw new BadRequestException(
            'Offer is inactive.',
          );
        }

        if (compareCalendarDates(offer.endsAt, today) < 0) {
          throw new BadRequestException(
            'Offer has already expired.',
          );
        }

        const pharmacyIds = [
          ...new Set(
            dto.pharmacyIds,
          ),
        ];

        /*
         * Calendar-date only:
         * - if the offer already started, default validFrom = today.
         * - otherwise default validFrom = offer start date.
         */
        const offerStartDate = toDateOnly(offer.startsAt);
        const offerEndDate = toDateOnly(offer.endsAt);
        const defaultValidFrom =
          compareCalendarDates(today, offerStartDate) >= 0
            ? today
            : offerStartDate;

        let validFrom: Date;
        let validUntil: Date;

        try {
          validFrom = dto.validFrom
            ? toDateOnly(dto.validFrom)
            : defaultValidFrom;

          validUntil = dto.validUntil
            ? toDateOnly(dto.validUntil)
            : offerEndDate;
        } catch {
          throw new BadRequestException('Invalid grant validity dates.');
        }

        /*
         * Grant end date is inclusive, therefore a one-day grant is valid.
         */
        if (compareCalendarDates(validUntil, validFrom) < 0) {
          throw new BadRequestException(
            'validUntil cannot be before validFrom.',
          );
        }

        /*
         * The grant cannot live outside the inclusive offer date range.
         */
        if (
          compareCalendarDates(validFrom, offerStartDate) < 0 ||
          compareCalendarDates(validUntil, offerEndDate) > 0
        ) {
          throw new BadRequestException(
            'Grant validity must be inside the offer validity period.',
          );
        }

        const pharmacies =
          await tx.pharmacy.findMany({
            where: {
              pharmacyId: {
                in: pharmacyIds,
              },
            },

            select: {
              pharmacyId: true,
            },
          });

        if (
          pharmacies.length !==
          pharmacyIds.length
        ) {
          const foundIds =
            new Set(
              pharmacies.map(
                (pharmacy) =>
                  pharmacy.pharmacyId,
              ),
            );

          const missingIds =
            pharmacyIds.filter(
              (pharmacyId) =>
                !foundIds.has(
                  pharmacyId,
                ),
            );

          throw new NotFoundException(
            `Pharmacies not found: ${missingIds.join(', ')}`,
          );
        }

        const result =
          await tx.pharmacyOfferGrant.createMany({
            data:
              pharmacyIds.map(
                (pharmacyId) => ({
                  pharmacyId,

                  offerId,

                  grantReason:
                    dto.grantReason,

                  validFrom,

                  validUntil,

                  note:
                    dto.note,
                }),
              ),

            skipDuplicates: true,
          });

        return {
          offer: {
            offerId:
              offer.offerId,

            code:
              offer.code,

            title:
              offer.title,

            plan:
              offer.plan,
          },

          requestedPharmacies:
            pharmacyIds.length,

          assignedPharmacies:
            result.count,

          skippedPharmacies:
            pharmacyIds.length -
            result.count,

          validFrom,

          validUntil,
        };
      },
    );
  }
}