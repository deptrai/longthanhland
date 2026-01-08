import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';

export interface BankTransferInfo {
    bankName: string;
    accountNumber: string;
    accountHolder: string;
    amount: number;
    content: string;
    qrCodeUrl: string;
}

export interface BankingWebhookPayload {
    transactionId: string;
    amount: number;
    content: string;
    bankCode: string;
    timestamp: string;
    signature: string;
}

/**
 * BankingService handles bank transfer payment verification
 * and webhook processing for the Đại Ngàn Xanh platform.
 */
@Injectable()
export class BankingService {
    private readonly bankAccounts = {
        VCB: {
            name: 'Vietcombank',
            number: '1234567890',
            holder: 'CONG TY CP DAI NGAN XANH',
        },
        TCB: {
            name: 'Techcombank',
            number: '0987654321',
            holder: 'CONG TY CP DAI NGAN XANH',
        },
    };

    /**
     * Generate unique order code for bank transfer content
     * Format: DGX-YYYYMMDD-XXXXX
     */
    generateOrderCode(): string {
        const date = new Date();
        const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
        const random = Math.random().toString(36).substring(2, 7).toUpperCase();
        return `DGX-${dateStr}-${random}`;
    }

    /**
     * Generate bank transfer information for payment
     */
    generateTransferInfo(
        amount: number,
        orderCode: string,
        bankCode: string = 'VCB',
    ): BankTransferInfo {
        const bank = this.bankAccounts[bankCode] || this.bankAccounts.VCB;
        const content = `Thanh toan ${orderCode}`;

        // Generate VietQR URL (standard QR format for Vietnamese banks)
        const qrCodeUrl = this.generateVietQRUrl(
            bank.number,
            bankCode,
            amount,
            content,
        );

        return {
            bankName: bank.name,
            accountNumber: bank.number,
            accountHolder: bank.holder,
            amount,
            content,
            qrCodeUrl,
        };
    }

    /**
     * Generate VietQR URL for payment
     * Uses VietQR API standard
     */
    private generateVietQRUrl(
        accountNumber: string,
        bankCode: string,
        amount: number,
        content: string,
    ): string {
        const baseUrl = 'https://img.vietqr.io/image';
        const encodedContent = encodeURIComponent(content);
        return `${baseUrl}/${bankCode}-${accountNumber}-compact2.png?amount=${amount}&addInfo=${encodedContent}`;
    }

    /**
     * Verify webhook signature from banking partner
     */
    verifyWebhookSignature(
        payload: string,
        signature: string,
        secretKey: string,
    ): boolean {
        const expectedSignature = crypto
            .createHmac('sha256', secretKey)
            .update(payload)
            .digest('hex');

        return crypto.timingSafeEqual(
            Buffer.from(signature),
            Buffer.from(expectedSignature),
        );
    }

    /**
     * Extract order code from bank transfer content
     * Content format: "Thanh toan DGX-YYYYMMDD-XXXXX" or similar
     */
    extractOrderCodeFromContent(content: string): string | null {
        const match = content.match(/DGX-\d{8}-[A-Z0-9]{5}/i);
        return match ? match[0].toUpperCase() : null;
    }

    /**
     * Validate payment amount matches order
     */
    validatePaymentAmount(
        paidAmount: number,
        expectedAmount: number,
        tolerancePercent: number = 1,
    ): boolean {
        const minAmount = expectedAmount * (1 - tolerancePercent / 100);
        const maxAmount = expectedAmount * (1 + tolerancePercent / 100);
        return paidAmount >= minAmount && paidAmount <= maxAmount;
    }

    /**
     * Calculate total amount from tree quantity
     */
    calculateOrderAmount(treeCount: number): number {
        const pricePerTree = 260000; // 260k VND per tree
        return treeCount * pricePerTree;
    }

    /**
     * Get breakdown of tree price
     */
    getPriceBreakdown(treeCount: number): {
        seedsCost: number;
        careCost: number;
        affiliateFund: number;
        total: number;
    } {
        // Per tree breakdown
        const seedsPerTree = 40000; // 40k - giống
        const carePerTree = 194000; // 194k - chăm sóc 5 năm
        const affiliatePerTree = 26000; // 26k - quỹ affiliate

        return {
            seedsCost: seedsPerTree * treeCount,
            careCost: carePerTree * treeCount,
            affiliateFund: affiliatePerTree * treeCount,
            total: 260000 * treeCount,
        };
    }
}
