import type { PrismaClient } from '../../../src/generated/prisma/client';

type PharmacyDocumentTypeSeed = {
  documentNameAr: string;
  issuingAuthority: string | null;
  isRequired: boolean;
};

const pharmacyDocumentTypes: PharmacyDocumentTypeSeed[] = [
  {
    documentNameAr: 'ترخيص الصيدلية',
    issuingAuthority: 'مديرية الصحة',
    isRequired: true,
  },
  {
    documentNameAr: 'هوية مالك الصيدلية',
    issuingAuthority: 'السجل المدني',
    isRequired: true,
  },
  {
    documentNameAr: 'شهادة مزاولة المهنة',
    issuingAuthority: 'نقابة الصيادلة',
    isRequired: true,
  },
  {
    documentNameAr: 'السجل التجاري',
    issuingAuthority: 'وزارة التجارة الداخلية',
    isRequired: false,
  },
  {
    documentNameAr: 'عقد إيجار أو ملكية العقار',
    issuingAuthority: null,
    isRequired: false,
  },
];

export async function seedPharmacyDocumentTypes(
  prisma: PrismaClient,
): Promise<void> {
  for (const documentType of pharmacyDocumentTypes) {
    const existing = await prisma.pharmacyDocumentType.findFirst({
      where: {
        documentNameAr: documentType.documentNameAr,
      },
      select: {
        documentTypeId: true,
      },
    });

    if (existing) {
      await prisma.pharmacyDocumentType.update({
        where: {
          documentTypeId: existing.documentTypeId,
        },
        data: documentType,
      });
    } else {
      await prisma.pharmacyDocumentType.create({
        data: documentType,
      });
    }
  }
}