/**
 * starterFactory.js — Generates starter code templates for JS, Python, C++
 *
 * Pattern format: "argName:type,argName:type->returnType"
 * Input types:  arr, int, str, matrix
 * Return types: int, str, arr, bool
 *
 * Example: "nums:arr,target:int->arr"
 */

const INPUT_PARSERS = {
  arr: {
    js: (name, idx) => [
      `  const n_${name} = Number(lines[${idx}]);`,
      `  const ${name} = lines[${idx + 1}].split(' ').map(Number);`,
    ],
    py: (name, idx) => [
      `n_${name} = int(lines[${idx}])`,
      `${name} = list(map(int, lines[${idx + 1}].split()))`,
    ],
    cpp: (name) => [
      `  int n_${name}; cin >> n_${name};`,
      `  vector<int> ${name}(n_${name});`,
      `  for(int i=0;i<n_${name};i++) cin >> ${name}[i];`,
    ],
    lines: 2,
  },
  int: {
    js: (name, idx) => [`  const ${name} = Number(lines[${idx}]);`],
    py: (name, idx) => [`${name} = int(lines[${idx}])`],
    cpp: (name) => [`  int ${name}; cin >> ${name};`],
    lines: 1,
  },
  str: {
    js: (name, idx) => [`  const ${name} = lines[${idx}];`],
    py: (name, idx) => [`${name} = lines[${idx}]`],
    cpp: (name) => [`  string ${name}; getline(cin, ${name});`],
    lines: 1,
  },
  matrix: {
    js: (name, idx) => [
      `  const rows_${name} = Number(lines[${idx}]);`,
      `  const ${name} = [];`,
      `  for(let i=0;i<rows_${name};i++) ${name}.push(lines[${idx + 1}+i].split(' ').map(Number));`,
    ],
    py: (name, idx) => [
      `rows_${name} = int(lines[${idx}])`,
      `${name} = [list(map(int, lines[${idx + 1}+i].split())) for i in range(rows_${name})]`,
    ],
    cpp: (name) => [
      `  int rows_${name}, cols_${name}; cin >> rows_${name} >> cols_${name};`,
      `  vector<vector<int>> ${name}(rows_${name}, vector<int>(cols_${name}));`,
      `  for(int i=0;i<rows_${name};i++) for(int j=0;j<cols_${name};j++) cin >> ${name}[i][j];`,
    ],
    lines: -1, // dynamic
  },
};

const OUTPUT_FORMATTERS = {
  int:  { js: 'console.log(result)', py: 'print(result)', cpp: 'cout << result << endl;' },
  str:  { js: 'console.log(result)', py: 'print(result)', cpp: 'cout << result << endl;' },
  arr:  { js: "console.log(result.join(' '))", py: "print(' '.join(map(str, result)))", cpp: 'for(int i=0;i<(int)result.size();i++){if(i)cout<<" ";cout<<result[i];}cout<<endl;' },
  bool: { js: "console.log(result ? 'true' : 'false')", py: "print('true' if result else 'false')", cpp: 'cout << (result ? "true" : "false") << endl;' },
};

const CPP_RETURN_TYPES = { int: 'int', str: 'string', arr: 'vector<int>', bool: 'bool' };

export function makeStarter(pattern, funcName) {
  const [inPart, outType] = pattern.split('->');
  const outFmt = OUTPUT_FORMATTERS[outType] || OUTPUT_FORMATTERS.int;
  const cppRet = CPP_RETURN_TYPES[outType] || 'int';
  
  const inputs = inPart.split(',').map(p => {
    const [name, type] = p.split(':');
    return { name, type };
  });

  const argNames = inputs.map(i => i.name).join(', ');

  // 1. STARTER (What user sees)
  const starter = {
    javascript: `function ${funcName}(${argNames}) {\n  // WRITE YOUR CODE HERE\n}`,
    python: `def ${funcName}(${argNames}):\n    # WRITE YOUR CODE HERE\n    pass`,
    cpp: `class Solution {\npublic:\n    ${cppRet} ${funcName}(${inPart.split(',').map(p => {
      const [name, type] = p.split(':');
      const t = type === 'arr' ? 'vector<int>&' : type === 'matrix' ? 'vector<vector<int>>&' : type === 'str' ? 'string' : 'int';
      return `${t} ${name}`;
    }).join(', ')}) {\n        // WRITE YOUR CODE HERE\n    }\n};`,
  };

  // 2. DRIVER (Hidden)
  let jsIdx = 0;
  const jsParseLines = [];
  const pyParseLines = [];
  const cppParseLines = [];

  for (const inp of inputs) {
    const parser = INPUT_PARSERS[inp.type];
    if (!parser) continue;
    jsParseLines.push(...parser.js(inp.name, jsIdx));
    pyParseLines.push(...parser.py(inp.name, jsIdx));
    cppParseLines.push(...parser.cpp(inp.name));
    jsIdx += parser.lines > 0 ? parser.lines : 2;
  }

  const driver = {
    javascript: `
const fs = require('fs');
const lines = fs.readFileSync(0, 'utf8').split(/\\r?\\n/).filter(l => l.trim() !== '');
${jsParseLines.join('\n')}
// USER_CODE_HERE
const result = ${funcName}(${argNames});
${outFmt.js};
`.trim(),
    python: `
import sys, json
lines = [l.strip() for l in sys.stdin.readlines() if l.strip()]
${pyParseLines.join('\n')}
# USER_CODE_HERE
result = ${funcName}(${argNames})
${outFmt.py}
`.trim(),
    cpp: `
#include <bits/stdc++.h>
using namespace std;
// USER_CODE_HERE
int main() {
${cppParseLines.join('\n')}
  Solution sol;
  ${cppRet} result = sol.${funcName}(${argNames});
  ${outFmt.cpp}
  return 0;
}
`.trim(),
  };

  return { starter, driver };
}

/**
 * Shorthand problem builder.
 */
export function prob(title, slug, category, difficulty, description, inputFmt, outputFmt, constraints, funcName, pattern, tags, testCases) {
  const { starter, driver } = makeStarter(pattern, funcName);
  return {
    title, slug, category, difficulty, description,
    inputFormat: inputFmt,
    outputFormat: outputFmt,
    constraints,
    functionName: funcName,
    tags: tags || [],
    starterCode: starter,
    driverCode: driver,
    testCases: testCases.map(tc => ({
      input: tc[0] || '0',
      expectedOutput: tc[1] ?? '',
      hidden: !!tc[2],
    })),
    examples: testCases.filter(tc => !tc[2] && tc[1] && tc[1].length > 0).slice(0, 2).map(tc => ({
      input: tc[0] || '-',
      output: tc[1] || '-',
      explanation: '',
    })),
  };
}
