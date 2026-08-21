import { Injectable } from '@nestjs/common';
import { Workbook, Alignment, Fill, Borders, Font } from 'exceljs';

@Injectable()
export class PurchaseOrderExcelService {
  async generate(purchaseOrder: any): Promise<Buffer> {
    const workbook = new Workbook();
    const sheet = workbook.addWorksheet('طلبية مورد');

    /*
     * جعل اتجاه الورقة من اليمين إلى اليسار
     */
    sheet.views = [
      {
        rightToLeft: true,
        state: 'normal',
      },
    ];

    /*
     * إعدادات عامة للأعمدة
     */
    sheet.columns = [
      { key: 'a', width: 24 },
      { key: 'b', width: 28 },
      { key: 'c', width: 18 },
      { key: 'd', width: 28 },
    ];

    const centerAlignment: Partial<Alignment> = {
      vertical: 'middle',
      horizontal: 'center',
    };

    const rightAlignment: Partial<Alignment> = {
      vertical: 'middle',
      horizontal: 'right',
    };

    const sectionFill: Fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'D9EAF7' },
    };

    const tableHeaderFill: Fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'B7DEE8' },
    };

    const thinBorders: Partial<Borders> = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' },
    };

    const titleFont: Partial<Font> = {
      bold: true,
      size: 18,
      name: 'Arial',
    };

    const boldFont: Partial<Font> = {
      bold: true,
      name: 'Arial',
    };

    const normalFont: Partial<Font> = {
      name: 'Arial',
      size: 12,
    };

    /*
     * العنوان
     */
    sheet.mergeCells('A1:D1');
    const titleCell = sheet.getCell('A1');
    titleCell.value = 'طلبية مورد';
    titleCell.font = titleFont;
    titleCell.alignment = centerAlignment;
    titleCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'E2F0D9' },
    };
    titleCell.border = thinBorders;
    sheet.getRow(1).height = 28;

    /*
     * معلومات الطلب الأساسية
     */
    sheet.addRow([]);

    const row3 = sheet.addRow([
      'رقم الطلب',
      purchaseOrder.purchaseOrderId,
      'تاريخ الطلب',
      this.formatDate(purchaseOrder.orderDate),
    ]);
    this.styleInfoRow(row3, boldFont, normalFont, thinBorders, rightAlignment);

    sheet.addRow([]);

    /*
     * معلومات الصيدلية
     */
    const pharmacySectionRowNumber = sheet.addRow(['معلومات الصيدلية']).number;
    sheet.mergeCells(
      `A${pharmacySectionRowNumber}:D${pharmacySectionRowNumber}`,
    );
    const pharmacySectionCell = sheet.getCell(`A${pharmacySectionRowNumber}`);
    pharmacySectionCell.font = boldFont;
    pharmacySectionCell.alignment = rightAlignment;
    pharmacySectionCell.fill = sectionFill;
    pharmacySectionCell.border = thinBorders;

    const pharmacyNameRow = sheet.addRow([
      'اسم الصيدلية',
      purchaseOrder.pharmacy?.pharmacyName ?? '',
      'رقم الموبايل',
      purchaseOrder.pharmacy?.phone ?? '',
    ]);
    this.styleInfoRow(
      pharmacyNameRow,
      boldFont,
      normalFont,
      thinBorders,
      rightAlignment,
    );

    sheet.addRow([]);

    /*
     * معلومات المورد
     */
    const supplierSectionRowNumber = sheet.addRow(['معلومات المورد']).number;
    sheet.mergeCells(
      `A${supplierSectionRowNumber}:D${supplierSectionRowNumber}`,
    );
    const supplierSectionCell = sheet.getCell(`A${supplierSectionRowNumber}`);
    supplierSectionCell.font = boldFont;
    supplierSectionCell.alignment = rightAlignment;
    supplierSectionCell.fill = sectionFill;
    supplierSectionCell.border = thinBorders;

    const supplierInfoRow = sheet.addRow([
      'اسم المورد',
      purchaseOrder.supplier?.supplierName ?? '',
      'رقم الهاتف للمورد',
      purchaseOrder.supplier?.phone ?? '',
    ]);
    this.styleInfoRow(
      supplierInfoRow,
      boldFont,
      normalFont,
      thinBorders,
      rightAlignment,
    );

    sheet.addRow([]);

    /*
     * جدول الأدوية
     */
    const tableHeaderRow = sheet.addRow([
      'اسم الدواء',
      'الباركود',
      'الكمية',
      'الملاحظة',
    ]);

    tableHeaderRow.eachCell((cell) => {
      cell.font = boldFont;
      cell.alignment = centerAlignment;
      cell.fill = tableHeaderFill;
      cell.border = thinBorders;
    });

    sheet.getRow(tableHeaderRow.number).height = 22;

    for (const item of purchaseOrder.items ?? []) {
      const drug = item.pharmacyDrug?.drug;

      let drugName = '';
      let barcode = '';

      if (drug?.generalDrug) {
        drugName = drug.generalDrug.tradeName ?? '';
        barcode = drug.generalDrug.barcode ?? '';
      } else if (drug?.privateDrug) {
        drugName = drug.privateDrug.tradeName ?? '';
        barcode = drug.privateDrug.barcode ?? '';
      }

      const itemRow = sheet.addRow([
        drugName,
        barcode,
        item.orderedQuantityBoxes ?? 0,
        item.notes ?? '',
      ]);

      itemRow.eachCell((cell, colNumber) => {
        cell.font = normalFont;
        cell.border = thinBorders;

        if (colNumber === 3) {
          cell.alignment = centerAlignment;
        } else {
          cell.alignment = rightAlignment;
        }
      });
    }

    /*
     * تحسين الالتفاف للنصوص
     */
    sheet.eachRow((row) => {
      row.eachCell((cell) => {
        cell.alignment = {
          ...cell.alignment,
          wrapText: true,
          vertical: 'middle',
        };
      });
    });

    /*
     * إرجاع الملف
     */
    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  private styleInfoRow(
    row: any,
    boldFont: Partial<Font>,
    normalFont: Partial<Font>,
    border: Partial<Borders>,
    alignment: Partial<Alignment>,
  ) {
    row.eachCell((cell: any, colNumber: number) => {
      cell.border = border;
      cell.alignment = alignment;

      if (colNumber === 1 || colNumber === 3) {
        cell.font = boldFont;
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'F2F2F2' },
        };
      } else {
        cell.font = normalFont;
      }
    });

    row.height = 20;
  }

  private formatDate(date: Date | string) {
    const parsedDate = new Date(date);

    return new Intl.DateTimeFormat('en-GB', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(parsedDate);
  }
}
