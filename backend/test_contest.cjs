const axios = require('axios');

async function run() {
  try {
    // register
    const uid = Math.random().toString(36).substring(7);
    const regRes = await axios.post('http://127.0.0.1:5000/api/auth/register', {
      username: `testuser_${uid}`,
      email: `testuser_${uid}@test.com`,
      password: 'Password123!',
      displayName: `Test User ${uid}`
    });
    const cookie = regRes.headers['set-cookie'];
    if (!cookie) {
        console.log("No cookie returned");
    }

    // create room
    const roomRes = await axios.post('http://127.0.0.1:5000/api/rooms', { mode: 'contest' }, {
      headers: { Cookie: cookie ? cookie[0] : '' }
    });
    const roomId = roomRes.data._id;
    console.log("Room Created:", roomId);

    // create contest
    const contestRes = await axios.post('http://127.0.0.1:5000/api/contests', { roomId, duration: 60 }, {
      headers: { Cookie: cookie ? cookie[0] : '' }
    });
    console.log("Contest Created:", contestRes.data._id);
  } catch (err) {
    console.error("ERROR 500 Response Data:", JSON.stringify(err.response?.data, null, 2));
  }
}

run();
