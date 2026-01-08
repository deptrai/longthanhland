/**
 * Concurrent Webhook Test
 * 
 * Tests idempotency by sending multiple simultaneous webhook requests
 * Run: node concurrent-webhook-test.js
 */

const WEBHOOK_URL = 'http://localhost:3000/webhooks/banking';
const SECRET = 'dev-secret-change-in-production';

// Create HMAC signature
const crypto = require('crypto');
function createSignature(payload, secret) {
    return crypto.createHmac('sha256', secret).update(JSON.stringify(payload)).digest('hex');
}

// Create test payload
function createPayload(transactionId = `TXN-${Date.now()}`) {
    const timestamp = new Date().toISOString();
    return {
        transactionId,
        amount: 260000,
        content: `Thanh toan DGX-20260109-TEST1`,
        bankCode: 'VCB',
        accountNumber: '1234567890',
        timestamp,
        signature: '', // Will be filled
    };
}

// Send webhook request
async function sendWebhook(payload, index) {
    const signature = createSignature(payload, SECRET);

    try {
        const response = await fetch(WEBHOOK_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-webhook-signature': signature,
                'x-request-id': `test-${index}-${Date.now()}`,
            },
            body: JSON.stringify(payload),
        });

        const data = await response.json();
        return { index, status: response.status, data };
    } catch (error) {
        return { index, error: error.message };
    }
}

// Main test
async function runConcurrentTest() {
    console.log('🧪 Running Concurrent Webhook Test\n');

    // Test 1: Same transactionId sent multiple times simultaneously
    console.log('📍 Test 1: Duplicate Transaction IDs (5 concurrent requests)');
    const sameTransactionId = `TXN-CONCURRENT-${Date.now()}`;
    const duplicatePayloads = Array(5).fill(null).map(() => createPayload(sameTransactionId));

    const startTime = Date.now();
    const results = await Promise.all(
        duplicatePayloads.map((payload, i) => sendWebhook(payload, i + 1))
    );
    const duration = Date.now() - startTime;

    console.log(`   Duration: ${duration}ms`);
    console.log('   Results:');
    results.forEach(r => {
        if (r.error) {
            console.log(`   - Request ${r.index}: ERROR - ${r.error}`);
        } else {
            console.log(`   - Request ${r.index}: ${r.status} - ${r.data?.message}`);
        }
    });

    // Count unique outcomes
    const successCount = results.filter(r => r.data?.success && r.data?.message === 'Payment processed successfully').length;
    const duplicateCount = results.filter(r => r.data?.success && r.data?.message === 'Transaction already processed').length;
    const errorCount = results.filter(r => !r.data?.success || r.error).length;

    console.log(`\n   Summary: ${successCount} processed, ${duplicateCount} duplicates, ${errorCount} errors`);

    if (successCount <= 1 && duplicateCount >= results.length - 1) {
        console.log('   ✅ PASS: Idempotency working correctly!');
    } else if (successCount > 1) {
        console.log('   ⚠️ WARNING: Multiple transactions processed - race condition detected!');
    } else {
        console.log('   ❓ INCONCLUSIVE: Check server logs');
    }

    // Test 2: Different transactionIds sent concurrently
    console.log('\n📍 Test 2: Different Transaction IDs (3 concurrent requests)');
    const uniquePayloads = Array(3).fill(null).map((_, i) => createPayload(`TXN-UNIQUE-${Date.now()}-${i}`));

    const uniqueResults = await Promise.all(
        uniquePayloads.map((payload, i) => sendWebhook(payload, i + 1))
    );

    console.log('   Results:');
    uniqueResults.forEach(r => {
        if (r.error) {
            console.log(`   - Request ${r.index}: ERROR - ${r.error}`);
        } else {
            console.log(`   - Request ${r.index}: ${r.status} - ${r.data?.message}`);
        }
    });

    console.log('\n🏁 Test Complete');
}

runConcurrentTest().catch(console.error);
