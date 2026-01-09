import { useState, useCallback } from 'react';
import { PhotoFile } from '../types/photo-upload.types';
import { extractExifData } from '../utils/exif-utils';
import {
    compressImage,
    generateThumbnail,
    isValidImageType,
    isValidImageSize,
    getQuarterString,
} from '../utils/image-compression';

export const usePhotoUpload = () => {
    const [photos, setPhotos] = useState<PhotoFile[]>([]);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const addPhotos = useCallback(async (files: FileList | File[]) => {
        const fileArray = Array.from(files);
        const validFiles = fileArray.filter((file) => {
            if (!isValidImageType(file)) {
                console.warn(`Invalid file type: ${file.name}`);
                return false;
            }
            if (!isValidImageSize(file)) {
                console.warn(`File too large: ${file.name}`);
                return false;
            }
            return true;
        });

        const newPhotos: PhotoFile[] = await Promise.all(
            validFiles.map(async (file) => {
                const id = `${Date.now()}-${Math.random()}`;
                const preview = URL.createObjectURL(file);

                // Extract EXIF data
                const exifData = await extractExifData(file);

                // Compress and generate thumbnail
                const [compressed, thumbnail] = await Promise.all([
                    compressImage(file).catch(() => file),
                    generateThumbnail(file).catch(() => file),
                ]);

                return {
                    id,
                    file,
                    preview,
                    gpsLat: exifData.gpsLat,
                    gpsLng: exifData.gpsLng,
                    capturedAt: exifData.capturedAt || new Date().toISOString(),
                    compressed,
                    thumbnail,
                    uploadProgress: 0,
                };
            }),
        );

        setPhotos((prev) => [...prev, ...newPhotos]);
    }, []);

    const removePhoto = useCallback((id: string) => {
        setPhotos((prev) => {
            const photo = prev.find((p) => p.id === id);
            if (photo) {
                URL.revokeObjectURL(photo.preview);
            }
            return prev.filter((p) => p.id !== id);
        });
    }, []);

    const updatePhoto = useCallback((id: string, updates: Partial<PhotoFile>) => {
        setPhotos((prev) =>
            prev.map((photo) =>
                photo.id === id ? { ...photo, ...updates } : photo,
            ),
        );
    }, []);

    const uploadPhotos = useCallback(async () => {
        setUploading(true);
        setError(null);

        try {
            // TODO: Implement actual upload to backend
            // For now, just simulate upload
            for (const photo of photos) {
                // Simulate progress
                for (let progress = 0; progress <= 100; progress += 20) {
                    updatePhoto(photo.id, { uploadProgress: progress });
                    await new Promise((resolve) => setTimeout(resolve, 100));
                }
            }

            // Clear photos after successful upload
            photos.forEach((photo) => URL.revokeObjectURL(photo.preview));
            setPhotos([]);
        } catch (err: any) {
            setError(err.message || 'Upload failed');
        } finally {
            setUploading(false);
        }
    }, [photos, updatePhoto]);

    const clearAll = useCallback(() => {
        photos.forEach((photo) => URL.revokeObjectURL(photo.preview));
        setPhotos([]);
        setError(null);
    }, [photos]);

    return {
        photos,
        uploading,
        error,
        addPhotos,
        removePhoto,
        updatePhoto,
        uploadPhotos,
        clearAll,
        getQuarterString,
    };
};
