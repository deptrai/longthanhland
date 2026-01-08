/**
 * Verification test for Tree object creation
 * Story: E1.1 - Create Tree Object
 * 
 * This test verifies that the Tree object was created correctly via Metadata API.
 * NOTE: This test assumes the Tree object has already been created (manually or via migration script).
 */

import axios from 'axios';

const METADATA_API_URL = process.env.METADATA_API_URL || 'http://localhost:3000/metadata';
const API_KEY = process.env.TWENTY_API_KEY || '';

if (!API_KEY) {
    console.error('❌ Error: TWENTY_API_KEY environment variable is required for tests');
    console.log('   Set it before running tests: TWENTY_API_KEY=your_key yarn test');
    process.exit(1);
}

async function graphqlRequest(query: string): Promise<any> {
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

    if (response.data.errors) {
        throw new Error(`GraphQL errors: ${JSON.stringify(response.data.errors)}`);
    }

    return response.data.data;
}

describe('Tree Object Creation - E1.1', () => {
    let treeObjectId: string;

    describe('AC #1: Tree object exists with correct metadata', () => {
        it('should have nameSingular: "tree" and labelSingular: "Cây"', async () => {
            const query = `query { objects(paging: {first: 100}) { edges { node { id nameSingular namePlural labelSingular labelPlural icon isCustom } } } }`;
            const data = await graphqlRequest(query);

            const treeObject = data.objects.edges.find((e: any) => e.node.nameSingular === 'tree')?.node;

            expect(treeObject).toBeDefined();
            expect(treeObject.nameSingular).toBe('tree');
            expect(treeObject.namePlural).toBe('trees');
            expect(treeObject.labelSingular).toBe('Cây');
            expect(treeObject.isCustom).toBe(true);

            // Store for later tests
            treeObjectId = treeObject.id;
        });
    });

    describe('AC #2: Tree has all required fields', () => {
        it('should have treeCode field (TEXT, required)', async () => {
            const field = await getField('treeCode');
            expect(field.type).toBe('TEXT');
            expect(field.isNullable).toBe(false);
        });

        it('should have status field (SELECT with correct options)', async () => {
            const field = await getField('status');
            expect(field.type).toBe('SELECT');
            // Note: Options format may vary, check if it's array or object
            const options = Array.isArray(field.options) ? field.options : Object.keys(field.options || {});
            expect(options).toContain('SEEDLING');
            expect(options).toContain('PLANTED');
            expect(options).toContain('GROWING');
            expect(options).toContain('MATURE');
            expect(options).toContain('HARVESTED');
            expect(options).toContain('DEAD');
        });

        it('should have plantingDate field (DATE_TIME)', async () => {
            const field = await getField('plantingDate');
            expect(field.type).toBe('DATE_TIME');
        });

        it('should have harvestDate field (DATE_TIME)', async () => {
            const field = await getField('harvestDate');
            expect(field.type).toBe('DATE_TIME');
        });

        it('should have co2Absorbed field (NUMBER)', async () => {
            const field = await getField('co2Absorbed');
            expect(field.type).toBe('NUMBER');
        });

        it('should have heightCm field (NUMBER)', async () => {
            const field = await getField('heightCm');
            expect(field.type).toBe('NUMBER');
        });

        it('should have healthScore field (NUMBER)', async () => {
            const field = await getField('healthScore');
            expect(field.type).toBe('NUMBER');
        });

        it('should have latestPhoto field (TEXT)', async () => {
            const field = await getField('latestPhoto');
            expect(field.type).toBe('TEXT');
        });
    });

    describe('AC #3: Tree has owner relation to Person', () => {
        it('should have owner relation (many-to-one)', async () => {
            const query = `query { objects(paging: {first: 100}) { edges { node { id nameSingular fields(paging: {first: 100}) { edges { node { name type } } } } } } }`;
            const data = await graphqlRequest(query);

            const treeObject = data.objects.edges.find((e: any) => e.node.nameSingular === 'tree')?.node;
            const ownerField = treeObject.fields.edges.find((e: any) => e.node.name === 'owner')?.node;

            expect(ownerField).toBeDefined();
            expect(ownerField.type).toBe('RELATION');
            // Note: Relation details verification may require additional queries
        });
    });

    describe('AC #4: GPS location field exists (LINKS type)', () => {
        it('should have gpsLocation field (LINKS)', async () => {
            const field = await getField('gpsLocation');
            expect(field.type).toBe('LINKS');
        });
    });

    describe('AC #5: Object has correct icon', () => {
        it('should have icon: IconTree', async () => {
            const query = `query { objects(paging: {first: 100}) { edges { node { nameSingular icon } } } }`;
            const data = await graphqlRequest(query);

            const treeObject = data.objects.edges.find((e: any) => e.node.nameSingular === 'tree')?.node;
            expect(treeObject.icon).toBe('IconTree');
        });
    });

    /**
     * Helper function to get field metadata by name
     */
    async function getField(fieldName: string): Promise<any> {
        const query = `query { objects(paging: {first: 100}) { edges { node { id nameSingular fields(paging: {first: 100}) { edges { node { name type isNullable options } } } } } } }`;
        const data = await graphqlRequest(query);

        const treeObject = data.objects.edges.find((e: any) => e.node.nameSingular === 'tree')?.node;
        if (!treeObject) {
            throw new Error('Tree object not found');
        }

        const field = treeObject.fields.edges.find((e: any) => e.node.name === fieldName)?.node;
        if (!field) {
            throw new Error(`Field ${fieldName} not found`);
        }

        return field;
    }
});
