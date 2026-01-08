import { Injectable } from '@nestjs/common';

export interface ShareCardData {
    userName: string;
    treeCount: number;
    co2Absorbed: number;
    orderId?: string;
    message?: string;
}

export interface ShareCardResult {
    imageUrl: string;
    width: number;
    height: number;
    shareText: string;
    shareUrl: string;
}

/**
 * ShareCardGeneratorService creates social media share cards
 * using server-side canvas rendering.
 * 
 * Cards are generated as PNG images with:
 * - User name or "Người gieo hạt"
 * - Number of trees planted
 * - CO2 impact equivalent
 * - Beautiful gradient background with tree icons
 */
@Injectable()
export class ShareCardGeneratorService {
    private readonly cardWidth = 1200;
    private readonly cardHeight = 630; // Facebook optimal aspect ratio

    /**
     * Generate SVG template for share card
     * SVG can be converted to PNG using sharp or similar library
     */
    generateShareCardSvg(data: ShareCardData): string {
        const displayName = data.userName || 'Người gieo hạt';
        const treesText = data.treeCount === 1 ? '1 cây' : `${data.treeCount} cây`;
        const co2Text = `= ${data.co2Absorbed.toFixed(1)} kg CO2 sẽ được hấp thụ mỗi năm`;
        const message = data.message || 'Tôi vừa góp phần trồng rừng cùng Đại Ngàn Xanh! 🌳';

        return `
<svg width="${this.cardWidth}" height="${this.cardHeight}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <!-- Gradient background -->
    <linearGradient id="bgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#10B981"/>
      <stop offset="50%" style="stop-color:#059669"/>
      <stop offset="100%" style="stop-color:#047857"/>
    </linearGradient>
    
    <!-- Pattern for subtle texture -->
    <pattern id="dots" x="0" y="0" width="30" height="30" patternUnits="userSpaceOnUse">
      <circle cx="15" cy="15" r="1" fill="rgba(255,255,255,0.1)"/>
    </pattern>
  </defs>

  <!-- Background -->
  <rect width="100%" height="100%" fill="url(#bgGradient)"/>
  <rect width="100%" height="100%" fill="url(#dots)"/>
  
  <!-- Decorative trees on sides -->
  <text x="100" y="500" font-size="120" fill="rgba(255,255,255,0.15)">🌲</text>
  <text x="200" y="550" font-size="80" fill="rgba(255,255,255,0.1)">🌳</text>
  <text x="1000" y="480" font-size="100" fill="rgba(255,255,255,0.15)">🌲</text>
  <text x="1050" y="580" font-size="70" fill="rgba(255,255,255,0.1)">🌳</text>
  
  <!-- Logo/Brand -->
  <text x="600" y="100" 
        font-family="Arial, sans-serif" 
        font-size="32" 
        font-weight="bold" 
        fill="rgba(255,255,255,0.9)" 
        text-anchor="middle">
    ĐẠI NGÀN XANH
  </text>
  
  <!-- Main tree icon -->
  <text x="600" y="250" font-size="100" text-anchor="middle">🌳</text>
  
  <!-- User message -->
  <text x="600" y="350" 
        font-family="Arial, sans-serif" 
        font-size="36" 
        fill="white" 
        text-anchor="middle"
        font-weight="bold">
    ${this.escapeXml(displayName)}
  </text>
  
  <text x="600" y="400" 
        font-family="Arial, sans-serif" 
        font-size="28" 
        fill="rgba(255,255,255,0.9)" 
        text-anchor="middle">
    đã trồng ${treesText} Dó Đen
  </text>
  
  <!-- CO2 impact -->
  <rect x="300" y="440" width="600" height="60" rx="30" fill="rgba(255,255,255,0.2)"/>
  <text x="600" y="480" 
        font-family="Arial, sans-serif" 
        font-size="24" 
        fill="white" 
        text-anchor="middle">
    🌍 ${this.escapeXml(co2Text)}
  </text>
  
  <!-- CTA -->
  <rect x="400" y="530" width="400" height="50" rx="25" fill="white"/>
  <text x="600" y="565" 
        font-family="Arial, sans-serif" 
        font-size="20" 
        fill="#10B981" 
        text-anchor="middle"
        font-weight="bold">
    Cùng trồng tại dainganxanh.vn
  </text>
</svg>
    `.trim();
    }

    /**
     * Generate social share text
     */
    generateShareText(data: ShareCardData): string {
        const treesText = data.treeCount === 1 ? '1 cây' : `${data.treeCount} cây`;
        const co2Yearly = data.co2Absorbed.toFixed(1);

        return `🌳 Tôi vừa trồng ${treesText} Dó Đen cho Mẹ Thiên Nhiên!\n\n` +
            `🌍 ${co2Yearly} kg CO2 sẽ được hấp thụ mỗi năm\n\n` +
            `Cùng góp phần xanh hóa Việt Nam tại:\n` +
            `👉 https://dainganxanh.vn\n\n` +
            `#ĐạiNgànXanh #TrồngCây #CarbonOffset #Vietnam`;
    }

    /**
     * Generate share URL with referral code
     */
    generateShareUrl(referralCode?: string): string {
        const baseUrl = 'https://dainganxanh.vn';
        if (referralCode) {
            return `${baseUrl}?ref=${referralCode}`;
        }
        return baseUrl;
    }

    /**
     * Generate Open Graph meta tags for share page
     */
    generateOgTags(data: ShareCardData, imageUrl: string): Record<string, string> {
        const treesText = data.treeCount === 1 ? '1 cây' : `${data.treeCount} cây`;
        const displayName = data.userName || 'Một người hảo tâm';

        return {
            'og:title': `${displayName} đã trồng ${treesText} cùng Đại Ngàn Xanh`,
            'og:description': `Góp phần hấp thụ ${data.co2Absorbed.toFixed(1)} kg CO2 mỗi năm. Bạn cũng có thể tham gia trồng rừng tại dainganxanh.vn`,
            'og:image': imageUrl,
            'og:image:width': String(this.cardWidth),
            'og:image:height': String(this.cardHeight),
            'og:type': 'website',
            'og:site_name': 'Đại Ngàn Xanh',
            'twitter:card': 'summary_large_image',
            'twitter:title': `${displayName} đã trồng ${treesText} 🌳`,
            'twitter:description': `Cùng trồng cây Dó Đen tại dainganxanh.vn`,
            'twitter:image': imageUrl,
        };
    }

    /**
     * Get S3 key for storing share card
     */
    getShareCardS3Key(orderId: string): string {
        return `share-cards/${orderId}.png`;
    }

    /**
     * Escape XML special characters
     */
    private escapeXml(text: string): string {
        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&apos;');
    }
}
