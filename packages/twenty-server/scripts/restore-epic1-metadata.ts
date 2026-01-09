#!/usr/bin/env ts-node

/**
 * Consolidated Migration Script for Epic 1 - Custom Objects Setup
 * 
 * This script restores all 5 custom objects from Epic 1 after database reset:
 * - E1.1: Tree object
 * - E1.2: TreeLot object
 * - E1.3: Order object
 * - E1.4: TreePhoto object
 * - E1.5: TreeHealthLog object
 * 
 * Features:
 * - Idempotent: Safe to run multiple times
 * - Error handling with detailed logging
 * - Verification after each step
 * - Creates objects, fields, and relations in correct dependency order
 * 
 * Usage:
 *   TWENTY_API_KEY=<your-api-key> ts-node restore-epic1-metadata.ts
 */

import axios from 'axios';

const API_URL = process.env.TWENTY_API_URL || 'http://localhost:3000/metadata';
const API_KEY = process.env.TWENTY_API_KEY;

if (!API_KEY) {
    console.error('❌ Error: TWENTY_API_KEY environment variable is required');
    process.exit(1);
}

type FieldDefinition = {
    name: string;
    label: string;
    type: string;
    isNullable?: boolean;
    options?: Array<{ value: string; label: string; color: string; position: number }>;
};


