import { prob } from '../starterFactory.js';
export const greedyProblems = [
prob('Assign Cookies','assign-cookies','greedy','easy','Maximize satisfied children. Child i needs cookies of size ≥ greed[i].','Line 1: n. Line 2: n greed values. Line 3: m. Line 4: m cookie sizes.','Single integer — max satisfied.','1≤n,m≤3×10^4','assignCookies','a:arr,b:arr->int',['Greedy','Sorting'],
[['3\n1 2 3\n2\n1 1','1'],['2\n1 2\n3\n1 2 3','2'],['1\n10\n1\n5','0'],['3\n1 1 1\n3\n1 1 1','3',1],['2\n2 3\n3\n1 2 4','2',1]]),
prob('Best Stock Trade','best-stock-trade','greedy','easy','Find the maximum profit from a single buy-sell transaction.','Line 1: n. Line 2: n prices.','Single integer — max profit (0 if impossible).','1≤n≤10^5','maxProfit','arr:arr->int',['Greedy','Array'],
[['6\n7 1 5 3 6 4','5'],['5\n7 6 4 3 1','0'],['3\n1 2 3','2'],['4\n2 4 1 3','2',1],['2\n1 2','1',1]]),
prob('Jump Game Reach','jump-game','greedy','medium','Determine if you can reach the last index starting from index 0.','Line 1: n. Line 2: n non-negative integers (max jumps).','true or false.','1≤n≤10^4','canJump','arr:arr->bool',['Greedy','Array'],
[['5\n2 3 1 1 4','true'],['5\n3 2 1 0 4','false'],['1\n0','true'],['3\n1 1 1','true',1],['4\n0 0 0 0','false',1]]),
prob('Meeting Room Schedule','meeting-rooms','greedy','medium','Find the minimum number of meeting rooms required for all meetings.','Line 1: n meetings. Then n lines of start end.','Single integer.','1≤n≤10^4','minRooms','matrix:matrix->int',['Greedy','Sorting','Heap'],
[['3\n0 30\n5 10\n15 20','2'],['2\n7 10\n2 4','1'],['3\n0 10\n0 10\n0 10','3'],['4\n1 5\n2 6\n3 7\n4 8','4',1],['3\n0 1\n1 2\n2 3','1',1]]),
prob('Maximum Activities','max-activities','greedy','hard','Select maximum number of non-overlapping activities from given start and end times.','Line 1: n. Then n lines of start end.','Single integer — max activities.','1≤n≤10^5','maxActivities','matrix:matrix->int',['Greedy','Sorting'],
[['6\n1 2\n3 4\n0 6\n5 7\n8 9\n5 9','4'],['3\n1 3\n2 4\n3 5','2'],['1\n0 1','1'],['4\n0 1\n1 2\n2 3\n3 4','4',1],['3\n0 10\n0 10\n0 10','1',1]]),
];
