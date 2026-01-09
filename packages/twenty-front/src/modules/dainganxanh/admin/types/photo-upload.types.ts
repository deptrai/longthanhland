export interface PhotoFile {
    id: string;
    file: File;
    preview: string;
    gpsLat?: number;
    gpsLng?: number;
    capturedAt?: string;
    caption?: string;
    lotId?: string;
    treeIds?: string[];
    compressed?: Blob;
    thumbnail?: Blob;
    uploadProgress?: number;
}

export interface PhotoUploadMetadata {
    lotId: string;
    treeIds?: string[];
    caption?: string;
    quarter: string;
}