const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${API_KEY}`,
};

// Utility: GraphQL query helper
async function graphql(query: string, variables: any = {}) {
    try {
        const response = await axios.post(API_URL, { query, variables }, { headers });
        if (response.data.errors) {
            throw new Error(JSON.stringify(response.data.errors, null, 2));
        }
        return response.data.data;
    } catch (error: any) {
        console.error('GraphQL Error:', error.response?.data || error.message);
        throw error;
    }
}

// Utility: Check if object exists
async function objectExists(nameSingular: string): Promise<boolean> {
    const query = `
    query {
      objects(filter: { nameSingular: { eq: "${nameSingular}" } }) {
        edges {
          node {
            id
            nameSingular
          }
        }
      }
    }
  `;
    const data = await graphql(query);
    return data.objects.edges.length > 0;
}

// Utility: Get object ID by name
async function getObjectId(nameSingular: string): Promise<string | null> {
    const query = `
    query {
      objects(filter: { nameSingular: { eq: "${nameSingular}" } }) {
        edges {
          node {
            id
          }
        }
      }
    }
  `;
    const data = await graphql(query);
    return data.objects.edges[0]?.node.id || null;
}

// Step 1: Create Objects
async function createObjects() {
    console.log('\n📦 Step 1: Creating Objects...\n');

    const objects = [
        { name: 'tree', label: 'Cây', labelPlural: 'Cây', icon: 'IconTree' },
        { name: 'treeLot', label: 'Lô cây', labelPlural: 'Lô cây', icon: 'IconMapPin' },
        { name: 'order', label: 'Đơn hàng', labelPlural: 'Đơn hàng', icon: 'IconShoppingCart' },
        { name: 'treePhoto', label: 'Ảnh cây', labelPlural: 'Ảnh cây', icon: 'IconPhoto' },
        { name: 'treeHealthLog', label: 'Nhật ký sức khỏe', labelPlural: 'Nhật ký sức khỏe', icon: 'IconHeartbeat' },
    ];

    for (const obj of objects) {
        if (await objectExists(obj.name)) {
            console.log(`✓ Object "${obj.name}" already exists, skipping...`);
            continue;
        }

        const mutation = `
      mutation {
        createOneObject(input: {
          object: {
            nameSingular: "${obj.name}"
            namePlural: "${obj.name}s"
            labelSingular: "${obj.label}"
            labelPlural: "${obj.labelPlural}"
            description: "Epic 1 - ${obj.label}"
            icon: "${obj.icon}"
          }
        }) {
          id
          nameSingular
          labelSingular
        }
      }
    `;

        const data = await graphql(mutation);
        console.log(`✅ Created object: ${data.createOneObject.nameSingular} (${data.createOneObject.id})`);
    }
}

// Step 2: Create Fields
async function createFields() {
    console.log('\n🔧 Step 2: Creating Fields...\n');

    const treeId = await getObjectId('tree');
    const treeLotId = await getObjectId('treeLot');
    const orderId = await getObjectId('order');
    const treePhotoId = await getObjectId('treePhoto');
    const treeHealthLogId = await getObjectId('treeHealthLog');

    if (!treeId || !treeLotId || !orderId || !treePhotoId || !treeHealthLogId) {
        throw new Error('❌ One or more objects not found. Run Step 1 first.');
    }

    // Tree fields
    const treeFields: FieldDefinition[] = [
        { name: 'treeCode', label: 'Mã cây', type: 'TEXT', isNullable: false },
        {
            name: 'status', label: 'Trạng thái', type: 'SELECT', options: [
                { value: 'SEEDLING', label: 'Mầm', color: 'green', position: 0 },
                { value: 'PLANTED', label: 'Đã trồng', color: 'blue', position: 1 },
                { value: 'GROWING', label: 'Đang lớn', color: 'turquoise', position: 2 },
                { value: 'MATURE', label: 'Trưởng thành', color: 'purple', position: 3 },
                { value: 'HARVESTED', label: 'Đã thu hoạch', color: 'orange', position: 4 },
                { value: 'DEAD', label: 'Chết', color: 'red', position: 5 },
            ]
        },
        { name: 'plantingDate', label: 'Ngày trồng', type: 'DATE_TIME' },
        { name: 'harvestDate', label: 'Ngày thu hoạch dự kiến', type: 'DATE_TIME' },
        { name: 'co2Absorbed', label: 'CO2 hấp thụ (kg)', type: 'NUMBER' },
        { name: 'heightCm', label: 'Chiều cao (cm)', type: 'NUMBER' },
        { name: 'healthScore', label: 'Điểm sức khỏe', type: 'NUMBER' },
        { name: 'latestPhoto', label: 'Ảnh mới nhất', type: 'TEXT' },
    ];

    // TreeLot fields
    const treeLotFields: FieldDefinition[] = [
        { name: 'lotCode', label: 'Mã lô', type: 'TEXT', isNullable: false },
        { name: 'lotName', label: 'Tên lô', type: 'TEXT', isNullable: false },
        { name: 'location', label: 'Địa điểm', type: 'TEXT' },
        { name: 'gpsCenter', label: 'GPS trung tâm', type: 'TEXT' },
        { name: 'capacity', label: 'Sức chứa', type: 'NUMBER' },
        { name: 'plantedCount', label: 'Số cây đã trồng', type: 'NUMBER' },
    ];

    // Order fields
    const orderFields: FieldDefinition[] = [
        { name: 'orderCode', label: 'Mã đơn hàng', type: 'TEXT', isNullable: false },
        { name: 'quantity', label: 'Số lượng', type: 'NUMBER', isNullable: false },
        { name: 'totalAmount', label: 'Tổng tiền', type: 'NUMBER' },
        {
            name: 'paymentMethod', label: 'Phương thức thanh toán', type: 'SELECT', options: [
                { value: 'BANKING', label: 'Chuyển khoản', color: 'blue', position: 0 },
                { value: 'USDT', label: 'USDT (BSC)', color: 'green', position: 1 },
            ]
        },
        {
            name: 'paymentStatus', label: 'Trạng thái thanh toán', type: 'SELECT', options: [
                { value: 'PENDING', label: 'Chờ xác nhận', color: 'yellow', position: 0 },
                { value: 'VERIFIED', label: 'Đã xác nhận', color: 'green', position: 1 },
                { value: 'FAILED', label: 'Thất bại', color: 'red', position: 2 },
                { value: 'REFUNDED', label: 'Đã hoàn tiền', color: 'orange', position: 3 },
            ]
        },
        {
            name: 'orderStatus', label: 'Trạng thái đơn hàng', type: 'SELECT', options: [
                { value: 'CREATED', label: 'Đã tạo', color: 'gray', position: 0 },
                { value: 'PAID', label: 'Đã thanh toán', color: 'blue', position: 1 },
                { value: 'ASSIGNED', label: 'Đã phân bổ', color: 'purple', position: 2 },
                { value: 'COMPLETED', label: 'Hoàn thành', color: 'green', position: 3 },
            ]
        },
        { name: 'referralCode', label: 'Mã giới thiệu', type: 'TEXT' },
        { name: 'contractPdfUrl', label: 'URL hợp đồng PDF', type: 'TEXT' },
        { name: 'transactionHash', label: 'Transaction Hash', type: 'TEXT' },
        { name: 'paidAt', label: 'Thời điểm thanh toán', type: 'DATE_TIME' },
    ];

    // TreePhoto fields
    const treePhotoFields: FieldDefinition[] = [
        { name: 'photoUrl', label: 'URL ảnh gốc', type: 'TEXT' },
        { name: 'thumbnailUrl', label: 'URL thumbnail', type: 'TEXT' },
        { name: 'quarter', label: 'Quý', type: 'TEXT' },
        { name: 'caption', label: 'Mô tả', type: 'TEXT' },
        { name: 'capturedAt', label: 'Thời điểm chụp', type: 'DATE_TIME' },
        { name: 'gpsLat', label: 'Vĩ độ', type: 'NUMBER' },
        { name: 'gpsLng', label: 'Kinh độ', type: 'NUMBER' },
        { name: 'isPlaceholder', label: 'Ảnh placeholder', type: 'BOOLEAN' },
    ];

    // TreeHealthLog fields
    const treeHealthLogFields: FieldDefinition[] = [
        {
            name: 'status', label: 'Trạng thái', type: 'SELECT', options: [
                { value: 'HEALTHY', label: 'Khỏe mạnh', color: 'green', position: 0 },
                { value: 'SICK', label: 'Bệnh', color: 'yellow', position: 1 },
                { value: 'DEAD', label: 'Chết', color: 'red', position: 2 },
                { value: 'REPLANTED', label: 'Đã trồng lại', color: 'blue', position: 3 },
            ]
        },
        { name: 'notes', label: 'Ghi chú', type: 'TEXT' },
        { name: 'treatment', label: 'Biện pháp xử lý', type: 'TEXT' },
        { name: 'loggedAt', label: 'Thời điểm ghi log', type: 'DATE_TIME' },
    ];

    const allFields = [
        { objectId: treeId, fields: treeFields, objectName: 'Tree' },
        { objectId: treeLotId, fields: treeLotFields, objectName: 'TreeLot' },
        { objectId: orderId, fields: orderFields, objectName: 'Order' },
        { objectId: treePhotoId, fields: treePhotoFields, objectName: 'TreePhoto' },
        { objectId: treeHealthLogId, fields: treeHealthLogFields, objectName: 'TreeHealthLog' },
    ];

    for (const { objectId, fields, objectName } of allFields) {
        console.log(`\n  Creating fields for ${objectName}...`);

        for (const field of fields) {
            const mutation = `
        mutation {
          createOneField(input: {
            field: {
              name: "${field.name}"
              label: "${field.label}"
              type: ${field.type}
              objectMetadataId: "${objectId}"
              ${field.isNullable !== undefined ? `isNullable: ${field.isNullable}` : ''}
              ${field.options ? `options: ${JSON.stringify(field.options).replace(/"([^"]+)":/g, '$1:')}` : ''}
            }
          }) {
            id
            name
            label
          }
        }
      `;

            try {
                const data = await graphql(mutation);
                console.log(`  ✅ Created field: ${data.createOneField.name}`);
            } catch (error: any) {
                if (error.message.includes('already exists')) {
                    console.log(`  ✓ Field "${field.name}" already exists, skipping...`);
                } else {
                    throw error;
                }
            }
        }
    }
}

// Step 3: Create Relations
async function createRelations() {
    console.log('\n🔗 Step 3: Creating Relations...\n');

    const treeId = await getObjectId('tree');
    const treeLotId = await getObjectId('treeLot');
    const orderId = await getObjectId('order');
    const treePhotoId = await getObjectId('treePhoto');
    const treeHealthLogId = await getObjectId('treeHealthLog');
    const personId = await getObjectId('person'); // Built-in
    const workspaceMemberId = await getObjectId('workspaceMember'); // Built-in

    if (!treeId || !treeLotId || !orderId || !treePhotoId || !treeHealthLogId) {
        throw new Error('❌ Custom objects not found. Run Steps 1-2 first.');
    }

    if (!personId || !workspaceMemberId) {
        throw new Error('❌ Built-in objects (Person, WorkspaceMember) not found.');
    }

    const relations = [
        // Tree relations
        { from: treeId, to: personId, fromName: 'owner', toName: 'ownedTrees', type: 'MANY_TO_ONE', desc: 'Tree → Person (owner)' },
        { from: treeId, to: treeLotId, fromName: 'lot', toName: 'trees', type: 'MANY_TO_ONE', desc: 'Tree → TreeLot' },
        { from: treeId, to: orderId, fromName: 'order', toName: 'trees', type: 'MANY_TO_ONE', desc: 'Tree → Order' },

        // TreeLot relations
        { from: treeLotId, to: workspaceMemberId, fromName: 'assignedOperator', toName: 'assignedLots', type: 'MANY_TO_ONE', desc: 'TreeLot → WorkspaceMember' },

        // Order relations
        { from: orderId, to: personId, fromName: 'customer', toName: 'orders', type: 'MANY_TO_ONE', desc: 'Order → Person (customer)' },
        { from: orderId, to: workspaceMemberId, fromName: 'verifiedBy', toName: 'verifiedOrders', type: 'MANY_TO_ONE', desc: 'Order → WorkspaceMember' },

        // TreePhoto relations
        { from: treePhotoId, to: treeId, fromName: 'tree', toName: 'photos', type: 'MANY_TO_ONE', desc: 'TreePhoto → Tree' },
        { from: treePhotoId, to: workspaceMemberId, fromName: 'uploadedBy', toName: 'uploadedPhotos', type: 'MANY_TO_ONE', desc: 'TreePhoto → WorkspaceMember' },

        // TreeHealthLog relations
        { from: treeHealthLogId, to: treeId, fromName: 'tree', toName: 'healthLogs', type: 'MANY_TO_ONE', desc: 'TreeHealthLog → Tree' },
        { from: treeHealthLogId, to: workspaceMemberId, fromName: 'loggedBy', toName: 'loggedHealthRecords', type: 'MANY_TO_ONE', desc: 'TreeHealthLog → WorkspaceMember' },
    ];

    for (const rel of relations) {
        const mutation = `
      mutation {
        createOneRelation(input: {
          relation: {
            relationType: ${rel.type}
            fromObjectMetadataId: "${rel.from}"
            toObjectMetadataId: "${rel.to}"
            fromName: "${rel.fromName}"
            toName: "${rel.toName}"
            fromLabel: "${rel.fromName}"
            toLabel: "${rel.toName}"
          }
        }) {
          id
          relationType
        }
      }
    `;

        try {
            const data = await graphql(mutation);
            console.log(`✅ Created relation: ${rel.desc}`);
        } catch (error: any) {
            if (error.message.includes('already exists')) {
                console.log(`✓ Relation "${rel.desc}" already exists, skipping...`);
            } else {
                console.error(`❌ Failed to create relation: ${rel.desc}`);
                throw error;
            }
        }
    }
}

// Main execution
async function main() {
    console.log('🚀 Starting Epic 1 Metadata Restoration...\n');
    console.log(`API URL: ${API_URL}`);
    console.log(`API Key: ${(API_KEY || "").substring(0, 10)}...`);

    try {
        await createObjects();
        await createFields();
        await createRelations();

        console.log('\n✅ Epic 1 metadata restoration completed successfully!\n');
        console.log('Next steps:');
        console.log('1. Verify objects in Twenty UI: http://localhost:3001/settings/objects');
        console.log('2. Test CRUD operations for each object');
        console.log('3. Proceed with Epic 2-6 implementation\n');
    } catch (error: any) {
        console.error('\n❌ Migration failed:', error.message);
        process.exit(1);
    }
}

main();
