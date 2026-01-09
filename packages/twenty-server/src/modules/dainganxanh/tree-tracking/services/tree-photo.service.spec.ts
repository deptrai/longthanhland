import { Test, type TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';

import {
    TreePhotoService,
    type TreePhotoEntity,
    type CreateTreePhotoDto,
} from './tree-photo.service';
import { GlobalWorkspaceOrmManager } from 'src/engine/twenty-orm/global-workspace-datasource/global-workspace-orm.manager';
import { FileUploadService } from 'src/engine/core-modules/file/file-upload/services/file-upload.service';

// Mock ExifReader
jest.mock('exifreader', () => ({
    load: jest.fn(),
}));

describe('TreePhotoService', () => {
    let service: TreePhotoService;
    let mockGlobalWorkspaceOrmManager: jest.Mocked<GlobalWorkspaceOrmManager>;
    let mockFileUploadService: jest.Mocked<FileUploadService>;
    let mockPhotoRepository: {
        save: jest.Mock;
        find: jest.Mock;
        findOne: jest.Mock;
    };

    const workspaceId = 'test-workspace-id';

    beforeEach(async () => {
        mockPhotoRepository = {
            save: jest.fn(),
            find: jest.fn(),
            findOne: jest.fn(),
        };

        mockGlobalWorkspaceOrmManager = {
            getRepository: jest.fn().mockResolvedValue(mockPhotoRepository),
            executeInWorkspaceContext: jest
                .fn()
                .mockImplementation((_authContext, fn) => fn()),
        } as unknown as jest.Mocked<GlobalWorkspaceOrmManager>;

        mockFileUploadService = {
            uploadFile: jest.fn().mockResolvedValue({
                name: 'test-file',
                mimeType: 'image/jpeg',
                files: [{ path: 'tree-photo/test.jpg', token: 'test-token' }],
            }),
            uploadImage: jest.fn(),
            uploadImageFromUrl: jest.fn(),
        } as unknown as jest.Mocked<FileUploadService>;

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                TreePhotoService,
                {
                    provide: GlobalWorkspaceOrmManager,
                    useValue: mockGlobalWorkspaceOrmManager,
                },
                {
                    provide: FileUploadService,
                    useValue: mockFileUploadService,
                },
            ],
        }).compile();

        service = module.get<TreePhotoService>(TreePhotoService);
    });

    describe('createPhoto', () => {
        it('should create a photo record', async () => {
            const createDto: CreateTreePhotoDto = {
                photoUrl: 'https://s3.example.com/photo.jpg',
                capturedAt: new Date().toISOString(),
                quarter: 'Q1-2026',
                treeId: 'tree-1',
                gpsLat: 10.123,
                gpsLng: 106.456,
            };

            const expectedPhoto = {
                id: 'photo-1',
                ...createDto,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                isPlaceholder: false,
                thumbnailUrl: null,
                caption: null,
                uploadedById: null,
            };

            mockPhotoRepository.save.mockResolvedValue(expectedPhoto);

            const result = await service.createPhoto(workspaceId, createDto);

            expect(result).toEqual(expectedPhoto);
            expect(mockPhotoRepository.save).toHaveBeenCalledWith(expect.objectContaining({
                photoUrl: createDto.photoUrl,
                treeId: createDto.treeId,
            }));
            expect(mockGlobalWorkspaceOrmManager.getRepository).toHaveBeenCalledWith(workspaceId, 'treePhoto');
        });

        it('should throw BadRequestException for invalid quarter format', async () => {
            const invalidDto: CreateTreePhotoDto = {
                photoUrl: 'https://s3.example.com/photo.jpg',
                capturedAt: new Date().toISOString(),
                quarter: 'Invalid-Quarter', // Wrong format
                treeId: 'tree-1',
            };

            await expect(service.createPhoto(workspaceId, invalidDto))
                .rejects
                .toThrow(BadRequestException);

            await expect(service.createPhoto(workspaceId, invalidDto))
                .rejects
                .toThrow(/Invalid quarter format/);

            expect(mockPhotoRepository.save).not.toHaveBeenCalled();
        });
    });

    describe('findPhotosByTree', () => {
        it('should find photos for a tree', async () => {
            const mockPhotos = [
                { id: 'photo-1', treeId: 'tree-1', quarter: 'Q1-2026' },
                { id: 'photo-2', treeId: 'tree-1', quarter: 'Q4-2025' },
            ];

            mockPhotoRepository.find.mockResolvedValue(mockPhotos);

            const result = await service.findPhotosByTree(workspaceId, 'tree-1');

            expect(result).toHaveLength(2);
            expect(mockPhotoRepository.find).toHaveBeenCalledWith({
                where: { treeId: 'tree-1' },
                order: { capturedAt: 'DESC' },
            });
        });

        it('should filter by quarter', async () => {
            await service.findPhotosByTree(workspaceId, 'tree-1', 'Q1-2026');

            expect(mockPhotoRepository.find).toHaveBeenCalledWith({
                where: { treeId: 'tree-1', quarter: 'Q1-2026' },
                order: { capturedAt: 'DESC' },
            });
        });
    });

    describe('generateS3Key', () => {
        it('should generate correct S3 key format', () => {
            const key = service.generateS3Key('TREE-001', 'Q1-2026', 'photo.jpg');
            expect(key).toMatch(/^trees\/TREE-001\/Q1-2026\/\d+-photo\.jpg$/);
        });
    });

    describe('getQuarterString', () => {
        it('should return correct quarter string', () => {
            const date = new Date('2026-01-15');
            expect(service.getQuarterString(date)).toBe('Q1-2026');

            const date2 = new Date('2026-04-01');
            expect(service.getQuarterString(date2)).toBe('Q2-2026');
        });
    });

    describe('isValidImageType', () => {
        it('should validate allowed mime types', () => {
            expect(service.isValidImageType('image/jpeg')).toBe(true);
            expect(service.isValidImageType('image/png')).toBe(true);
            expect(service.isValidImageType('application/pdf')).toBe(false);
        });
    });
});
