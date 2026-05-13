import http from 'http';
import { Server } from 'socket.io';
import mongoose from 'mongoose';
import { config } from './config/index.js';
import app from './app.js';
import { attachSocketHandlers } from './socket/index.js';
import { seedIfEmpty } from './scripts/seedProblems.js';
import { logEmailStatus } from './services/emailService.js';

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: config.clientUrl, credentials: true },
  pingTimeout: 60000,
  pingInterval: 25000,
});

attachSocketHandlers(io);
app.set('io', io);

async function start() {
  try {
    await mongoose.connect(config.mongoUri, { serverSelectionTimeoutMS: 10000 });
    const safeUri = config.mongoUri.replace(/:[^:@]+@/, ':****@');
    console.log(`✓ MongoDB connected: ${safeUri}`);
  } catch (err) {
    console.error('✗ MongoDB connection failed:', err.message);
    process.exit(1);
  }

  const seeded = await seedIfEmpty();
  if (seeded) console.log('✓ Database seeded with problems');

  logEmailStatus();

  console.log('✓ Judge0 CE: https://ce.judge0.com (free, no API key)');

  server.listen(config.port, () => {
    console.log(`\n🚀 Server running on port ${config.port}`);
    console.log(`   Frontend: ${config.clientUrl}`);
    console.log(`   Health:   http://localhost:${config.port}/health\n`);
  });
}

start().catch((err) => {
  console.error('Fatal startup error:', err);
  process.exit(1);
});
