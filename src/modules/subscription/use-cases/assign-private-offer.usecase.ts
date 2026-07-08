import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UnitOfWork } from '../../../common/TransactionWrapper/unit-of-work';
import { OfferScope } from '../../../generated/prisma/enums';
import { AssignPrivateOfferDto } from '../dto/assign-private-offer.dto';

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

        if (
          offer.endsAt < now
        ) {
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
         * إذا العرض بدأ:
         * validFrom الافتراضي = الآن
         *
         * إذا العرض لم يبدأ بعد:
         * validFrom الافتراضي = offer.startsAt
         */
        const defaultValidFrom =
          now > offer.startsAt
            ? now
            : offer.startsAt;

        const validFrom =
          dto.validFrom
            ? new Date(
                dto.validFrom,
              )
            : defaultValidFrom;

        /*
         * إذا الإدارة لم تحدد validUntil
         * فصلاحية الـ grant تنتهي مع العرض نفسه.
         */
        const validUntil =
          dto.validUntil
            ? new Date(
                dto.validUntil,
              )
            : offer.endsAt;

        if (
          validUntil <= validFrom
        ) {
          throw new BadRequestException(
            'validUntil must be after validFrom.',
          );
        }

        /*
         * الـ Grant لا يمكن أن يعيش خارج
         * مدة الـ PlanOffer.
         */
        if (
          validFrom <
            offer.startsAt ||
          validUntil >
            offer.endsAt
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