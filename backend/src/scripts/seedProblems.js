import mongoose from 'mongoose';
import { config } from '../config/index.js';
import { Problem } from '../models/Problem.js';
import { arrayProblems } from './data/arrays.js';
import { stringProblems } from './data/strings.js';
import { linkedListProblems } from './data/linkedlist.js';
import { stackQueueProblems } from './data/stackqueue.js';
import { binarySearchProblems } from './data/binarysearch.js';
import { treeProblems } from './data/trees.js';
import { graphProblems } from './data/graphs.js';
import { dpProblems } from './data/dp.js';
import { backtrackingProblems } from './data/backtracking.js';
import { greedyProblems } from './data/greedy.js';

const ALL_PROBLEMS = [
  ...arrayProblems,
  ...stringProblems,
  ...linkedListProblems,
  ...stackQueueProblems,
  ...binarySearchProblems,
  ...treeProblems,
  ...graphProblems,
  ...dpProblems,
  ...backtrackingProblems,
  ...greedyProblems,
];

export async function seedIfEmpty() {
  const count = await Problem.countDocuments();
  if (count >= ALL_PROBLEMS.length) return false;
  if (count > 0 && !process.argv.includes('--force')) return false;
  if (process.argv.includes('--force')) await Problem.deleteMany({});
  await Problem.insertMany(ALL_PROBLEMS);
  return true;
}

if (process.argv[1]?.replace(/\\/g,'/').endsWith('seedProblems.js')) {
  try {
    await mongoose.connect(config.mongoUri);
    const forced = process.argv.includes('--force');
    if (forced) await Problem.deleteMany({});
    const count = await Problem.countDocuments();
    if (count === 0) {
      await Problem.insertMany(ALL_PROBLEMS);
      console.log(`Seeded ${ALL_PROBLEMS.length} problems.`);
    } else {
      console.log(`${count} problems exist. Use --force to re-seed.`);
    }
    await mongoose.disconnect();
  } catch (e) { console.error(e.message); process.exit(1); }
}
