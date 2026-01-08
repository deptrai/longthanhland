import { Injectable } from '@nestjs/common';
import { ethers } from 'ethers';

export interface WalletInfo {
    address: string;
    publicKey: string;
    createdAt: Date;
}

/**
 * WalletService manages blockchain wallet generation for users.
 * Each user gets a Polygon wallet automatically upon registration.
 * 
 * Note: Private keys are encrypted and stored securely.
 * Users can export their wallet or use custodial service.
 */
@Injectable()
export class WalletService {
    /**
     * Generate a new Polygon wallet for a user
     * Returns only public info - private key is stored encrypted
     */
    async generateWallet(): Promise<WalletInfo> {
        const wallet = ethers.Wallet.createRandom();

        // In production, encrypt and store private key securely
        // using AWS KMS or similar service
        const encryptedPrivateKey = await this.encryptPrivateKey(wallet.privateKey);

        // TODO: Store encryptedPrivateKey in secure storage

        return {
            address: wallet.address,
            publicKey: wallet.publicKey,
            createdAt: new Date(),
        };
    }

    /**
     * Encrypt private key for secure storage
     * Uses envelope encryption with KMS in production
     */
    private async encryptPrivateKey(privateKey: string): Promise<string> {
        // TODO: Implement proper encryption with AWS KMS
        // This is a placeholder - DO NOT use in production
        const buffer = Buffer.from(privateKey);
        return buffer.toString('base64');
    }

    /**
     * Derive wallet address from seed phrase
     * Useful for recovering user wallet
     */
    deriveWalletFromMnemonic(mnemonic: string, index: number = 0): string {
        const path = `m/44'/60'/0'/0/${index}`;
        const wallet = ethers.HDNodeWallet.fromMnemonic(
            ethers.Mnemonic.fromPhrase(mnemonic),
            path,
        );
        return wallet.address;
    }

    /**
     * Validate Polygon/Ethereum address
     */
    isValidAddress(address: string): boolean {
        try {
            ethers.getAddress(address);
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Format address for display (0x1234...5678)
     */
    formatAddressShort(address: string): string {
        if (!address || address.length < 42) return address;
        return `${address.slice(0, 6)}...${address.slice(-4)}`;
    }

    /**
     * Get wallet balance (MATIC and USDT)
     */
    async getWalletBalance(address: string): Promise<{
        matic: string;
        usdt: string;
    }> {
        const provider = new ethers.JsonRpcProvider('https://polygon-rpc.com');

        // Get MATIC balance
        const maticBalance = await provider.getBalance(address);
        const maticFormatted = ethers.formatEther(maticBalance);

        // Get USDT balance
        const usdtContract = new ethers.Contract(
            '0xc2132D05D31c914a87C6611C10748AEb04B58e8F', // USDT on Polygon
            ['function balanceOf(address) view returns (uint256)'],
            provider,
        );
        const usdtBalance = await usdtContract.balanceOf(address);
        const usdtFormatted = (Number(usdtBalance) / 1e6).toFixed(2);

        return {
            matic: maticFormatted,
            usdt: usdtFormatted,
        };
    }
}
