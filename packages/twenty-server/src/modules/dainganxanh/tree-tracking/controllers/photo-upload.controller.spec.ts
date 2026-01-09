import { Test, TestingModule } from '@nestjs/testing';
import { PhotoUploadController } from './photo-upload.controller';
import { TreePhotoService } from '../services/tree-photo.service';

describe('PhotoUploadController', () => {
    let controller: PhotoUploadController;
    let service: TreePhotoService;

    const mockTreePhotoService = {
        createPhoto: jest.fn(),
        findPhotosByTree: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [PhotoUploadController],
            providers: [
                {
                    provide: TreePhotoService,
                    useValue: mockTreePhotoService,
                },
            ],
        }).compile();

        controller = module.get<PhotoUploadController>(PhotoUploadController);
        service = module.get<TreePhotoService>(TreePhotoService);
    });

    it('should be defined', () => {
        expect(controller).toBeDefined();
    });

    describe('uploadPhoto', () => {
        it('should upload a single photo', async () => {
            const photoData = {
                photoUrl: 'https://s3.amazonaws.com/photo.jpg',
                thumbnailUrl: 'https://s3.amazonaws.com/thumb.jpg',
                capturedAt: '2026-01-09T10:00:00Z',
                gpsLat: 16.0,
                gpsLng: 108.0,
                quarter: 'Q1-2026',
                treeId: 'tree-123',
                uploadedById: 'user-123',
            };

            const mockResult = { id: 'photo-123', ...photoData };
            mockTreePhotoService.createPhoto.mockResolvedValue(mockResult);

            const req = { user: { workspaceId: 'workspace-123' } };
            const result = await controller.uploadPhoto(photoData, req);

            expect(service.createPhoto).toHaveBeenCalledWith(
                'workspace-123',
                photoData,
            );
            expect(result).toEqual(mockResult);
        });
    });

    describe('batchUpload', () => {
        it('should upload multiple photos', async () => {
            const photos = [
                {
                    photoUrl: 'https://s3.amazonaws.com/photo1.jpg',
                    capturedAt: '2026-01-09T10:00:00Z',
                    quarter: 'Q1-2026',
                    treeId: 'tree-123',
                },
                {
                    photoUrl: 'https://s3.amazonaws.com/photo2.jpg',
                    capturedAt: '2026-01-09T11:00:00Z',
                    quarter: 'Q1-2026',
                    treeId: 'tree-124',
                },
            ];

            mockTreePhotoService.createPhoto
                .mockResolvedValueOnce({ id: 'photo-1', ...photos[0] })
                .mockResolvedValueOnce({ id: 'photo-2', ...photos[1] });

            const req = { user: { workspaceId: 'workspace-123' } };
            const result = await controller.batchUpload({ photos }, req);

            expect(result.uploaded).toBe(2);
            expect(result.photos).toHaveLength(2);
            expect(service.createPhoto).toHaveBeenCalledTimes(2);
        });
    });

    describe('getPhotosByTree', () => {
        it('should get photos by tree ID', async () => {
            const mockPhotos = [
                { id: 'photo-1', treeId: 'tree-123', quarter: 'Q1-2026' },
                { id: 'photo-2', treeId: 'tree-123', quarter: 'Q1-2026' },
            ];

            mockTreePhotoService.findPhotosByTree.mockResolvedValue(mockPhotos);

            const req = { user: { workspaceId: 'workspace-123' } };
            const result = await controller.getPhotosByTree(
                'tree-123',
                'Q1-2026',
                req,
            );

            expect(service.findPhotosByTree).toHaveBeenCalledWith(
                'workspace-123',
                'tree-123',
                'Q1-2026',
            );
            expect(result).toEqual(mockPhotos);
        });
    });
});
