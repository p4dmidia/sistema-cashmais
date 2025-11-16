// Test script for network tree endpoint
const fetch = require('node-fetch');

async function testNetworkTree() {
  try {
    // Test without authentication (should return 401)
    console.log('Testing network tree endpoint without authentication...');
    const response1 = await fetch('http://127.0.0.1:8787/api/affiliate/network/tree?max_depth=3');
    console.log('Status:', response1.status);
    const data1 = await response1.json();
    console.log('Response:', data1);
    
    // Test with invalid session (should return 401)
    console.log('\nTesting network tree endpoint with invalid session...');
    const response2 = await fetch('http://127.0.0.1:8787/api/affiliate/network/tree?max_depth=3', {
      headers: {
        'Cookie': 'affiliate_session=invalid_session_123'
      }
    });
    console.log('Status:', response2.status);
    const data2 = await response2.json();
    console.log('Response:', data2);
    
  } catch (error) {
    console.error('Error testing network tree:', error.message);
  }
}

testNetworkTree();