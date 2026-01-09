/**
 * Migration script to create TreeHealthLog custom object in Twenty CRM
 * Story: E1.5 - Create TreeHealthLog Object
 */

import axios from 'axios';

const METADATA_API_URL = process.env.METADATA_API_URL || 'http://localhost:3000/metadata';
const API_KEY = process.env.TWENTY_API_KEY || '';

if (!API_KEY) {
    console.error('❌ Error: TWENTY_API_KEY environment variable is required');
    console.log('   Run: TWENTY_API_KEY=your_key ts-node scripts/create-tree-health-log-object.ts');
    process.exit(1);
}

interface GraphQLResponse<T> {
    data?: T;
    errors?: Array<{ message: string }>;
}

async function createTreeHealthLogObject(): Promise<string> {
    const mutation = `
        mutation CreateTreeHealthLogObject {
            createOneObject(input: {
                object: {
                    nameSingular: "treeHealthLog"
                    namePlural: "treeHealthLogs"
                    labelSingular: "Nhật ký sức khỏe cây"
                    labelPlural: "Nhật ký sức khỏe cây"
                    icon: "IconFirstAidKit"
                }
            }) {
                id
                nameSingular
            }
        }
    `;

    try {
        const response = await axios.post<GraphQLResponse<{ createOneObject: { id: string } }>>(
            METADATA_API_URL,
            { query: mutation },
            { headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${API_KEY}` } }
        );

        if (response.data.errors) {
            const errorMsg = JSON.stringify(response.data.errors);
            if (errorMsg.includes('already exists')) {
                console.log('⚠️ TreeHealthLog object might already exist. Fetching ID...');
                return await getObjectId('treeHealthLog');
            }
            throw new Error(errorMsg);
        }

        const objectId = response.data.data?.createOneObject.id;
        if (!objectId) throw new Error('Failed to get object ID');

        console.log('✅ TreeHealthLog object created successfully');
        return objectId;
    } catch (error) {
        console.error('❌ Failed to create TreeHealthLog object:', error);
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

async function createTreeHealthLogFields(objectId: string): Promise<void> {
    const fields = [
        {
            name: 'status',
            label: 'Trạng thái',
            type: 'SELECT',
            isNullable: false,
            options: [
                { label: 'Khỏe mạnh', value: 'HEALTHY', color: 'green' },
                { label: 'Bệnh', value: 'SICK', color: 'yellow' },
                { label: 'Đã chết', value: 'DEAD', color: 'red' },
                { label: 'Đã trồng lại', value: 'REPLANTED', color: 'blue' },
            ],
        },
        {
            name: 'notes',
            label: 'Ghi chú',
            type: 'TEXT',
            isNullable: true,
        },
        {
            name: 'treatment',
            label: 'Biện pháp xử lý',
            type: 'TEXT',
            isNullable: true,
        },
        {
            name: 'loggedAt',
            label: 'Thời gian ghi nhận',
            type: 'DATE_TIME',
            isNullable: true,
            description: 'Thời điểm thực tế diễn ra (có thể khác thời điểm tạo record)',
        },
    ];

    for (const field of fields) {
        await createField(objectId, field);
    }
    console.log('✅ Fields created successfully');
    console.log('⚠️ Note: Recommended to add database index on "createdAt" and "loggedAt" for performance optimization.');
}

async function createField(objectId: string, field: any): Promise<void> {
    const optionsString = field.options
        ? `options: [${field.options.map((o: any) => `{label: "${o.label}", value: "${o.value}", color: "${o.color}"}`).join(', ')}]`
        : '';

    const mutation = `
        mutation CreateField {
            createOneField(input: {
                field: {
                    objectMetadataId: "${objectId}"
                    name: "${field.name}"
                    label: "${field.label}"
                    type: ${field.type}
                    isNullable: ${field.isNullable}
                    ${optionsString}
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
            if (!errorMsg.includes('already exists')) {
                throw new Error(`GraphQL errors for field ${field.name}: ${errorMsg}`);
            }
        }
        console.log(`   ✓ Formatted field: ${field.name}`);
    } catch (error) {
        console.error(`   ✗ Failed to create field ${field.name}:`, error);
        throw error;
    }
}

async function createRelations(objectId: string): Promise<void> {
    // 1. Relation to Tree
    try {
        const treeId = await getObjectId('tree');
        await createRelation(objectId, treeId, 'tree', 'Cây', 'MANY_TO_ONE', 'IconTree', 'healthLogs');
        console.log('✅ Relation to Tree created');
    } catch (e) { console.error(e); }

    // 2. Relation to WorkspaceMember (loggedBy)
    try {
        const memberId = await getObjectId('workspaceMember');
        await createRelation(objectId, memberId, 'loggedBy', 'Người ghi nhận', 'MANY_TO_ONE', 'IconUser', 'loggedHealthLogs');
        console.log('✅ Relation to WorkspaceMember created');
    } catch (e) { console.error(e); }
}

async function createRelation(objectId: string, targetObjectId: string, name: string, label: string, type: string, icon: string, targetFieldLabel: string): Promise<void> {
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
            }
        }
    `;
    await axios.post(METADATA_API_URL, { query: mutation }, { headers: { 'Authorization': `Bearer ${API_KEY}`, 'Content-Type': 'application/json' } });
}

async function main() {
    console.log('🚀 Starting TreeHealthLog object creation...');
    try {
        const objectId = await createTreeHealthLogObject();
        await createTreeHealthLogFields(objectId);
        await createRelations(objectId);
        console.log('✅ TreeHealthLog migration done!');
    } catch (error) {
        process.exit(1);
    }
}

main();
