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
                return false;
            }
            if (!isValidImageSize(file)) {
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
            const quarter = getQuarterString();

            // Build payload for batch upload
            const photoPayloads = photos.map((photo) => ({
                photoUrl: photo.preview, // TODO: Replace with actual S3 URL after upload
                thumbnailUrl: photo.preview,
                capturedAt: photo.capturedAt || new Date().toISOString(),
                gpsLat: photo.gpsLat,
                gpsLng: photo.gpsLng,
                quarter,
                caption: photo.caption,
                treeId: photo.treeIds?.[0] || '', // Use first tagged tree
                isPlaceholder: false,
            }));

            // Update progress for each photo
            for (let i = 0; i < photos.length; i++) {
                updatePhoto(photos[i].id, { uploadProgress: 50 });
            }

            // Call batch upload API
            const response = await fetch('/photos/batch-upload', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ photos: photoPayloads }),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || 'Upload failed');
            }

            const result = await response.json();

            // Mark all as complete
            photos.forEach((photo) => {
                updatePhoto(photo.id, { uploadProgress: 100 });
                URL.revokeObjectURL(photo.preview);
            });

            // Clear photos after successful upload
            setPhotos([]);

            return result;
        } catch (err: any) {
            setError(err.message || 'Upload failed');
            throw err;
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
