#!/usr/bin/env node
/**
 * Epic 1 Relations Script - v2
 * Relations are created as RELATION type fields in Twenty CRM
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
    if (!obj) throw new Error(`Object "${name}" not found`);
    return obj.node.id;
}

async function createRelationField(fromObjectId, toObjectId, fieldName, label, description) {
    const mutation = `
    mutation {
      createOneField(input: {
        field: {
          type: RELATION
          name: "${fieldName}"
          label: "${label}"
          objectMetadataId: "${fromObjectId}"
          relationObjectMetadataId: "${toObjectId}"
        }
      }) {
        id
        name
        type
      }
    }
  `;

    try {
        const result = await gql(mutation);
        console.log(`  ✅ ${description}`);
        return result;
    } catch (err) {
        if (err.includes('already exists') || err.includes('duplicate') || err.includes('NOT_AVAILABLE')) {
            console.log(`  ✓ ${description} (exists)`);
        } else {
            console.error(`  ❌ ${description}: ${err}`);
        }
    }
}

async function main() {
    console.log('🔗 Adding Epic 1 Relations (via RELATION fields)\n');

    // Get object IDs
    console.log('📦 Fetching object IDs...');
    const tree = await getObjectId('tree');
    const treeLot = await getObjectId('treeLot');
    const order = await getObjectId('order');
    const treePhoto = await getObjectId('treePhoto');
    const healthLog = await getObjectId('treeHealthLog');
    const person = await getObjectId('person');
    const workspaceMember = await getObjectId('workspaceMember');

    console.log(`  Tree: ${tree.substring(0, 8)}...`);
    console.log(`  TreeLot: ${treeLot.substring(0, 8)}...`);
    console.log(`  Order: ${order.substring(0, 8)}...`);
    console.log(`  TreePhoto: ${treePhoto.substring(0, 8)}...`);
    console.log(`  HealthLog: ${healthLog.substring(0, 8)}...`);
    console.log(`  Person: ${person.substring(0, 8)}...`);
    console.log(`  WorkspaceMember: ${workspaceMember.substring(0, 8)}...\n`);

    // Tree relations
    console.log('🌳 Creating Tree relations...');
    await createRelationField(tree, person, 'owner', 'Owner', 'Tree → Person (owner)');
    await createRelationField(tree, treeLot, 'lot', 'Lot', 'Tree → TreeLot');
    await createRelationField(tree, order, 'order', 'Order', 'Tree → Order');

    // TreeLot relations
    console.log('\n📍 Creating TreeLot relations...');
    await createRelationField(treeLot, workspaceMember, 'assignedOperator', 'Assigned Operator', 'TreeLot → WorkspaceMember');

    // Order relations
    console.log('\n🛒 Creating Order relations...');
    await createRelationField(order, person, 'customer', 'Customer', 'Order → Person (customer)');
    await createRelationField(order, workspaceMember, 'verifiedBy', 'Verified By', 'Order → WorkspaceMember');

    // TreePhoto relations
    console.log('\n📷 Creating TreePhoto relations...');
    await createRelationField(treePhoto, tree, 'tree', 'Tree', 'TreePhoto → Tree');
    await createRelationField(treePhoto, workspaceMember, 'uploadedBy', 'Uploaded By', 'TreePhoto → WorkspaceMember');

    // TreeHealthLog relations
    console.log('\n❤️ Creating TreeHealthLog relations...');
    await createRelationField(healthLog, tree, 'tree', 'Tree', 'TreeHealthLog → Tree');
    await createRelationField(healthLog, workspaceMember, 'loggedBy', 'Logged By', 'TreeHealthLog → WorkspaceMember');

    console.log('\n✅ Relations created!');
    console.log('\n📊 Summary:');
    console.log('  - Tree: 3 relations (owner, lot, order)');
    console.log('  - TreeLot: 1 relation (assignedOperator)');
    console.log('  - Order: 2 relations (customer, verifiedBy)');
    console.log('  - TreePhoto: 2 relations (tree, uploadedBy)');
    console.log('  - TreeHealthLog: 2 relations (tree, loggedBy)');
    console.log('\nVerify at: http://localhost:3001/settings/objects\n');
}

main().catch(err => {
    console.error('\n❌ Error:', err.message || err);
    process.exit(1);
});
