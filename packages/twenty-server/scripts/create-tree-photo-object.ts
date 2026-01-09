/**
 * Migration script to create TreePhoto custom object in Twenty CRM
 * Story: E1.4 - Create TreePhoto Object
 * 
 * This script creates the TreePhoto object with all required fields via GraphQL Metadata API.
 */

import axios from 'axios';

const METADATA_API_URL = process.env.METADATA_API_URL || 'http://localhost:3000/metadata';
const API_KEY = process.env.TWENTY_API_KEY || '';

if (!API_KEY) {
    console.error('❌ Error: TWENTY_API_KEY environment variable is required');
    console.log('   Create an API key in Twenty UI: Settings > APIs & Webhooks');
    console.log('   Then run: TWENTY_API_KEY=your_key ts-node scripts/create-tree-photo-object.ts');
    process.exit(1);
}

interface GraphQLResponse<T> {
    data?: T;
    errors?: Array<{ message: string }>;
}

/**
 * Step 1: Create TreePhoto Object
 */
async function createTreePhotoObject(): Promise<string> {
    const mutation = `
        mutation CreateTreePhotoObject {
            createOneObject(input: {
                object: {
                    nameSingular: "treePhoto"
                    namePlural: "treePhotos"
                    labelSingular: "Ảnh cây"
                    labelPlural: "Ảnh cây"
                    icon: "IconPhoto"
                }
            }) {
                id
                nameSingular
                labelSingular
            }
        }
    `;

    try {
        const response = await axios.post<GraphQLResponse<{ createOneObject: { id: string } }>>(
            METADATA_API_URL,
            { query: mutation },
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${API_KEY}`,
                },
            }
        );

        if (response.data.errors) {
            // Check if object already exists
            const errorMsg = JSON.stringify(response.data.errors);
            if (errorMsg.includes('already exists')) {
                console.log('⚠️ TreePhoto object might already exist. Attempting to fetch ID...');
                return await getObjectId('treePhoto');
            }
            throw new Error(`GraphQL errors: ${errorMsg}`);
        }

        const objectId = response.data.data?.createOneObject.id;
        if (!objectId) {
            throw new Error('Failed to get object ID from response');
        }

        console.log('✅ TreePhoto object created successfully');
        console.log(`   Object ID: ${objectId}`);
        return objectId;
    } catch (error) {
        console.error('❌ Failed to create TreePhoto object:', error);
        throw error;
    }
}

async function getObjectId(nameSingular: string): Promise<string> {
    const query = `query { objects(paging: {first: 100}) { edges { node { id nameSingular } } } }`;
    const response = await axios.post(
        METADATA_API_URL,
        { query },
        { headers: { 'Authorization': `Bearer ${API_KEY}`, 'Content-Type': 'application/json' } }
    );
    const obj = response.data.data?.objects?.edges.find((e: any) => e.node.nameSingular === nameSingular);
    if (!obj) throw new Error(`Object ${nameSingular} not found`);
    return obj.node.id;
}

/**
 * Step 2: Create Fields
 */
async function createTreePhotoFields(objectId: string): Promise<void> {
    const fields = [
        {
            name: 'photoUrl',
            label: 'Photo URL',
            type: 'TEXT',
            isNullable: false,
            description: 'S3 URL of the original photo',
        },
        {
            name: 'thumbnailUrl',
            label: 'Thumbnail URL',
            type: 'TEXT',
            isNullable: true,
            description: 'S3 URL of the thumbnail',
        },
        {
            name: 'capturedAt',
            label: 'Chụp lúc',
            type: 'DATE_TIME',
            isNullable: false,
        },
        {
            name: 'gpsLat',
            label: 'Vĩ độ (Lat)',
            type: 'NUMBER',
            isNullable: true,
        },
        {
            name: 'gpsLng',
            label: 'Kinh độ (Lng)',
            type: 'NUMBER',
            isNullable: true,
        },
        {
            name: 'quarter',
            label: 'Quý',
            type: 'TEXT',
            isNullable: false,
            description: 'Format: Q1-2026',
        },
        {
            name: 'isPlaceholder',
            label: 'Là ảnh mẫu',
            type: 'BOOLEAN',
            isNullable: false,
            defaultValue: false,
        },
        {
            name: 'caption',
            label: 'Mô tả',
            type: 'TEXT',
            isNullable: true,
        },
    ];

    for (const field of fields) {
        await createField(objectId, field);
    }

    console.log('✅ All scalar fields created successfully');
}

async function createField(objectId: string, field: any): Promise<void> {
    const mutation = `
        mutation CreateField {
            createOneField(input: {
                field: {
                    objectMetadataId: "${objectId}"
                    name: "${field.name}"
                    label: "${field.label}"
                    type: ${field.type}
                    isNullable: ${field.isNullable}
                    ${field.description ? `description: "${field.description}"` : ''}
                    ${field.defaultValue !== undefined ? `defaultValue: ${field.defaultValue}` : ''}
                }
            }) {
                id
                name
            }
        }
    `;

    try {
        const response = await axios.post(
            METADATA_API_URL,
            { query: mutation },
            { headers: { 'Authorization': `Bearer ${API_KEY}`, 'Content-Type': 'application/json' } }
        );

        if (response.data.errors) {
            const errorMsg = JSON.stringify(response.data.errors);
            if (errorMsg.includes('already exists')) {
                console.log(`   ⚠️ Field ${field.name} already exists. Skipping.`);
                return;
            }
            throw new Error(`GraphQL errors for field ${field.name}: ${errorMsg}`);
        }

        console.log(`   ✓ Created field: ${field.name}`);
    } catch (error) {
        console.error(`   ✗ Failed to create field ${field.name}:`, error);
        throw error;
    }
}

/**
 * Step 3: Create Relations
 */
async function createRelations(objectId: string): Promise<void> {
    // 1. Relation to Tree
    try {
        const treeId = await getObjectId('tree');
        await createRelation(objectId, treeId, 'tree', 'Cây', 'MANY_TO_ONE', 'IconTree', 'photos');
        console.log('✅ Relation to Tree created');
    } catch (e) {
        console.error('❌ Failed to create relation to Tree:', e);
    }

    // 2. Relation to WorkspaceMember (uploadedBy)
    try {
        const memberId = await getObjectId('workspaceMember');
        await createRelation(objectId, memberId, 'uploadedBy', 'Người tải lên', 'MANY_TO_ONE', 'IconUser', 'uploadedPhotos');
        console.log('✅ Relation to WorkspaceMember created');
    } catch (e) {
        console.error('❌ Failed to create relation to WorkspaceMember:', e);
    }
}

async function createRelation(
    objectId: string,
    targetObjectId: string,
    name: string,
    label: string,
    type: string,
    icon: string,
    targetFieldLabel: string
): Promise<void> {
    const mutation = `
        mutation CreateRelation {
            createOneField(input: {
                field: {
                    objectMetadataId: "${objectId}"
                    name: "${name}"
                    label: "${label}"
                    type: RELATION
                    isNullable: true
                    relationCreationPayload: {
                        type: "${type}"
                        targetObjectMetadataId: "${targetObjectId}"
                        targetFieldLabel: "${targetFieldLabel}"
                        targetFieldIcon: "${icon}"
                    }
                }
            }) {
                id
                name
            }
        }
    `;

    const response = await axios.post(
        METADATA_API_URL,
        { query: mutation },
        { headers: { 'Authorization': `Bearer ${API_KEY}`, 'Content-Type': 'application/json' } }
    );

    if (response.data.errors) {
        const errorMsg = JSON.stringify(response.data.errors);
        if (errorMsg.includes('already exists')) {
            console.log(`   ⚠️ Relation ${name} already exists. Skipping.`);
            return;
        }
        throw new Error(`GraphQL errors for relation ${name}: ${errorMsg}`);
    }
}

/**
 * Main execution
 */
async function main() {
    console.log('🚀 Starting TreePhoto object creation...\n');

    try {
        const objectId = await createTreePhotoObject();
        await createTreePhotoFields(objectId);
        await createRelations(objectId);

        console.log('\n✅ TreePhoto object migration completed successfully!');
    } catch (error) {
        console.error('\n❌ Migration failed:', error);
        process.exit(1);
    }
}

main();
