import { useCallback } from 'react';

import {
    formatCO2Display,
    getCO2Equivalents,
    getAgeInMonths,
    formatAge,
} from '../utils/carbonCalculator';
import type { Tree } from '@/dainganxanh/my-garden/types/Tree';

interface TreeReportData {
    tree: Tree;
    co2Absorbed: number;
    generatedAt: Date;
}

/**
 * Generates a PDF report for a tree using browser's print functionality
 * Creates a styled HTML document and triggers print dialog
 */
export const generateTreeReport = async (data: TreeReportData): Promise<void> => {
    const { tree, co2Absorbed, generatedAt } = data;

    const ageMonths = getAgeInMonths(tree.plantingDate);
    const equivalents = getCO2Equivalents(co2Absorbed);

    // Create a new window for printing
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    if (!printWindow) {
        alert('Vui lòng cho phép popup để tải báo cáo PDF');
        return;
    }

    // Generate HTML content
    const htmlContent = `
    <!DOCTYPE html>
    <html lang="vi">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Báo cáo Cây ${tree.treeCode} - Đại Ngàn Xanh</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          padding: 40px;
          max-width: 800px;
          margin: 0 auto;
          color: #333;
        }
        .header {
          text-align: center;
          margin-bottom: 32px;
          padding-bottom: 24px;
          border-bottom: 2px solid #2D5016;
        }
        .logo {
          font-size: 48px;
          margin-bottom: 8px;
        }
        .title {
          font-size: 28px;
          color: #2D5016;
          margin-bottom: 4px;
        }
        .subtitle {
          color: #666;
          font-size: 14px;
        }
        .tree-code {
          font-size: 24px;
          font-weight: bold;
          color: #2D5016;
          margin: 24px 0;
        }
        .section {
          margin-bottom: 24px;
        }
        .section-title {
          font-size: 18px;
          font-weight: 600;
          color: #2D5016;
          margin-bottom: 12px;
          padding-bottom: 8px;
          border-bottom: 1px solid #eee;
        }
        .info-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 16px;
        }
        .info-item {
          background: #f5f5f5;
          padding: 16px;
          border-radius: 8px;
        }
        .info-label {
          font-size: 12px;
          color: #666;
          margin-bottom: 4px;
        }
        .info-value {
          font-size: 20px;
          font-weight: 600;
          color: #2D5016;
        }
        .co2-impact {
          background: linear-gradient(135deg, #2D5016 0%, #4A8522 100%);
          color: white;
          padding: 24px;
          border-radius: 12px;
          text-align: center;
        }
        .co2-value {
          font-size: 48px;
          font-weight: bold;
          margin-bottom: 8px;
        }
        .equivalents {
          margin-top: 16px;
          display: flex;
          justify-content: space-around;
        }
        .equivalent-item {
          text-align: center;
        }
        .equivalent-icon {
          font-size: 24px;
        }
        .equivalent-value {
          font-size: 18px;
          font-weight: bold;
        }
        .equivalent-label {
          font-size: 10px;
          opacity: 0.8;
        }
        .footer {
          margin-top: 40px;
          padding-top: 16px;
          border-top: 1px solid #eee;
          text-align: center;
          font-size: 12px;
          color: #666;
        }
        .qr-section {
          text-align: center;
          margin-top: 24px;
        }
        @media print {
          body {
            padding: 20px;
          }
          .no-print {
            display: none;
          }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="logo">🌳</div>
        <h1 class="title">Đại Ngàn Xanh</h1>
        <p class="subtitle">Chứng nhận sở hữu cây xanh</p>
      </div>

      <div class="tree-code">Mã cây: ${tree.treeCode}</div>

      <div class="section">
        <h2 class="section-title">📋 Thông tin cây</h2>
        <div class="info-grid">
          <div class="info-item">
            <div class="info-label">Trạng thái</div>
            <div class="info-value">${tree.status}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Ngày trồng</div>
            <div class="info-value">${new Date(tree.plantingDate).toLocaleDateString('vi-VN')}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Tuổi cây</div>
            <div class="info-value">${formatAge(ageMonths)}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Vị trí</div>
            <div class="info-value">${tree.latitude ? `${tree.latitude.toFixed(4)}, ${tree.longitude.toFixed(4)}` : 'Chưa cập nhật'}</div>
          </div>
        </div>
      </div>

      <div class="section">
        <h2 class="section-title">🌍 Tác động môi trường</h2>
        <div class="co2-impact">
          <div class="co2-value">${formatCO2Display(co2Absorbed)}</div>
          <div>CO₂ đã hấp thụ</div>
          <div class="equivalents">
            ${equivalents.map(eq => `
              <div class="equivalent-item">
                <div class="equivalent-icon">${eq.icon}</div>
                <div class="equivalent-value">${eq.value.toLocaleString()}</div>
                <div class="equivalent-label">${eq.label}</div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>

      <div class="footer">
        <p>Báo cáo được tạo ngày ${generatedAt.toLocaleDateString('vi-VN', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
        <p>Đại Ngàn Xanh - Cùng nhau xanh hóa Việt Nam</p>
        <p style="margin-top: 8px;">www.dainganxanh.vn</p>
      </div>

      <div class="no-print" style="text-align: center; margin-top: 24px;">
        <button onclick="window.print()" style="padding: 12px 24px; background: #2D5016; color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 16px;">
          📥 Tải PDF
        </button>
      </div>

      <script>
        // Auto print when loaded
        window.onload = function() {
          setTimeout(function() {
            window.print();
          }, 500);
        };
      </script>
    </body>
    </html>
  `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
};

/**
 * Hook for generating tree reports
 */
export const useTreeReport = () => {
    const downloadReport = useCallback(async (tree: Tree, co2Absorbed: number) => {
        try {
            await generateTreeReport({
                tree,
                co2Absorbed,
                generatedAt: new Date(),
            });
        } catch (error) {
            console.error('[useTreeReport] Failed to generate report:', error);
            alert('Không thể tạo báo cáo. Vui lòng thử lại.');
        }
    }, []);

    return { downloadReport };
};
