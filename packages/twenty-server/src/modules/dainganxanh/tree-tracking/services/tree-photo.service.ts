import { Injectable } from '@nestjs/common';
import * as ExifReader from 'exifreader';

/**
 * TreePhotoService handles photo uploads, compression, and GPS extraction
 * for tree progress tracking.
 * 
 * Photos are uploaded quarterly and tagged with GPS from EXIF data.
 */
@Injectable()
export class TreePhotoService {
    /**
     * Extract GPS coordinates from photo EXIF data
     * Returns null if GPS data is not available
     */
    async extractGpsFromExif(
        buffer: Buffer,
    ): Promise<{ lat: number; lng: number } | null> {
        try {
            const tags = ExifReader.load(buffer);

            if (!tags.GPSLatitude || !tags.GPSLongitude) {
                return null;
            }

            const lat = this.convertDmsToDecimal(
                tags.GPSLatitude.description,
                tags.GPSLatitudeRef?.value?.[0] ?? 'N',
            );

            const lng = this.convertDmsToDecimal(
                tags.GPSLongitude.description,
                tags.GPSLongitudeRef?.value?.[0] ?? 'E',
            );

            return { lat, lng };
        } catch (error) {
            console.error('Failed to extract GPS from EXIF:', error);
            return null;
        }
    }

    /**
     * Convert degrees/minutes/seconds to decimal degrees
     */
    private convertDmsToDecimal(dmsString: string, ref: string): number {
        // Parse DMS format: "16° 28' 57.36""
        const parts = dmsString.match(/(\d+)°\s*(\d+)'\s*([\d.]+)"/);
        if (!parts) return 0;

        const degrees = parseFloat(parts[1]);
        const minutes = parseFloat(parts[2]);
        const seconds = parseFloat(parts[3]);

        let decimal = degrees + minutes / 60 + seconds / 3600;

        if (ref === 'S' || ref === 'W') {
            decimal = -decimal;
        }

        return Math.round(decimal * 1000000) / 1000000;
    }

    /**
     * Determine quarter from date (Q1-2026 format)
     */
    getQuarterString(date: Date): string {
        const quarter = Math.ceil((date.getMonth() + 1) / 3);
        const year = date.getFullYear();
        return `Q${quarter}-${year}`;
    }

    /**
     * Generate S3 key for tree photo
     */
    generateS3Key(
        treeCode: string,
        quarter: string,
        filename: string,
    ): string {
        const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
        return `trees/${treeCode}/${quarter}/${Date.now()}-${sanitizedFilename}`;
    }

    /**
     * Generate thumbnail S3 key
     */
    generateThumbnailS3Key(originalKey: string): string {
        return originalKey.replace('/trees/', '/trees/thumbnails/');
    }

    /**
     * Validate file is an acceptable image type
     * Supports JPEG, PNG, WebP, HEIC
     */
    isValidImageType(mimeType: string): boolean {
        const validTypes = [
            'image/jpeg',
            'image/png',
            'image/webp',
            'image/heic',
            'image/heif',
        ];
        return validTypes.includes(mimeType.toLowerCase());
    }

    /**
     * Maximum file size in bytes (10MB)
     */
    getMaxFileSizeBytes(): number {
        return 10 * 1024 * 1024;
    }

    /**
     * Target compressed size in bytes (2MB)
     */
    getTargetCompressedSizeBytes(): number {
        return 2 * 1024 * 1024;
    }
}
