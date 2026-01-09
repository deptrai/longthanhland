#!/usr/bin/env node
/**
 * SIMPLE Epic 1 Metadata Seeding Script
 * Just create objects - if they exist, it'll error (and we ignore it)
 * Much simpler than checking existence first!
 */

const axios = require('axios');

const API_URL = 'http://localhost:3000/metadata';
const API_KEY = process.env.TWENTY_API_KEY;

if (!API_KEY) {
    console.error('❌ Error: TWENTY_API_KEY required');
    process.exit(1);
}

const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${API_KEY}`,
};

async function graphql(query) {
    try {
        const response = await axios.post(API_URL, { query }, { headers });
        if (response.data.errors) {
            throw new Error(JSON.stringify(response.data.errors, null, 2));
        }
        return response.data.data;
    } catch (error) {
        throw error.response?.data?.errors || error.message;
    }
}

async function main() {
    console.log('🚀 Starting Epic 1 Metadata Seeding...\\n');

    // Step 1: Create Objects
    console.log('📦 Creating objects...\\n');
    const objects = [
        { name: 'tree', label: 'Cây', icon: 'IconTree' },
        { name: 'treeLot', label: 'Lô cây', icon: 'IconMapPin' },
        { name: 'order', label: 'Đơn hàng', icon: 'IconShoppingCart' },
        { name: 'treePhoto', label: 'Ảnh cây', icon: 'IconPhoto' },
        { name: 'treeHealthLog', label: 'Nhật ký sức khỏe', icon: 'IconHeartbeat' },
    ];

    for (const obj of objects) {
        const mutation = `
      mutation {
        createOneObject(input: {
          object: {
            nameSingular: "${obj.name}"
            namePlural: "${obj.name}s"
            labelSingular: "${obj.label}"
            labelPlural: "${obj.label}"
            description: "Epic 1 - ${obj.label}"
            icon: "${obj.icon}"
          }
        }) {
          id
          nameSingular
        }
      }
    `;

        try {
            const data = await graphql(mutation);
            console.log(`✅ Created: ${data.createOneObject.nameSingular}`);
        } catch (err) {
            console.log(`⚠️  ${obj.name}: ${err[0]?.message || 'Already exists'}`);
        }
    }

    console.log('\\n✅ Done! Check http://localhost:3001/settings/objects\\n');
}

main().catch(err => {
    console.error('\\n❌ Failed:', err);
    process.exit(1);
});
