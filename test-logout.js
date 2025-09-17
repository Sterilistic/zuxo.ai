#!/usr/bin/env node

/**
 * Comprehensive Logout Test Script
 * Tests logout functionality for both extension and dashboard
 */

const fetch = require('node-fetch');

const API_BASE = 'http://localhost:3000';

// Colors for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function testLogout() {
  log('\n🧪 Starting Comprehensive Logout Test', 'bold');
  log('=====================================', 'blue');

  try {
    // Test 1: Check initial session status
    log('\n📋 Test 1: Check Initial Session Status', 'yellow');
    const initialSession = await fetch(`${API_BASE}/api/session/validate`, {
      credentials: 'include'
    });
    const initialData = await initialSession.json();
    log(`Initial session status: ${initialData.authenticated ? 'Authenticated' : 'Not authenticated'}`, 
        initialData.authenticated ? 'green' : 'red');
    
    if (initialData.authenticated) {
      log(`User: ${initialData.user.name} (${initialData.user.email})`, 'blue');
    }

    // Test 2: Test logout endpoint
    log('\n📋 Test 2: Test Logout Endpoint', 'yellow');
    const logoutResponse = await fetch(`${API_BASE}/logout`, {
      method: 'GET',
      credentials: 'include',
      redirect: 'manual' // Don't follow redirects
    });
    
    log(`Logout response status: ${logoutResponse.status}`, 
        logoutResponse.status === 302 ? 'green' : 'red');
    log(`Logout response headers: ${JSON.stringify(Object.fromEntries(logoutResponse.headers.entries()))}`, 'blue');

    // Test 3: Verify session is cleared
    log('\n📋 Test 3: Verify Session is Cleared', 'yellow');
    const postLogoutSession = await fetch(`${API_BASE}/api/session/validate`, {
      credentials: 'include'
    });
    const postLogoutData = await postLogoutSession.json();
    log(`Post-logout session status: ${postLogoutData.authenticated ? 'Still authenticated' : 'Not authenticated'}`, 
        postLogoutData.authenticated ? 'red' : 'green');
    
    if (postLogoutData.authenticated) {
      log('❌ ERROR: Session was not properly cleared!', 'red');
    } else {
      log('✅ SUCCESS: Session was properly cleared!', 'green');
    }

    // Test 4: Test protected endpoint access
    log('\n📋 Test 4: Test Protected Endpoint Access', 'yellow');
    const protectedResponse = await fetch(`${API_BASE}/api/user`, {
      credentials: 'include',
      redirect: 'manual'
    });
    log(`Protected endpoint response status: ${protectedResponse.status}`, 
        protectedResponse.status === 302 ? 'green' : 'red');
    
    if (protectedResponse.status === 302) {
      log('✅ SUCCESS: Protected endpoint properly redirects to login!', 'green');
    } else {
      log('❌ ERROR: Protected endpoint should redirect to login!', 'red');
    }

    // Test 5: Test dashboard access
    log('\n📋 Test 5: Test Dashboard Access', 'yellow');
    const dashboardResponse = await fetch(`${API_BASE}/dashboard`, {
      credentials: 'include',
      redirect: 'manual'
    });
    log(`Dashboard response status: ${dashboardResponse.status}`, 
        dashboardResponse.status === 302 ? 'green' : 'red');
    
    if (dashboardResponse.status === 302) {
      log('✅ SUCCESS: Dashboard properly redirects to login!', 'green');
    } else {
      log('❌ ERROR: Dashboard should redirect to login!', 'red');
    }

    // Summary
    log('\n📊 Test Summary', 'bold');
    log('===============', 'blue');
    
    const testsPassed = [
      !postLogoutData.authenticated,
      protectedResponse.status === 302,
      dashboardResponse.status === 302
    ].filter(Boolean).length;
    
    const totalTests = 3;
    
    log(`Tests passed: ${testsPassed}/${totalTests}`, 
        testsPassed === totalTests ? 'green' : 'red');
    
    if (testsPassed === totalTests) {
      log('\n🎉 All logout tests passed! Logout is working correctly.', 'green');
    } else {
      log('\n❌ Some logout tests failed. Check the implementation.', 'red');
    }

  } catch (error) {
    log(`\n❌ Test failed with error: ${error.message}`, 'red');
    console.error(error);
  }
}

// Run the test
testLogout();
