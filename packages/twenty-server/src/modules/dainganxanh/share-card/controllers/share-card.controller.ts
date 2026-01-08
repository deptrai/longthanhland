import { Controller, Get, Query, Res, Header } from '@nestjs/common';
import { Response } from 'express';
import { ShareCardGeneratorService } from '../services/share-card-generator.service';

/**
 * ShareCardController provides public endpoints for generating
 * and serving share cards.
 * 
 * Endpoints:
 * - GET /share-card/svg - Returns SVG share card
 * - GET /share-card/meta - Returns OG meta tags as JSON
 */
@Controller('share-card')
export class ShareCardController {
    constructor(
        private readonly shareCardGenerator: ShareCardGeneratorService,
    ) { }

    /**
     * Generate SVG share card
     * GET /share-card/svg?name=...&trees=...&co2=...
     */
    @Get('svg')
    @Header('Content-Type', 'image/svg+xml')
    @Header('Cache-Control', 'public, max-age=3600')
    generateSvg(
        @Query('name') name: string,
        @Query('trees') trees: string,
        @Query('co2') co2: string,
        @Res() res: Response,
    ): void {
        const treeCount = parseInt(trees, 10) || 1;
        const co2Absorbed = parseFloat(co2) || treeCount * 10; // Default ~10kg/tree/year

        const svg = this.shareCardGenerator.generateShareCardSvg({
            userName: name || 'Người gieo hạt',
            treeCount,
            co2Absorbed,
        });

        res.send(svg);
    }

    /**
     * Get share data for client-side rendering
     * GET /share-card/data?name=...&trees=...&co2=...&ref=...
     */
    @Get('data')
    @Header('Cache-Control', 'public, max-age=3600')
    getShareData(
        @Query('name') name: string,
        @Query('trees') trees: string,
        @Query('co2') co2: string,
        @Query('ref') referralCode: string,
    ): {
        shareText: string;
        shareUrl: string;
        ogTags: Record<string, string>;
        svgUrl: string;
    } {
        const treeCount = parseInt(trees, 10) || 1;
        const co2Absorbed = parseFloat(co2) || treeCount * 10;
        const userName = name || 'Người gieo hạt';

        const data = { userName, treeCount, co2Absorbed };
        const shareUrl = this.shareCardGenerator.generateShareUrl(referralCode);
        const shareText = this.shareCardGenerator.generateShareText(data);

        // Build SVG URL for image preview
        const svgParams = new URLSearchParams({
            name: userName,
            trees: String(treeCount),
            co2: String(co2Absorbed),
        });
        const svgUrl = `/share-card/svg?${svgParams.toString()}`;

        // Generate OG tags
        const imageUrl = `https://dainganxanh.vn${svgUrl}`;
        const ogTags = this.shareCardGenerator.generateOgTags(data, imageUrl);

        return {
            shareText,
            shareUrl,
            ogTags,
            svgUrl,
        };
    }

    /**
     * Share page with proper OG meta tags
     * This is meant to be the landing page for shared links
     * GET /share-card/page/:orderId
     */
    @Get('page/:orderId')
    @Header('Content-Type', 'text/html')
    async getSharePage(
        @Query('name') name: string,
        @Query('trees') trees: string,
        @Query('co2') co2: string,
        @Res() res: Response,
    ): Promise<void> {
        const treeCount = parseInt(trees, 10) || 1;
        const co2Absorbed = parseFloat(co2) || treeCount * 10;
        const userName = name || 'Người gieo hạt';

        const data = { userName, treeCount, co2Absorbed };
        const imageUrl = `https://dainganxanh.vn/share-card/svg?name=${encodeURIComponent(userName)}&trees=${treeCount}&co2=${co2Absorbed}`;
        const ogTags = this.shareCardGenerator.generateOgTags(data, imageUrl);

        // Build meta tags HTML
        const metaTags = Object.entries(ogTags)
            .map(([name, content]) => `<meta property="${name}" content="${this.escapeHtml(content)}">`)
            .join('\n    ');

        const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${userName} đã trồng ${treeCount} cây cùng Đại Ngàn Xanh</title>
    ${metaTags}
    <meta http-equiv="refresh" content="0;url=https://dainganxanh.vn">
</head>
<body>
    <p>Đang chuyển hướng đến Đại Ngàn Xanh...</p>
</body>
</html>
    `.trim();

        res.send(html);
    }

    private escapeHtml(text: string): string {
        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }
}
