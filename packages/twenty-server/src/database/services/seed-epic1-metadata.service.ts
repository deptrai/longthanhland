import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { ObjectMetadataService } from 'src/engine/metadata-modules/object-metadata/object-metadata.service';
import { FieldMetadataService } from 'src/engine/metadata-modules/field-metadata/services/field-metadata.service';
import { FieldMetadataType } from 'src/engine/metadata-modules/field-metadata/field-metadata.entity';

/**
 * Epic 1 Metadata Seeding Service
 * 
 * Creates custom objects for Đại Ngàn Xanh project:
 * - E1.1: Tree
 * - E1.2: TreeLot  
 * - E1.3: Order
 * - E1.4: TreePhoto
 * - E1.5: TreeHealthLog
 */
@Injectable()
export class SeedEpic1MetadataService {
    private readonly logger = new Logger(SeedEpic1MetadataService.name);

    constructor(
        private readonly objectMetadataService: ObjectMetadataService,
        private readonly fieldMetadataService: FieldMetadataService,
    ) { }

    async seedEpic1Metadata(): Promise<void> {
        // Hardcode workspace ID for now - adjust as needed
        // Get from env or find first workspace
        const workspaceId = process.env.DEFAULT_WORKSPACE_ID || '20202020-1c25-4d02-bf25-6aeccf7ea419';

        this.logger.log(`Seeding Epic 1 metadata for workspace: ${workspaceId}`);

        // Step 1: Create Objects
        await this.createObjects(workspaceId);

        // Step 2: Create Fields
        await this.createFields(workspaceId);

        this.logger.log('Epic 1 metadata seeding completed!');
    }

    private async createObjects(workspaceId: string): Promise<void> {
        this.logger.log('📦 Creating Epic 1 objects...');

        const objects = [
            {
                nameSingular: 'tree',
                namePlural: 'trees',
                labelSingular: 'Cây',
                labelPlural: 'Cây',
                description: 'E1.1 - Tree object for Đại Ngàn Xanh',
                icon: 'IconTree',
            },
            {
                nameSingular: 'treeLot',
                namePlural: 'treeLots',
                labelSingular: 'Lô cây',
                labelPlural: 'Lô cây',
                description: 'E1.2 - TreeLot object for Đại Ngàn Xanh',
                icon: 'IconMapPin',
            },
            {
                nameSingular: 'order',
                namePlural: 'orders',
                labelSingular: 'Đơn hàng',
                labelPlural: 'Đơn hàng',
                description: 'E1.3 - Order object for Đại Ngàn Xanh',
                icon: 'IconShoppingCart',
            },
            {
                nameSingular: 'treePhoto',
                namePlural: 'treePhotos',
                labelSingular: 'Ảnh cây',
                labelPlural: 'Ảnh cây',
                description: 'E1.4 - TreePhoto object for Đại Ngàn Xanh',
                icon: 'IconPhoto',
            },
            {
                nameSingular: 'treeHealthLog',
                namePlural: 'treeHealthLogs',
                labelSingular: 'Nhật ký sức khỏe',
                labelPlural: 'Nhật ký sức khỏe',
                description: 'E1.5 - TreeHealthLog object for Đại Ngàn Xanh',
                icon: 'IconHeartbeat',
            },
        ];

        for (const objInput of objects) {
            // Check if object already exists by listing all objects
            const existingObjects = await this.objectMetadataService.findManyWithinWorkspace(workspaceId);
            const existing = existingObjects.find(obj => obj.nameSingular === objInput.nameSingular);

            if (existing) {
                this.logger.log(`  ✓ Object "${objInput.nameSingular}" already exists, skipping...`);
                continue;
            }

            try {
                await this.objectMetadataService.createOneObject({
                    createObjectInput: objInput,
                    workspaceId,
                });
                this.logger.log(`  ✅ Created object: ${objInput.nameSingular}`);
            } catch (error) {
                this.logger.error(`  ❌ Failed to create object "${objInput.nameSingular}":`, error.message);
            }
        }
    }

