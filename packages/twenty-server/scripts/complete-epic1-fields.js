#!/usr/bin/env node
/**
 * Complete Epic 1 Metadata Setup
 * Adds all fields and relations for Tree, TreeLot, Order, TreePhoto, TreeHealthLog
 */

const axios = require('axios');

const API_URL = 'http://localhost:3000/metadata';
const API_KEY = process.env.TWENTY_API_KEY;

if (!API_KEY) {
    console.error('❌ TWENTY_API_KEY required');
    process.exit(1);
}

const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${API_KEY}`,
};

async function gql(query) {
    try {
        const res = await axios.post(API_URL, { query }, { headers });
        if (res.data.errors) throw new Error(JSON.stringify(res.data.errors, null, 2));
        return res.data.data;
    } catch (err) {
        throw err.response?.data?.errors?.[0]?.message || err.message;
    }
}

async function getObjectId(name) {
    const data = await gql(`{objects(paging:{first:100}){edges{node{id nameSingular}}}}`);
    const obj = data.objects.edges.find(e => e.node.nameSingular === name);
    if (!obj) {
        console.error(`❌ Object "${name}" not found!`);
        return null;
    }
    return obj.node.id;
}

async function createField(objectId, field) {
    const optionsStr = field.options ?
        `options: ${JSON.stringify(field.options).replace(/"(\w+)":/g, '$1:')}` : '';

    const mutation = `
    mutation {
      createOneField(input: {
        field: {
          name: "${field.name}"
          label: "${field.label}"
          type: ${field.type}
          objectMetadataId: "${objectId}"
          ${optionsStr}
        }
      }) {
        id name
      }
    }
  `;

    try {
        await gql(mutation);
        console.log(`  ✅ ${field.name}`);
    } catch (err) {
        if (err.includes('already exists')) {
            console.log(`  ✓ ${field.name} (exists)`);
        } else {
            console.error(`  ❌ ${field.name}: ${err}`);
        }
    }
}

async function main() {
    console.log('🚀 Adding Epic 1 Fields & Relations\n');

    const treeId = await getObjectId('tree');
    const treeLotId = await getObjectId('treeLot');
    const orderId = await getObjectId('order');
    const treePhotoId = await getObjectId('treePhoto');
    const healthLogId = await getObjectId('treeHealthLog');

    console.log('📦 Object IDs:');
    console.log(`  Tree: ${treeId}`);
    console.log(`  TreeLot: ${treeLotId}`);
    console.log(`  Order: ${orderId}`);
    console.log(`  TreePhoto: ${treePhotoId}`);
    console.log(`  HealthLog: ${healthLogId}\n`);

    // Tree fields
    console.log('🌳 Creating Tree fields...');
    const treeFields = [
        { name: 'treeCode', label: 'Tree Code', type: 'TEXT' },
        {
            name: 'status',
            label: 'Status',
            type: 'SELECT',
            options: [
                { value: 'SEEDLING', label: 'Seedling', color: 'green', position: 0 },
                { value: 'PLANTED', label: 'Planted', color: 'blue', position: 1 },
                { value: 'GROWING', label: 'Growing', color: 'turquoise', position: 2 },
                { value: 'MATURE', label: 'Mature', color: 'purple', position: 3 },
                { value: 'HARVESTED', label: 'Harvested', color: 'orange', position: 4 },
                { value: 'DEAD', label: 'Dead', color: 'red', position: 5 },
            ],
        },
        { name: 'plantingDate', label: 'Planting Date', type: 'DATE_TIME' },
        { name: 'harvestDate', label: 'Expected Harvest', type: 'DATE_TIME' },
        { name: 'co2Absorbed', label: 'CO2 Absorbed (kg)', type: 'NUMBER' },
        { name: 'heightCm', label: 'Height (cm)', type: 'NUMBER' },
        { name: 'healthScore', label: 'Health Score', type: 'NUMBER' },
        { name: 'latestPhoto', label: 'Latest Photo URL', type: 'TEXT' },
    ];

    for (const field of treeFields) {
        await createField(treeId, field);
    }

    // TreeLot fields
    console.log('\n📍 Creating TreeLot fields...');
    const treeLotFields = [
        { name: 'lotCode', label: 'Lot Code', type: 'TEXT' },
        { name: 'lotName', label: 'Lot Name', type: 'TEXT' },
        { name: 'location', label: 'Location', type: 'TEXT' },
        { name: 'gpsCenter', label: 'GPS Center', type: 'TEXT' },
        { name: 'capacity', label: 'Capacity', type: 'NUMBER' },
        { name: 'plantedCount', label: 'Planted Count', type: 'NUMBER' },
    ];

    for (const field of treeLotFields) {
        await createField(treeLotId, field);
    }

    // Order fields
    console.log('\n🛒 Creating Order fields...');
    const orderFields = [
        { name: 'orderCode', label: 'Order Code', type: 'TEXT' },
        { name: 'quantity', label: 'Quantity', type: 'NUMBER' },
        { name: 'totalAmount', label: 'Total Amount', type: 'NUMBER' },
        {
            name: 'paymentMethod',
            label: 'Payment Method',
            type: 'SELECT',
            options: [
                { value: 'BANKING', label: 'Banking', color: 'blue', position: 0 },
                { value: 'USDT', label: 'USDT (BSC)', color: 'green', position: 1 },
            ],
        },
        {
            name: 'paymentStatus',
            label: 'Payment Status',
            type: 'SELECT',
            options: [
                { value: 'PENDING', label: 'Pending', color: 'yellow', position: 0 },
                { value: 'VERIFIED', label: 'Verified', color: 'green', position: 1 },
                { value: 'FAILED', label: 'Failed', color: 'red', position: 2 },
                { value: 'REFUNDED', label: 'Refunded', color: 'orange', position: 3 },
            ],
        },
        {
            name: 'orderStatus',
            label: 'Order Status',
            type: 'SELECT',
            options: [
                { value: 'CREATED', label: 'Created', color: 'gray', position: 0 },
                { value: 'PAID', label: 'Paid', color: 'blue', position: 1 },
                { value: 'ASSIGNED', label: 'Assigned', color: 'purple', position: 2 },
                { value: 'COMPLETED', label: 'Completed', color: 'green', position: 3 },
            ],
        },
        { name: 'referralCode', label: 'Referral Code', type: 'TEXT' },
        { name: 'contractPdfUrl', label: 'Contract PDF URL', type: 'TEXT' },
        { name: 'transactionHash', label: 'Transaction Hash', type: 'TEXT' },
        { name: 'paidAt', label: 'Paid At', type: 'DATE_TIME' },
    ];

    for (const field of orderFields) {
        await createField(orderId, field);
    }

    // TreePhoto fields
    console.log('\n📷 Creating TreePhoto fields...');
    const photoFields = [
        { name: 'photoUrl', label: 'Photo URL', type: 'TEXT' },
        { name: 'thumbnailUrl', label: 'Thumbnail URL', type: 'TEXT' },
        { name: 'quarter', label: 'Quarter (YYYY-QN)', type: 'TEXT' },
        { name: 'caption', label: 'Caption', type: 'TEXT' },
        { name: 'capturedAt', label: 'Captured At', type: 'DATE_TIME' },
        { name: 'gpsLat', label: 'GPS Latitude', type: 'NUMBER' },
        { name: 'gpsLng', label: 'GPS Longitude', type: 'NUMBER' },
        { name: 'isPlaceholder', label: 'Is Placeholder', type: 'BOOLEAN' },
    ];

    for (const field of photoFields) {
        await createField(treePhotoId, field);
    }

    // TreeHealthLog fields
    console.log('\n❤️ Creating TreeHealthLog fields...');
    const healthFields = [
        {
            name: 'status',
            label: 'Health Status',
            type: 'SELECT',
            options: [
                { value: 'HEALTHY', label: 'Healthy', color: 'green', position: 0 },
                { value: 'SICK', label: 'Sick', color: 'yellow', position: 1 },
                { value: 'DEAD', label: 'Dead', color: 'red', position: 2 },
                { value: 'REPLANTED', label: 'Replanted', color: 'blue', position: 3 },
            ],
        },
        { name: 'notes', label: 'Notes', type: 'TEXT' },
        { name: 'treatment', label: 'Treatment', type: 'TEXT' },
        { name: 'loggedAt', label: 'Logged At', type: 'DATE_TIME' },
    ];

    for (const field of healthFields) {
        await createField(healthLogId, field);
    }

    console.log('\n✅ All fields created!\n');
    console.log('Next: Add relations via Twenty UI at http://localhost:3001/settings/objects');
}

main().catch(err => {
    console.error('\n❌ Error:', err);
    process.exit(1);
});
