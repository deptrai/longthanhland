import { Injectable } from '@nestjs/common';
import { ethers } from 'ethers';

export interface UsdtPaymentInfo {
    walletAddress: string;
    amount: number;
    usdtAmount: number;
    network: string;
    qrValue: string;
}

/**
 * UsdtService handles USDT (Tether) payments on Polygon network.
 * 
 * Polygon is chosen for:
 * - Low gas fees (~$0.01 per transaction)
 * - Fast confirmation times (~2 seconds)
 * - EVM compatibility
 */
@Injectable()
export class UsdtService {
    private readonly USDT_CONTRACT_POLYGON = '0xc2132D05D31c914a87C6611C10748AEb04B58e8F';
    private readonly POLYGON_RPC = 'https://polygon-rpc.com';
    private readonly COMPANY_WALLET = process.env.DGNX_USDT_WALLET || '0x...';

    // Exchange rate (will be fetched from oracle in production)
    private readonly VND_TO_USD_RATE = 1 / 25000; // 1 USD = ~25,000 VND

    /**
     * Generate USDT payment information
     */
    generatePaymentInfo(amountVnd: number): UsdtPaymentInfo {
        const usdAmount = amountVnd * this.VND_TO_USD_RATE;
        // USDT has 6 decimals
        const usdtAmount = Math.round(usdAmount * 100) / 100;

        return {
            walletAddress: this.COMPANY_WALLET,
            amount: amountVnd,
            usdtAmount,
            network: 'Polygon',
            qrValue: this.generateQRValue(usdtAmount),
        };
    }

    /**
     * Generate EIP-681 compliant payment QR value
     */
    private generateQRValue(usdtAmount: number): string {
        // EIP-681 format for token transfer
        const amountWei = BigInt(Math.round(usdtAmount * 1e6));
        return `ethereum:${this.USDT_CONTRACT_POLYGON}@137/transfer?address=${this.COMPANY_WALLET}&uint256=${amountWei.toString()}`;
    }

    /**
     * Verify USDT transaction on Polygon
     */
    async verifyTransaction(
        txHash: string,
        expectedAmount: number,
    ): Promise<{
        verified: boolean;
        actualAmount?: number;
        sender?: string;
        error?: string;
    }> {
        try {
            const provider = new ethers.JsonRpcProvider(this.POLYGON_RPC);
            const receipt = await provider.getTransactionReceipt(txHash);

            if (!receipt) {
                return { verified: false, error: 'Transaction not found' };
            }

            if (receipt.status !== 1) {
                return { verified: false, error: 'Transaction failed' };
            }

            // Parse USDT transfer event
            const transferEventSignature = ethers.id('Transfer(address,address,uint256)');
            const transferLog = receipt.logs.find(
                (log) =>
                    log.address.toLowerCase() === this.USDT_CONTRACT_POLYGON.toLowerCase() &&
                    log.topics[0] === transferEventSignature,
            );

            if (!transferLog) {
                return { verified: false, error: 'USDT transfer not found in transaction' };
            }

            // Decode transfer amount (USDT has 6 decimals)
            const amountHex = transferLog.topics[3] || transferLog.data.slice(0, 66);
            const amountWei = BigInt(amountHex);
            const actualAmount = Number(amountWei) / 1e6;

            // Verify recipient
            const recipient = ethers.getAddress('0x' + transferLog.topics[2].slice(26));
            if (recipient.toLowerCase() !== this.COMPANY_WALLET.toLowerCase()) {
                return { verified: false, error: 'Wrong recipient' };
            }

            // Verify amount (5% tolerance for exchange rate fluctuation)
            const tolerance = 0.05;
            if (actualAmount < expectedAmount * (1 - tolerance)) {
                return {
                    verified: false,
                    actualAmount,
                    error: `Insufficient amount. Expected: ${expectedAmount}, Received: ${actualAmount}`,
                };
            }

            const sender = ethers.getAddress('0x' + transferLog.topics[1].slice(26));

            return {
                verified: true,
                actualAmount,
                sender,
            };
        } catch (error) {
            return {
                verified: false,
                error: `Verification error: ${error.message}`,
            };
        }
    }

    /**
     * Get current exchange rate from VND to USDT
     * In production, this would fetch from a price oracle
     */
    async getExchangeRate(): Promise<{
        vndToUsd: number;
        timestamp: Date;
        source: string;
    }> {
        // TODO: Integrate with price oracle (Chainlink, etc.)
        return {
            vndToUsd: this.VND_TO_USD_RATE,
            timestamp: new Date(),
            source: 'static', // Will be 'chainlink' or 'coingecko' in production
        };
    }

    /**
     * Lock exchange rate for a checkout session (15 minutes)
     */
    lockExchangeRate(sessionId: string): {
        rate: number;
        expiresAt: Date;
    } {
        const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
        // TODO: Store in Redis
        return {
            rate: this.VND_TO_USD_RATE,
            expiresAt,
        };
    }
}
