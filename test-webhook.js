/**
 * Test Webhook Script
 * 
 * This script helps test the webhook functionality by making a POST request
 * to the test webhook endpoint.
 * 
 * Usage:
 * 1. Make sure your development server is running (npm run dev)
 * 2. Run this script: node test-webhook.js
 * 3. Check the console output and server logs
 */

const https = require('https');
const http = require('http');

// Test configuration
const TEST_CONFIG = {
  url: 'http://localhost:3000/api/test-webhook',
  email: 'test@example.com',
  firstName: 'Test',
  lastName: 'User',
  customerName: 'Test User'
};

// Test data
const testData = {
  email: TEST_CONFIG.email,
  firstName: TEST_CONFIG.firstName,
  lastName: TEST_CONFIG.lastName,
  customerName: TEST_CONFIG.customerName
};

function makeRequest(data) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(data);
    
    const url = new URL(TEST_CONFIG.url);
    const options = {
      hostname: url.hostname,
      port: url.port || 3000,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = http.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        try {
          const parsedResponse = JSON.parse(responseData);
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            data: parsedResponse
          });
        } catch (error) {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            data: responseData
          });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.write(postData);
    req.end();
  });
}

async function runTest() {
  console.log('🧪 Starting webhook test...');
  console.log('📧 Test email:', TEST_CONFIG.email);
  console.log('👤 Test name:', `${TEST_CONFIG.firstName} ${TEST_CONFIG.lastName}`);
  console.log('🌐 Test URL:', TEST_CONFIG.url);
  console.log('');

  try {
    const response = await makeRequest(testData);
    
    console.log('📊 Response Status:', response.statusCode);
    console.log('📄 Response Headers:', response.headers);
    console.log('📝 Response Data:', JSON.stringify(response.data, null, 2));
    
    if (response.statusCode === 200 && response.data.success) {
      console.log('');
      console.log('✅ Test completed successfully!');
      console.log('📧 User email:', response.data.data?.email);
      console.log('🆔 User ID:', response.data.data?.userId);
      console.log('📋 Plan:', response.data.data?.plan);
    } else {
      console.log('');
      console.log('❌ Test failed!');
      console.log('💬 Error:', response.data.message || response.data.error);
    }
    
  } catch (error) {
    console.error('❌ Request failed:', error.message);
    console.log('');
    console.log('💡 Make sure your development server is running:');
    console.log('   npm run dev');
    console.log('');
    console.log('💡 Or check if the URL is correct:', TEST_CONFIG.url);
  }
}

// Run the test
runTest(); 