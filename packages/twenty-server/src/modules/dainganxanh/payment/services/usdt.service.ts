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
 * UsdtService handles USDT (Tether) payments on BSC (Binance Smart Chain).
 * 
 * BSC is chosen for:
 * - Low gas fees (~$0.10 per transaction)
 * - Fast confirmation times (~3 seconds)
 * - Wide adoption in Vietnam market
 * - EVM compatibility
 */
import { PAYMENT_CONSTANTS } from '../../shared/constants/payment.constants';

@Injectable()
export class UsdtService {
    // USDT BEP-20 Contract on BSC Mainnet
    private readonly USDT_CONTRACT_BSC = PAYMENT_CONSTANTS.USDT_BSC_CONTRACT;
    private readonly BSC_RPC = PAYMENT_CONSTANTS.BSC_RPC;
    private readonly COMPANY_WALLET = process.env.DGNX_USDT_WALLET || '0x...';

    // Exchange rate (will be fetched from oracle in production)
    private readonly VND_TO_USD_RATE = PAYMENT_CONSTANTS.VND_TO_USD_RATE;

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
            network: 'BSC',
            qrValue: this.generateQRValue(usdtAmount),
        };
    }

    /**
     * Generate EIP-681 compliant payment QR value
     */
    private generateQRValue(usdtAmount: number): string {
        // EIP-681 format for token transfer
        const amountWei = BigInt(Math.round(usdtAmount * 1e18)); // BSC USDT (BEP-20) uses 18 decimals usually? Wait, USDT on BSC is 18 decimals.
        // CHECK: USDT on BSC (0x55d398326f99059fF775485246999027B3197955) has 18 decimals.
        // Unlike Polygon/ERC20 USDT which often has 6. BEP-20 USDT matches ETH standard more closely?
        // Let's verify. BscScan says USDT (BEP20) decimals is 18.
        return `ethereum:${this.USDT_CONTRACT_BSC}@56/transfer?address=${this.COMPANY_WALLET}&uint256=${amountWei.toString()}`;
    }

    /**
     * Verify USDT transaction on BSC
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
            const provider = new ethers.JsonRpcProvider(this.BSC_RPC);
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
                    log.address.toLowerCase() === this.USDT_CONTRACT_BSC.toLowerCase() &&
                    log.topics[0] === transferEventSignature,
            );

            if (!transferLog) {
                return { verified: false, error: 'USDT transfer not found in transaction' };
            }

            // Decode transfer amount (USDT on BSC has 18 decimals)
            const amountHex = transferLog.topics[3] || transferLog.data.slice(0, 66);
            const amountWei = BigInt(amountHex);
            const actualAmount = Number(amountWei) / 1e18;

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
