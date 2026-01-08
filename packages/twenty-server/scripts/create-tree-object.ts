/**
 * Migration script to create Tree custom object in Twenty CRM
 * Story: E1.1 - Create Tree Object
 * 
 * This script creates the Tree object with all required fields via GraphQL Metadata API.
 * Relations to TreeLot and Order are skipped (blocked by E1.2, E1.3 dependencies).
 * 
 * Usage:
 * 1. Ensure Twenty server is running
 * 2. Run: ts-node scripts/create-tree-object.ts
 * 3. Verify in Twenty UI: Settings > Data model > Objects
 */

import axios from 'axios';

const METADATA_API_URL = process.env.METADATA_API_URL || 'http://localhost:3000/metadata';
const API_KEY = process.env.TWENTY_API_KEY || '';

if (!API_KEY) {
    console.error('❌ Error: TWENTY_API_KEY environment variable is required');
    console.log('   Create an API key in Twenty UI: Settings > APIs & Webhooks');
    console.log('   Then run: TWENTY_API_KEY=your_key ts-node scripts/create-tree-object.ts');
    process.exit(1);
}

interface GraphQLResponse<T> {
    data?: T;
    errors?: Array<{ message: string }>;
}

/**
 * Step 1: Create Tree Object
 */
async function createTreeObject(): Promise<string> {
    const mutation = `
        mutation CreateTreeObject {
            createOneObject(input: {
                object: {
                    nameSingular: "tree"
                    namePlural: "trees"
                    labelSingular: "Cây"
                    labelPlural: "Các cây"
                    icon: "IconTree"
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
            throw new Error(`GraphQL errors: ${JSON.stringify(response.data.errors)}`);
        }

        const objectId = response.data.data?.createOneObject.id;
        if (!objectId) {
            throw new Error('Failed to get object ID from response');
        }

        console.log('✅ Tree object created successfully');
        console.log(`   Object ID: ${objectId}`);
        return objectId;
    } catch (error) {
        console.error('❌ Failed to create Tree object:', error);
        throw error;
    }
}

/**
 * Step 2: Create Tree Fields
 */
async function createTreeFields(objectId: string): Promise<void> {
    const fields = [
        {
            name: 'treeCode',
            label: 'Mã cây',
            type: 'TEXT',
            isNullable: false,
            description: 'Format: TREE-YYYY-XXXXX',
        },
        {
            name: 'status',
            label: 'Trạng thái',
            type: 'SELECT',
            isNullable: false,
            options: ['SEEDLING', 'PLANTED', 'GROWING', 'MATURE', 'HARVESTED', 'DEAD'],
        },
        {
            name: 'plantingDate',
            label: 'Ngày trồng',
            type: 'DATE_TIME',
            isNullable: true,
        },
        {
            name: 'harvestDate',
            label: 'Ngày thu hoạch dự kiến',
            type: 'DATE_TIME',
            isNullable: true,
        },
        {
            name: 'co2Absorbed',
            label: 'CO2 hấp thụ (kg)',
            type: 'NUMBER',
            isNullable: true,
        },
        {
            name: 'heightCm',
            label: 'Chiều cao (cm)',
            type: 'NUMBER',
            isNullable: true,
        },
        {
            name: 'healthScore',
            label: 'Điểm sức khỏe',
            type: 'NUMBER',
            isNullable: true,
            description: '0-100',
        },
        {
            name: 'latestPhoto',
            label: 'Ảnh mới nhất',
            type: 'TEXT',
            isNullable: true,
            description: 'S3 URL',
        },
    ];

    for (const field of fields) {
        await createField(objectId, field);
    }

    console.log('✅ All fields created successfully');
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
                    ${field.options ? `options: ${JSON.stringify(field.options)}` : ''}
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
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${API_KEY}`,
                },
            }
        );

        if (response.data.errors) {
            throw new Error(`GraphQL errors for field ${field.name}: ${JSON.stringify(response.data.errors)}`);
        }

        console.log(`   ✓ Created field: ${field.name}`);
    } catch (error) {
        console.error(`   ✗ Failed to create field ${field.name}:`, error);
        throw error;
    }
}

/**
 * Step 3: Create GPS Location Field (LINKS type)
 */
async function createGPSField(objectId: string): Promise<void> {
    const mutation = `
        mutation CreateGPSField {
            createOneField(input: {
                field: {
                    objectMetadataId: "${objectId}"
                    name: "gpsLocation"
                    label: "Vị trí GPS"
                    type: LINKS
                    isNullable: true
                    description: "GPS coordinates with lat/lng"
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
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${API_KEY}`,
                },
            }
        );

        if (response.data.errors) {
            throw new Error(`GraphQL errors: ${JSON.stringify(response.data.errors)}`);
        }

        console.log('✅ GPS location field created');
    } catch (error) {
        console.error('❌ Failed to create GPS field:', error);
        throw error;
    }
}

/**
 * Step 4: Create owner relation to Person (built-in object)
 */
async function createOwnerRelation(objectId: string, personId: string): Promise<void> {
    const mutation = `
        mutation CreateOwnerRelation {
            createOneField(input: {
                field: {
                    objectMetadataId: "${objectId}"
                    name: "owner"
                    label: "Chủ sở hữu"
                    type: RELATION
                    isNullable: true
                    description: "The person who owns this tree"
                    relationCreationPayload: {
                        type: "MANY_TO_ONE"
                        targetObjectMetadataId: "${personId}"
                        targetFieldLabel: "Trees"
                        targetFieldIcon: "IconTree"
                    }
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
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${API_KEY}`,
                },
            }
        );

        if (response.data.errors) {
            throw new Error(`GraphQL errors: ${JSON.stringify(response.data.errors)}`);
        }

        console.log('✅ Owner relation created');
    } catch (error) {
        console.error('❌ Failed to create owner relation:', error);
        throw error;
    }
}

/**
 * Get Person object ID
 */
async function getPersonObjectId(): Promise<string> {
    const query = `query { objects(paging: {first: 100}) { edges { node { id nameSingular } } } }`;

    const response = await axios.post(
        METADATA_API_URL,
        { query },
        {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${API_KEY}`,
            },
        }
    );

    const personObj = response.data.data?.objects?.edges.find((e: any) => e.node.nameSingular === 'person');
    if (!personObj) {
        throw new Error('Person object not found');
    }

    return personObj.node.id;
}

/**
 * Main execution
 */
async function main() {
    console.log('🚀 Starting Tree object creation...\n');

    try {
        // Task 1: Create Tree object
        const objectId = await createTreeObject();

        // Task 2: Create fields
        await createTreeFields(objectId);
        await createGPSField(objectId);

        // Task 3: Get Person ID and create owner relation
        const personId = await getPersonObjectId();
        await createOwnerRelation(objectId, personId);

        console.log('\n✅ Tree object migration completed successfully!');
        console.log('\n📝 Next steps:');
        console.log('   1. Verify in Twenty UI: Settings > Data model > Objects');
        console.log('   2. Complete E1.2 (TreeLot) and E1.3 (Order) to enable remaining relations');
        console.log('   3. Test CRUD operations via GraphQL API');
    } catch (error) {
        console.error('\n❌ Migration failed:', error);
        process.exit(1);
    }
}

// Run migration
main();
