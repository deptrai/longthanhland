import { Injectable } from '@nestjs/common';

export interface QuarterlyUpdateNotification {
    treeOwnerId: string;
    treeCode: string;
    photoUrl: string;
    co2Absorbed: number;
    healthStatus: string;
    quarter: string;
}

/**
 * QuarterlyUpdateService manages automated quarterly tree updates
 * and notifications to tree owners.
 * 
 * Quarterly schedule:
 * - Q1: January - March
 * - Q2: April - June
 * - Q3: July - September
 * - Q4: October - December
 */
@Injectable()
export class QuarterlyUpdateService {
    /**
     * Get current quarter info
     */
    getCurrentQuarter(): { quarter: number; year: number; label: string } {
        const now = new Date();
        const quarter = Math.ceil((now.getMonth() + 1) / 3);
        const year = now.getFullYear();
        return {
            quarter,
            year,
            label: `Q${quarter}-${year}`,
        };
    }

    /**
     * Get quarter start and end dates
     */
    getQuarterDateRange(
        quarter: number,
        year: number,
    ): { start: Date; end: Date } {
        const startMonth = (quarter - 1) * 3;
        const endMonth = startMonth + 3;

        return {
            start: new Date(year, startMonth, 1),
            end: new Date(year, endMonth, 0, 23, 59, 59, 999),
        };
    }

    /**
     * Check if we're in the reporting period for a quarter
     * Reporting window: Last week of each quarter
     */
    isInReportingWindow(): boolean {
        const now = new Date();
        const { end } = this.getQuarterDateRange(
            Math.ceil((now.getMonth() + 1) / 3),
            now.getFullYear(),
        );

        // Check if within last 7 days of quarter
        const daysUntilEnd = Math.ceil(
            (end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
        );

        return daysUntilEnd >= 0 && daysUntilEnd <= 7;
    }

    /**
     * Generate quarterly report email content
     */
    generateQuarterlyReportEmail(
        ownerName: string,
        trees: Array<{
            treeCode: string;
            status: string;
            co2Absorbed: number;
            photoUrl?: string;
        }>,
    ): { subject: string; body: string; html: string } {
        const { label } = this.getCurrentQuarter();
        const totalCO2 = trees.reduce((sum, t) => sum + t.co2Absorbed, 0);

        const subject = `🌳 Báo cáo Quý ${label} - Vườn cây của bạn đang lớn!`;

        const body = `
Xin chào ${ownerName},

Đây là báo cáo định kỳ ${label} về ${trees.length} cây Dó Đen của bạn.

Tổng kết:
- Số cây: ${trees.length}
- Tổng CO2 hấp thụ: ${totalCO2.toFixed(1)} kg
- Tình trạng: ${trees.filter((t) => t.status === 'HEALTHY').length}/${trees.length} cây khỏe mạnh

Truy cập dashboard để xem chi tiết và ảnh mới nhất:
https://dainganxanh.vn/dashboard

Cảm ơn bạn đã đồng hành cùng Đại Ngàn Xanh! 🌱

---
Đại Ngàn Xanh - Trồng cây cho tương lai
    `.trim();

        const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${subject}</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #10B981 0%, #059669 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
    <h1 style="color: white; margin: 0;">🌳 Báo cáo Quý ${label}</h1>
    <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">Vườn cây của bạn đang lớn!</p>
  </div>
  
  <div style="background: #f3f4f6; padding: 30px; border-radius: 0 0 12px 12px;">
    <p>Xin chào <strong>${ownerName}</strong>,</p>
    
    <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
      <h3 style="margin-top: 0; color: #10B981;">📊 Tổng kết Quý ${label}</h3>
      <ul style="list-style: none; padding: 0; margin: 0;">
        <li style="padding: 8px 0; border-bottom: 1px solid #eee;">🌲 Số cây: <strong>${trees.length}</strong></li>
        <li style="padding: 8px 0; border-bottom: 1px solid #eee;">🌍 CO2 hấp thụ: <strong>${totalCO2.toFixed(1)} kg</strong></li>
        <li style="padding: 8px 0;">💚 Tình trạng: <strong>${trees.filter((t) => t.status === 'HEALTHY').length}/${trees.length} cây khỏe mạnh</strong></li>
      </ul>
    </div>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="https://dainganxanh.vn/dashboard" style="display: inline-block; background: #10B981; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold;">Xem chi tiết trong Dashboard</a>
    </div>
    
    <p style="color: #666; font-size: 14px; text-align: center;">
      Cảm ơn bạn đã đồng hành cùng Đại Ngàn Xanh! 🌱
    </p>
  </div>
  
  <div style="text-align: center; margin-top: 20px; color: #999; font-size: 12px;">
    <p>Đại Ngàn Xanh - Trồng cây cho tương lai</p>
  </div>
</body>
</html>
    `.trim();

        return { subject, body, html };
    }

    /**
     * Generate harvest reminder (year 5)
     */
    generateHarvestReminderEmail(
        ownerName: string,
        treeCode: string,
        plantingDate: Date,
        totalCO2: number,
    ): { subject: string; body: string } {
        const subject = `🎉 Cây ${treeCode} đã sẵn sàng thu hoạch!`;

        const body = `
Xin chào ${ownerName},

Tin vui! Cây Dó Đen ${treeCode} của bạn đã đủ 5 năm tuổi và sẵn sàng thu hoạch.

📅 Ngày trồng: ${plantingDate.toLocaleDateString('vi-VN')}
🌍 Tổng CO2 đã hấp thụ: ${totalCO2.toFixed(1)} kg

Bạn có 3 lựa chọn:
1. Thu hoạch và nhận tiền
2. Tiếp tục nuôi cây
3. Nhận sản phẩm trầm hương

Truy cập link sau để chọn phương án:
https://dainganxanh.vn/harvest/${treeCode}

Chúng tôi sẽ liên hệ trong 7 ngày tới nếu bạn chưa phản hồi.

Cảm ơn bạn! 🌳

---
Đại Ngàn Xanh Team
    `.trim();

        return { subject, body };
    }
}
