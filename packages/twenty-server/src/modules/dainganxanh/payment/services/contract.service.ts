import { Injectable, Logger } from '@nestjs/common';
import * as puppeteer from 'puppeteer';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import * as nodemailer from 'nodemailer';

export interface ContractData {
  orderCode: string;
  customerName: string;
  customerId: string;
  customerEmail: string;
  customerPhone?: string;
  treeCount: number;
  totalAmount: number;
  treeCodes: string[];
  lotName: string;
  paymentMethod: 'BANKING' | 'USDT';
  paymentDate: Date;
  contractDate: Date;
}

/**
 * ContractService generates legal contracts for tree purchases.
 * Contracts are generated as PDF and sent via email.
 */
@Injectable()
export class ContractService {
  private readonly logger = new Logger(ContractService.name);
  private readonly s3Client: S3Client;
  private readonly S3_BUCKET = process.env.AWS_S3_BUCKET_NAME || 'dainganxanh-contracts';
  private readonly REGION = process.env.AWS_REGION || 'ap-southeast-1';
  private readonly transporter: nodemailer.Transporter;

  constructor() {
    this.s3Client = new S3Client({
      region: this.REGION,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
      },
    });

    // Initialize email transporter (Mock for now or use environment variables)
    this.transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST || 'smtp.gmail.com',
      port: Number(process.env.EMAIL_PORT) || 587,
      secure: false, // true for 465, false for other ports
      auth: {
        user: process.env.EMAIL_USER || 'mock_user',
        pass: process.env.EMAIL_PASS || 'mock_pass',
      },
    });
  }

  /**
   * Generate PDF from HTML content using Puppeteer
   */
  async generatePdf(htmlContent: string): Promise<Buffer> {
    let browser;
    try {
      browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });
      const page = await browser.newPage();
      await page.setContent(htmlContent, { waitUntil: 'networkidle0' });

      // Generate PDF buffer
      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '20px',
          right: '20px',
          bottom: '20px',
          left: '20px',
        },
      });

      return Buffer.from(pdfBuffer);
    } catch (error) {
      this.logger.error(`Failed to generate PDF: ${error.message}`, error.stack);
      throw error;
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }

  /**
   * Upload PDF to S3
   */
  async uploadToS3(filename: string, pdfBuffer: Buffer): Promise<string> {
    const key = `contracts/${filename}`;

    try {
      const command = new PutObjectCommand({
        Bucket: this.S3_BUCKET,
        Key: key,
        Body: pdfBuffer,
        ContentType: 'application/pdf',
      });

      await this.s3Client.send(command);

      // Construct Public URL (or logic for Signed URL)
      const url = `https://${this.S3_BUCKET}.s3.${this.REGION}.amazonaws.com/${key}`;
      this.logger.log(`Uploaded contract to ${url}`);
      return url;
    } catch (error) {
      this.logger.error(`Failed to upload to S3: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Send contract via email
   */
  async sendContractEmail(
    to: string,
    customerName: string,
    pdfBuffer: Buffer,
    filename: string
  ): Promise<void> {
    if (!process.env.EMAIL_USER) {
      this.logger.warn('Skipping email send: EMAIL_USER not configured');
      return;
    }

    // Let caller handle errors
    await this.transporter.sendMail({
      from: '"Đại Ngàn Xanh" <no-reply@dainganxanh.vn>',
      to,
      subject: 'Hợp đồng trồng cây Dó Đen của bạn',
      text: `Xin chào ${customerName},\n\nĐính kèm là hợp đồng trồng cây Dó Đen của bạn.\n\nTrân trọng,\nĐại Ngàn Xanh Team`,
      html: `<p>Xin chào <strong>${customerName}</strong>,</p><p>Đính kèm là hợp đồng trồng cây Dó Đen của bạn.</p><p>Trân trọng,<br>Đại Ngàn Xanh Team</p>`,
      attachments: [
        {
          filename,
          content: pdfBuffer,
          contentType: 'application/pdf',
        },
      ],
    });
    this.logger.log(`Sent contract email to ${to}`);
  }
  /**
   * Generate contract metadata for PDF generation
   */
  generateContractMetadata(data: ContractData): {
    contractNumber: string;
    signingDate: string;
    expiryDate: string;
  } {
    const contractNumber = `HD-${data.orderCode}`;
    const signingDate = data.contractDate.toLocaleDateString('vi-VN');

    // Contract expires after 6 years (5 years + 1 year buffer)
    const expiryDate = new Date(data.contractDate);
    expiryDate.setFullYear(expiryDate.getFullYear() + 6);

    return {
      contractNumber,
      signingDate,
      expiryDate: expiryDate.toLocaleDateString('vi-VN'),
    };
  }

  /**
   * Generate contract HTML content for PDF conversion
   */
  generateContractHtml(data: ContractData): string {
    const { contractNumber, signingDate, expiryDate } = this.generateContractMetadata(data);

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Hợp đồng trồng cây ${contractNumber}</title>
  <style>
    body { font-family: 'Times New Roman', serif; line-height: 1.6; padding: 40px; max-width: 800px; margin: 0 auto; }
    h1 { text-align: center; color: #10B981; }
    h2 { color: #059669; border-bottom: 1px solid #10B981; padding-bottom: 5px; }
    .header { text-align: center; margin-bottom: 30px; }
    .parties { display: flex; justify-content: space-between; margin: 20px 0; }
    .party { width: 45%; }
    .terms { margin: 20px 0; }
    .terms ol { padding-left: 20px; }
    .signature { display: flex; justify-content: space-between; margin-top: 50px; }
    .signature-box { width: 40%; text-align: center; }
    .tree-list { background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0; }
    .footer { margin-top: 30px; text-align: center; font-size: 12px; color: #666; }
  </style>
</head>
<body>
  <div class="header">
    <h1>🌳 HỢP ĐỒNG TRỒNG CÂY DÓ ĐEN</h1>
    <p><strong>Số hợp đồng:</strong> ${contractNumber}</p>
    <p><strong>Ngày ký:</strong> ${signingDate}</p>
  </div>

  <div class="parties">
    <div class="party">
      <h3>BÊN A: CÔNG TY</h3>
      <p><strong>Tên:</strong> Công ty CP Đại Ngàn Xanh</p>
      <p><strong>Địa chỉ:</strong> [Địa chỉ công ty]</p>
      <p><strong>MST:</strong> [Mã số thuế]</p>
      <p><strong>Người đại diện:</strong> [Tên giám đốc]</p>
    </div>
    <div class="party">
      <h3>BÊN B: KHÁCH HÀNG</h3>
      <p><strong>Họ tên:</strong> ${data.customerName}</p>
      <p><strong>Mã KH:</strong> ${data.customerId}</p>
      <p><strong>Email:</strong> ${data.customerEmail}</p>
      ${data.customerPhone ? `<p><strong>SĐT:</strong> ${data.customerPhone}</p>` : ''}
    </div>
  </div>

  <h2>Điều 1: Nội dung hợp đồng</h2>
  <p>Bên B đồng ý đầu tư trồng cây Dó Đen (Aquilaria) với Bên A theo các điều khoản sau:</p>
  
  <div class="tree-list">
    <p><strong>Số lượng cây:</strong> ${data.treeCount} cây</p>
    <p><strong>Đơn giá:</strong> 260,000 VND/cây</p>
    <p><strong>Tổng giá trị:</strong> ${data.totalAmount.toLocaleString('vi-VN')} VNĐ</p>
    <p><strong>Phương thức thanh toán:</strong> ${data.paymentMethod === 'BANKING' ? 'Chuyển khoản ngân hàng' : 'USDT'}</p>
    <p><strong>Ngày thanh toán:</strong> ${data.paymentDate.toLocaleDateString('vi-VN')}</p>
    <p><strong>Khu vực trồng:</strong> ${data.lotName}</p>
    <p><strong>Mã cây:</strong></p>
    <ul>
      ${data.treeCodes.map((code) => `<li>${code}</li>`).join('')}
    </ul>
  </div>

  <h2>Điều 2: Quyền và nghĩa vụ của Bên A</h2>
  <ol>
    <li>Trồng và chăm sóc cây trong suốt 5 năm</li>
    <li>Cung cấp ảnh cập nhật hàng quý qua hệ thống dashboard</li>
    <li>Thay thế cây mới nếu cây chết trong thời gian chăm sóc</li>
    <li>Thông báo cho Bên B trước 3 tháng khi cây đến tuổi thu hoạch</li>
    <li>Cam kết tỷ lệ sống tối thiểu 90%</li>
  </ol>

  <h2>Điều 3: Quyền và nghĩa vụ của Bên B</h2>
  <ol>
    <li>Được sở hữu ${data.treeCount} cây Dó Đen với mã định danh cụ thể</li>
    <li>Được theo dõi cây qua hệ thống online</li>
    <li>Được nhận báo cáo quý về tình trạng cây</li>
    <li>Sau 5 năm, được lựa chọn: nhận tiền, tiếp tục nuôi cây, hoặc nhận sản phẩm</li>
  </ol>

  <h2>Điều 4: Thời hạn hợp đồng</h2>
  <p>Hợp đồng có hiệu lực từ ${signingDate} đến ${expiryDate} (5 năm + 1 năm đệm).</p>

  <h2>Điều 5: Điều khoản chung</h2>
  <ol>
    <li>Hợp đồng được ký điện tử và có giá trị pháp lý theo Luật Giao dịch điện tử</li>
    <li>Mọi tranh chấp sẽ được giải quyết qua thương lượng, nếu không được sẽ đưa ra Tòa án có thẩm quyền</li>
    <li>Bên B có thể chuyển nhượng quyền sở hữu cây cho bên thứ 3 với sự đồng ý của Bên A</li>
  </ol>

  <div class="signature">
    <div class="signature-box">
      <p><strong>ĐẠI DIỆN BÊN A</strong></p>
      <p style="margin-top: 60px;">[Chữ ký điện tử]</p>
      <p>Công ty CP Đại Ngàn Xanh</p>
    </div>
    <div class="signature-box">
      <p><strong>BÊN B</strong></p>
      <p style="margin-top: 60px;">[Xác nhận điện tử]</p>
      <p>${data.customerName}</p>
    </div>
  </div>

  <div class="footer">
    <p>Hợp đồng này được tạo tự động bởi hệ thống Đại Ngàn Xanh</p>
    <p>Ngày tạo: ${new Date().toLocaleString('vi-VN')}</p>
    <p>Website: https://dainganxanh.vn | Email: support@dainganxanh.vn</p>
  </div>
</body>
</html>
    `.trim();
  }

  /**
   * Generate contract filename
   */
  generateFilename(orderCode: string): string {
    return `hop-dong-${orderCode.toLowerCase()}.pdf`;
  }

  /**
   * Validate contract data completeness
   */
  validateContractData(data: Partial<ContractData>): string[] {
    const errors: string[] = [];

    if (!data.orderCode) errors.push('Thiếu mã đơn hàng');
    if (!data.customerName) errors.push('Thiếu tên khách hàng');
    if (!data.customerId) errors.push('Thiếu mã khách hàng');
    if (!data.customerEmail) errors.push('Thiếu email');
    if (!data.treeCount || data.treeCount <= 0) errors.push('Số lượng cây không hợp lệ');
    if (!data.treeCodes || data.treeCodes.length === 0) errors.push('Thiếu mã cây');
    if (!data.lotName) errors.push('Thiếu tên lô cây');

    return errors;
  }
}
