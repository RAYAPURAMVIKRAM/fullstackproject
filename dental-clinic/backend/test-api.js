/**
 * Automated Verification Script for Dental Clinic Backend API
 * Validates routes, validations, conflict checks, and authentication logic.
 */

const http = require('http');
const jwt = require('jsonwebtoken');

const PORT = 5000;

function makeRequest(options, postData = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          resolve({ status: res.statusCode, headers: res.headers, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, headers: res.headers, raw: body });
        }
      });
    });

    req.on('error', (err) => reject(err));

    if (postData) {
      req.write(typeof postData === 'string' ? postData : JSON.stringify(postData));
    }
    req.end();
  });
}

async function runTests() {
  console.log('🚀 Running automated backend API verification tests...\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${message}`);
      failed++;
    }
  }

  try {
    // 1. Test Health Endpoint
    const health = await makeRequest({
      hostname: 'localhost',
      port: PORT,
      path: '/api/health',
      method: 'GET',
    });
    assert(health.status === 200 && health.data.status === 'ok', 'Health check returns status: ok');

    // 2. Test Validation - Missing Patient Name
    const missingName = await makeRequest(
      {
        hostname: 'localhost',
        port: PORT,
        path: '/api/appointments',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      },
      {
        phone: '9876543210',
        email: 'test@example.com',
        appointmentDate: '2026-10-15',
        appointmentTime: '10:30',
        service: 'Dental Checkup',
      }
    );
    assert(missingName.status === 400 && missingName.data.success === false, 'Rejects appointment without patient name (400)');

    // 3. Test Validation - Invalid Email
    const invalidEmail = await makeRequest(
      {
        hostname: 'localhost',
        port: PORT,
        path: '/api/appointments',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      },
      {
        patientName: 'Rahul Kumar',
        phone: '9876543210',
        email: 'invalid-email-format',
        appointmentDate: '2026-10-15',
        appointmentTime: '10:30',
        service: 'Dental Checkup',
      }
    );
    assert(invalidEmail.status === 400 && invalidEmail.data.message.includes('valid email'), 'Rejects appointment with invalid email format (400)');

    // 4. Test Validation - Invalid Phone Number
    const invalidPhone = await makeRequest(
      {
        hostname: 'localhost',
        port: PORT,
        path: '/api/appointments',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      },
      {
        patientName: 'Rahul Kumar',
        phone: '123',
        email: 'test@example.com',
        appointmentDate: '2026-10-15',
        appointmentTime: '10:30',
        service: 'Dental Checkup',
      }
    );
    assert(invalidPhone.status === 400 && invalidPhone.data.message.includes('phone number'), 'Rejects appointment with invalid phone number (400)');

    // 5. Test Validation - Past Date
    const pastDate = await makeRequest(
      {
        hostname: 'localhost',
        port: PORT,
        path: '/api/appointments',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      },
      {
        patientName: 'Rahul Kumar',
        phone: '9876543210',
        email: 'test@example.com',
        appointmentDate: '2020-01-01',
        appointmentTime: '10:30',
        service: 'Dental Checkup',
      }
    );
    assert(pastDate.status === 400 && pastDate.data.message.includes('past'), 'Rejects appointment with past date (400)');

    // 6. Test Admin Auth Protection - Unauthorized Access
    const unauthorized = await makeRequest({
      hostname: 'localhost',
      port: PORT,
      path: '/api/appointments',
      method: 'GET',
    });
    assert(unauthorized.status === 401 && unauthorized.data.success === false, 'Rejects unauthenticated GET /api/appointments (401)');

    // 7. Test Admin Auth Protection - Invalid Token
    const invalidToken = await makeRequest({
      hostname: 'localhost',
      port: PORT,
      path: '/api/appointments',
      method: 'GET',
      headers: { Authorization: 'Bearer bad_token_12345' },
    });
    assert(invalidToken.status === 401, 'Rejects invalid bearer token (401)');

    // 8. Test Admin Login Validation - Missing Password
    const missingPassword = await makeRequest(
      {
        hostname: 'localhost',
        port: PORT,
        path: '/api/auth/login',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      },
      { email: 'admin@dentalclinic.com' }
    );
    assert(missingPassword.status === 400 && missingPassword.data.message.includes('Password is required'), 'Rejects admin login without password (400)');

    console.log(`\n📊 Test Summary: ${passed} passed, ${failed} failed.\n`);
    process.exit(failed === 0 ? 0 : 1);
  } catch (err) {
    console.error('❌ Test execution error:', err.message);
    process.exit(1);
  }
}

runTests();
