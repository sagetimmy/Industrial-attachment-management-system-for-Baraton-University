require('dotenv').config();
const axios = require('axios');

const baseURL = (process.env.API_BASE_URL || 'http://127.0.0.1:5000/api').replace(/\/$/, '');
const token = process.env.ADMIN_TOKEN;

const title = process.env.ANNOUNCEMENT_TITLE || `Smoke announcement ${new Date().toISOString()}`;
const body = process.env.ANNOUNCEMENT_BODY || 'Smoke test announcement created by backend/scripts/announcementSmokeTest.js';
const audience = process.env.ANNOUNCEMENT_AUDIENCE || 'ALL';

const fail = (message) => {
  console.error(message);
  process.exit(1);
};

if (!token) {
  fail('Missing ADMIN_TOKEN. Set it to a valid admin access token before running this script.');
}

const client = axios.create({
  baseURL,
  timeout: 15000,
  headers: {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
});

async function main() {
  console.log(`Base URL: ${baseURL}`);
  console.log(`Title: ${title}`);
  console.log(`Audience: ${audience}`);

  const createResponse = await client.post('/announcements', { title, body, audience });
  const created = createResponse.data?.announcement;

  if (!created?.id) {
    fail('Announcement was created, but no announcement id was returned.');
  }

  console.log(`CREATE_STATUS=${createResponse.status}`);
  console.log(`CREATED_ID=${created.id}`);

  const listResponse = await client.get('/announcements');
  const announcements = Array.isArray(listResponse.data?.announcements)
    ? listResponse.data.announcements
    : [];

  const found = announcements.some((announcement) => String(announcement.id) === String(created.id));

  console.log(`LIST_STATUS=${listResponse.status}`);
  console.log(`LIST_COUNT=${announcements.length}`);

  if (!found) {
    fail('The created announcement was not found in the announcements list.');
  }

  console.log('SMOKE_TEST=PASS');
}

main().catch((error) => {
  if (error.response) {
    console.error(`STATUS=${error.response.status}`);
    console.error(JSON.stringify(error.response.data, null, 2));
  } else {
    console.error(error.message);
  }
  process.exit(1);
});