    private async createFields(workspaceId: string): Promise<void> {
        this.logger.log('🔧 Creating Epic 1 fields...');

        // Get object IDs
        const treeObj = await this.getObjectByName(workspaceId, 'tree');
        const treeLotObj = await this.getObjectByName(workspaceId, 'treeLot');
        const orderObj = await this.getObjectByName(workspaceId, 'order');
        const treePhotoObj = await this.getObjectByName(workspaceId, 'treePhoto');
        const treeHealthLogObj = await this.getObjectByName(workspaceId, 'treeHealthLog');

        if (!treeObj || !treeLotObj || !orderObj || !treePhotoObj || !treeHealthLogObj) {
            throw new Error('One or more Epic 1 objects not found. Please run object creation first.');
        }

        // Tree fields
        await this.createFieldsForObject(workspaceId, treeObj.id, [
            { name: 'treeCode', label: 'Mã cây', type: FieldMetadataType.TEXT },
            {
                name: 'status',
                label: 'Trạng thái',
                type: FieldMetadataType.SELECT,
                options: [
                    { value: 'SEEDLING', label: 'Mầm', color: 'green', position: 0 },
                    { value: 'PLANTED', label: 'Đã trồng', color: 'blue', position: 1 },
                    { value: 'GROWING', label: 'Đang lớn', color: 'turquoise', position: 2 },
                    { value: 'MATURE', label: 'Trưởng thành', color: 'purple', position: 3 },
                    { value: 'HARVESTED', label: 'Đã thu hoạch', color: 'orange', position: 4 },
                    { value: 'DEAD', label: 'Chết', color: 'red', position: 5 },
                ],
            },
            { name: 'plantingDate', label: 'Ngày trồng', type: FieldMetadataType.DATE_TIME },
            { name: 'harvestDate', label: 'Ngày thu hoạch dự kiến', type: FieldMetadataType.DATE_TIME },
            { name: 'co2Absorbed', label: 'CO2 hấp thụ (kg)', type: FieldMetadataType.NUMBER },
            { name: 'heightCm', label: 'Chiều cao (cm)', type: FieldMetadataType.NUMBER },
            { name: 'healthScore', label: 'Điểm sức khỏe', type: FieldMetadataType.NUMBER },
            { name: 'latestPhoto', label: 'Ảnh mới nhất', type: FieldMetadataType.TEXT },
        ]);

        // TreeLot fields
        await this.createFieldsForObject(workspaceId, treeLotObj.id, [
            { name: 'lotCode', label: 'Mã lô', type: FieldMetadataType.TEXT },
            { name: 'lotName', label: 'Tên lô', type: FieldMetadataType.TEXT },
            { name: 'location', label: 'Địa điểm', type: FieldMetadataType.TEXT },
            { name: 'gpsCenter', label: 'GPS trung tâm', type: FieldMetadataType.TEXT },
            { name: 'capacity', label: 'Sức chứa', type: FieldMetadataType.NUMBER },
            { name: 'plantedCount', label: 'Số cây đã trồng', type: FieldMetadataType.NUMBER },
        ]);

        // Order fields
        await this.createFieldsForObject(workspaceId, orderObj.id, [
            { name: 'orderCode', label: 'Mã đơn hàng', type: FieldMetadataType.TEXT },
            { name: 'quantity', label: 'Số lượng', type: FieldMetadataType.NUMBER },
            { name: 'totalAmount', label: 'Tổng tiền', type: FieldMetadataType.NUMBER },
            {
                name: 'paymentMethod',
                label: 'Phương thức thanh toán',
                type: FieldMetadataType.SELECT,
                options: [
                    { value: 'BANKING', label: 'Chuyển khoản', color: 'blue', position: 0 },
                    { value: 'USDT', label: 'USDT (BSC)', color: 'green', position: 1 },
                ],
            },
            {
                name: 'paymentStatus',
                label: 'Trạng thái thanh toán',
                type: FieldMetadataType.SELECT,
                options: [
                    { value: 'PENDING', label: 'Chờ xác nhận', color: 'yellow', position: 0 },
                    { value: 'VERIFIED', label: 'Đã xác nhận', color: 'green', position: 1 },
                    { value: 'FAILED', label: 'Thất bại', color: 'red', position: 2 },
                    { value: 'REFUNDED', label: 'Đã hoàn tiền', color: 'orange', position: 3 },
                ],
            },
            {
                name: 'orderStatus',
                label: 'Trạng thái đơn hàng',
                type: FieldMetadataType.SELECT,
                options: [
                    { value: 'CREATED', label: 'Đã tạo', color: 'gray', position: 0 },
                    { value: 'PAID', label: 'Đã thanh toán', color: 'blue', position: 1 },
                    { value: 'ASSIGNED', label: 'Đã phân bổ', color: 'purple', position: 2 },
                    { value: 'COMPLETED', label: 'Hoàn thành', color: 'green', position: 3 },
                ],
            },
            { name: 'referralCode', label: 'Mã giới thiệu', type: FieldMetadataType.TEXT },
            { name: 'contractPdfUrl', label: 'URL hợp đồng PDF', type: FieldMetadataType.TEXT },
            { name: 'transactionHash', label: 'Transaction Hash', type: FieldMetadataType.TEXT },
            { name: 'paidAt', label: 'Thời điểm thanh toán', type: FieldMetadataType.DATE_TIME },
        ]);

        // TreePhoto fields
        await this.createFieldsForObject(workspaceId, treePhotoObj.id, [
            { name: 'photoUrl', label: 'URL ảnh gốc', type: FieldMetadataType.TEXT },
            { name: 'thumbnailUrl', label: 'URL thumbnail', type: FieldMetadataType.TEXT },
            { name: 'quarter', label: 'Quý', type: FieldMetadataType.TEXT },
            { name: 'caption', label: 'Mô tả', type: FieldMetadataType.TEXT },
            { name: 'capturedAt', label: 'Thời điểm chụp', type: FieldMetadataType.DATE_TIME },
            { name: 'gpsLat', label: 'Vĩ độ', type: FieldMetadataType.NUMBER },
            { name: 'gpsLng', label: 'Kinh độ', type: FieldMetadataType.NUMBER },
            { name: 'isPlaceholder', label: 'Ảnh placeholder', type: FieldMetadataType.BOOLEAN },
        ]);

        // TreeHealthLog fields
        await this.createFieldsForObject(workspaceId, treeHealthLogObj.id, [
            {
                name: 'status',
                label: 'Trạng thái',
                type: FieldMetadataType.SELECT,
                options: [
                    { value: 'HEALTHY', label: 'Khỏe mạnh', color: 'green', position: 0 },
                    { value: 'SICK', label: 'Bệnh', color: 'yellow', position: 1 },
                    { value: 'DEAD', label: 'Chết', color: 'red', position: 2 },
                    { value: 'REPLANTED', label: 'Đã trồng lại', color: 'blue', position: 3 },
                ],
            },
            { name: 'notes', label: 'Ghi chú', type: FieldMetadataType.TEXT },
            { name: 'treatment', label: 'Biện pháp xử lý', type: FieldMetadataType.TEXT },
            { name: 'loggedAt', label: 'Thời điểm ghi log', type: FieldMetadataType.DATE_TIME },
        ]);

        this.logger.log('  ✅ All fields created successfully!');
    }

    private async getObjectByName(
        workspaceId: string,
        nameSingular: string,
    ): Promise<any | null> {
        const objects = await this.objectMetadataService.findManyWithinWorkspace(workspaceId);
        return objects.find(obj => obj.nameSingular === nameSingular) || null;
    }

    private async createFieldsForObject(
        workspaceId: string,
        objectMetadataId: string,
        fields: Array<{
            name: string;
            label: string;
            type: FieldMetadataType;
            options?: Array<{ value: string; label: string; color: string; position: number }>;
        }>,
    ): Promise<void> {
        for (const field of fields) {
            try {
                await this.fieldMetadataService.createOneField({
                    createFieldInput: {
                        name: field.name,
                        label: field.label,
                        type: field.type,
                        objectMetadataId,
                        options: field.options,
                    } as any,
                    workspaceId,
                });
                this.logger.log(`    ✅ Created field: ${field.name}`);
            } catch (error) {
                if (error.message?.includes('already exists')) {
                    this.logger.log(`    ✓ Field "${field.name}" already exists, skipping...`);
                } else {
                    this.logger.error(`    ❌ Failed to create field "${field.name}":`, error.message);
                }
            }
        }
    }
}
