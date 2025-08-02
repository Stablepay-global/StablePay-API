#!/usr/bin/env node

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Read the API endpoints file
const endpointsPath = join(__dirname, 'client', 'src', 'lib', 'api-endpoints.ts');
const content = readFileSync(endpointsPath, 'utf-8');

// Extract the API_ENDPOINTS array
const endpointsMatch = content.match(/export const API_ENDPOINTS: ApiEndpoint\[\] = (\[[\s\S]*?\]);/);
if (!endpointsMatch) {
  console.error('Could not find API_ENDPOINTS in the file');
  process.exit(1);
}

// Parse the endpoints (simplified parsing)
const endpointsText = endpointsMatch[1];
const endpoints = [];

// Simple regex-based parsing to extract endpoint info
const endpointBlocks = endpointsText.match(/\{[^}]*id:\s*'[^']*'[^}]*\}/g);

console.log('🔍 Debugging API Endpoints Configuration\n');
console.log('=====================================\n');

endpointBlocks?.forEach((block, index) => {
  const idMatch = block.match(/id:\s*'([^']*)'/);
  const methodMatch = block.match(/method:\s*'([^']*)'/);
  const pathMatch = block.match(/path:\s*'([^']*)'/);
  const hasRequestBody = block.includes('requestBody:');
  const hasQueryParams = block.includes('queryParams:');
  
  if (idMatch) {
    const id = idMatch[1];
    const method = methodMatch ? methodMatch[1] : 'Unknown';
    const path = pathMatch ? pathMatch[1] : 'Unknown';
    
    console.log(`${index + 1}. ${id}`);
    console.log(`   Method: ${method}`);
    console.log(`   Path: ${path}`);
    console.log(`   Has Request Body: ${hasRequestBody ? '✅ YES' : '❌ NO'}`);
    console.log(`   Has Query Params: ${hasQueryParams ? '✅ YES' : '❌ NO'}`);
    
    if (method === 'POST' && !hasRequestBody) {
      console.log(`   ⚠️  WARNING: POST endpoint without request body!`);
    }
    
    if (method === 'GET' && hasRequestBody) {
      console.log(`   ⚠️  WARNING: GET endpoint with request body (should use query params)!`);
    }
    
    console.log('');
  }
});

// Summary
const totalEndpoints = endpointBlocks?.length || 0;
const postEndpoints = endpointBlocks?.filter(block => block.includes("method: 'POST'")).length || 0;
const getEndpoints = endpointBlocks?.filter(block => block.includes("method: 'GET'")).length || 0;
const endpointsWithBody = endpointBlocks?.filter(block => block.includes('requestBody:')).length || 0;
const endpointsWithQueryParams = endpointBlocks?.filter(block => block.includes('queryParams:')).length || 0;

console.log('📊 Summary');
console.log('==========');
console.log(`Total Endpoints: ${totalEndpoints}`);
console.log(`POST Endpoints: ${postEndpoints}`);
console.log(`GET Endpoints: ${getEndpoints}`);
console.log(`Endpoints with Request Body: ${endpointsWithBody}`);
console.log(`Endpoints with Query Params: ${endpointsWithQueryParams}`);

// Check for issues
console.log('\n🔍 Issues Found:');
console.log('================');

let issues = 0;

endpointBlocks?.forEach((block) => {
  const methodMatch = block.match(/method:\s*'([^']*)'/);
  const hasRequestBody = block.includes('requestBody:');
  const hasQueryParams = block.includes('queryParams:');
  
  if (methodMatch) {
    const method = methodMatch[1];
    
    if (method === 'POST' && !hasRequestBody) {
      console.log(`❌ POST endpoint missing request body`);
      issues++;
    }
    
    if (method === 'GET' && hasRequestBody) {
      console.log(`❌ GET endpoint has request body (should use query params)`);
      issues++;
    }
  }
});

if (issues === 0) {
  console.log('✅ No issues found! All endpoints are properly configured.');
} else {
  console.log(`\n⚠️  Found ${issues} configuration issue(s) that need to be fixed.`);
} 