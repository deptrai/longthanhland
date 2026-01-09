import imageCompression from 'browser-image-compression';

export interface CompressionOptions {
    maxSizeMB?: number;
    maxWidthOrHeight?: number;
    useWebWorker?: boolean;
    onProgress?: (progress: number) => void;
}

/**
 * Compress image to target size
 * Default: 2MB max, 1920px max dimension
 */
export async function compressImage(
    file: File,
    options: CompressionOptions = {},
): Promise<Blob> {
    const defaultOptions = {
        maxSizeMB: options.maxSizeMB || 2,
        maxWidthOrHeight: options.maxWidthOrHeight || 1920,
        useWebWorker: options.useWebWorker !== false,
        onProgress: options.onProgress,
    };

    try {
        const compressedFile = await imageCompression(file, defaultOptions);
        return compressedFile;
    } catch (error) {
        console.error('Image compression failed:', error);
        throw new Error('Failed to compress image');
    }
}

/**
 * Generate thumbnail from image
 * Default: 300px max dimension, 0.5MB max
 */
export async function generateThumbnail(
    file: File,
    maxSize: number = 300,
): Promise<Blob> {
    try {
        const thumbnail = await imageCompression(file, {
            maxSizeMB: 0.5,
            maxWidthOrHeight: maxSize,
            useWebWorker: true,
        });
        return thumbnail;
    } catch (error) {
        console.error('Thumbnail generation failed:', error);
        throw new Error('Failed to generate thumbnail');
    }
}

/**
 * Validate image file type
 */
export function isValidImageType(file: File): boolean {
    const validTypes = [
        'image/jpeg',
        'image/jpg',
        'image/png',
        'image/webp',
        'image/heic',
        'image/heif',
    ];
    return validTypes.includes(file.type.toLowerCase());
}

/**
 * Validate image file size (max 10MB)
 */
export function isValidImageSize(file: File, maxSizeMB: number = 10): boolean {
    const maxBytes = maxSizeMB * 1024 * 1024;
    return file.size <= maxBytes;
}

/**
 * Get quarter string from date (Q1-2026 format)
 */
export function getQuarterString(date: Date = new Date()): string {
    const quarter = Math.ceil((date.getMonth() + 1) / 3);
    const year = date.getFullYear();
    return `Q${quarter}-${year}`;
}
