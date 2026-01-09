#!/usr/bin/env node
/**
 * Epic 1 Relations - Final Version
 * Uses relationCreationPayload with correct structure
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

async function createRelation(fromObjId, toObjId, fieldName, fieldLabel, reverseLabel, icon, description) {
    // Use axios directly with variables to avoid quote escaping issues
    const mutation = `
    mutation CreateRelationField($input: CreateOneFieldMetadataInput!) {
      createOneField(input: $input) {
        id
        name
        label
      }
    }
  `;

    const variables = {
        input: {
            field: {
                type: 'RELATION',
                name: fieldName,
                label: fieldLabel,
                icon: icon,
                objectMetadataId: fromObjId,
                relationCreationPayload: {
                    type: 'MANY_TO_ONE',
                    targetObjectMetadataId: toObjId,
                    targetFieldLabel: reverseLabel,
                    targetFieldIcon: 'IconLink'
                }
            }
        }
    };

    try {
        const res = await axios.post(API_URL, { query: mutation, variables }, { headers });
        if (res.data.errors) throw new Error(JSON.stringify(res.data.errors, null, 2));
        console.log(`  ✅ ${description}`);
        return res.data.data;
    } catch (err) {
        const errStr = err.response?.data?.errors?.[0]?.message || err.message || JSON.stringify(err);
        if (errStr.includes('already exists') || errStr.includes('NOT_AVAILABLE')) {
            console.log(`  ✓ ${description} (exists)`);
        } else {
            console.error(`  ❌ ${description}:`);
            console.error(err.response?.data?.errors || err.message || err);
        }
    }
}

async function main() {
    console.log('🔗 Adding Epic 1 Relations (Final Version)\n');

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

    // Tree relations (3)
    console.log('🌳 Creating Tree relations...');
    await createRelation(tree, person, 'owner', 'Owner', 'Owned Trees', 'IconUser', 'Tree → Person (owner)');
    await createRelation(tree, treeLot, 'lot', 'Lot', 'Trees', 'IconMapPin', 'Tree → TreeLot');
    await createRelation(tree, order, 'order', 'Order', 'Trees', 'IconShoppingCart', 'Tree → Order');

    // TreeLot relations (1)
    console.log('\n📍 Creating TreeLot relations...');
    await createRelation(treeLot, workspaceMember, 'assignedOperator', 'Assigned Operator', 'Assigned Lots', 'IconUserCircle', 'TreeLot → WorkspaceMember');

    // Order relations (2)
    console.log('\n🛒 Creating Order relations...');
    await createRelation(order, person, 'customer', 'Customer', 'Orders', 'IconUser', 'Order → Person (customer)');
    await createRelation(order, workspaceMember, 'verifiedBy', 'Verified By', 'Verified Orders', 'IconUserCheck', 'Order → WorkspaceMember');

    // TreePhoto relations (2)
    console.log('\n📷 Creating TreePhoto relations...');
    await createRelation(treePhoto, tree, 'tree', 'Tree', 'Photos', 'IconTree', 'TreePhoto → Tree');
    await createRelation(treePhoto, workspaceMember, 'uploadedBy', 'Uploaded By', 'Uploaded Photos', 'IconUpload', 'TreePhoto → WorkspaceMember');

    // TreeHealthLog relations (2)
    console.log('\n❤️ Creating TreeHealthLog relations...');
    await createRelation(healthLog, tree, 'tree', 'Tree', 'Health Logs', 'IconTree', 'TreeHealthLog → Tree');
    await createRelation(healthLog, workspaceMember, 'loggedBy', 'Logged By', 'Logged Health Records', 'IconHeartbeat', 'TreeHealthLog → WorkspaceMember');

    console.log('\n✅ All 10 relations created!');
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
