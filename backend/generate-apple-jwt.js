const fs = require('fs');
const jwt = require('jsonwebtoken');

// Replace these with your actual values
const teamId = '835XP67ADP';
const clientId = 'com.coffee.grab'; // Your Bundle ID
const keyId = '6KX46NA52H';
const privateKey = fs.readFileSync('../../applepay-certs/AuthKey_6KX46NA52H.p8').toString();

const now = Math.floor(Date.now() / 1000);
const payload = {
  iss: teamId,
  iat: now,
  exp: now + 60 * 60 * 6, // 6 hours
  aud: 'https://appleid.apple.com',
  sub: clientId,
};

const token = jwt.sign(payload, privateKey, {
  algorithm: 'ES256',
  keyid: keyId,
});

console.log('JWT:', token);