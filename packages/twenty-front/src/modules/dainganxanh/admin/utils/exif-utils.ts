import ExifReader from 'exifreader';

export interface ExifData {
    gpsLat?: number;
    gpsLng?: number;
    capturedAt?: string;
}

/**
 * Extract GPS coordinates and capture date from image EXIF data
 */
export async function extractExifData(file: File): Promise<ExifData> {
    try {
        const buffer = await file.arrayBuffer();
        const tags = ExifReader.load(buffer);

        const result: ExifData = {};

        // Extract GPS coordinates
        if (tags.GPSLatitude && tags.GPSLongitude) {
            const latRef = (tags.GPSLatitudeRef?.value as any)?.[0] ?? 'N';
            const lngRef = (tags.GPSLongitudeRef?.value as any)?.[0] ?? 'E';

            result.gpsLat = convertDmsToDecimal(
                tags.GPSLatitude.description,
                latRef,
            );
            result.gpsLng = convertDmsToDecimal(
                tags.GPSLongitude.description,
                lngRef,
            );
        }

        // Extract capture date
        if (tags.DateTimeOriginal || tags.DateTime) {
            const dateTag = tags.DateTimeOriginal || tags.DateTime;
            result.capturedAt = parseDateTimeOriginal(dateTag?.description || '');
        }

        return result;
    } catch {
        return {};
    }
}

/**
 * Convert DMS (degrees, minutes, seconds) to decimal degrees
 */
function convertDmsToDecimal(dmsString: string, ref: string): number {
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
 * Parse EXIF DateTime format to ISO string
 * EXIF format: "2024:01:09 16:30:00"
 */
function parseDateTimeOriginal(dateTimeStr: string): string {
    try {
        const [datePart, timePart] = dateTimeStr.split(' ');
        const [year, month, day] = datePart.split(':');
        const isoDate = `${year}-${month}-${day}T${timePart}`;
        return new Date(isoDate).toISOString();
    } catch {
        return new Date().toISOString();
    }
}
