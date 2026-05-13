/**
 * Function-only boilerplate per language. User completes only the solution function.
 * Use readline() for input and console.log() for output (JS). Other languages are for display/consistency.
 */
export function getBoilerplate(language) {
  const lang = (language || 'javascript').toLowerCase();
  const templates = {
    javascript: `// Complete the function below.
function solve() {
  // your logic here
}
`,
    python: `# Complete the function below.
def solve():
    # your logic here
    pass
`,
    cpp: `class Solution {
public:
    void solve() {
        // WRITE YOUR CODE HERE
    }
};
`,
    java: `class Solution {
    public void solve() {
        // WRITE YOUR CODE HERE
    }
}
`,
  };
  return templates[lang] || templates.javascript;
}

export const SUPPORTED_LANGUAGES = [
  { value: 'javascript', label: 'JavaScript' },
  { value: 'python', label: 'Python' },
  { value: 'cpp', label: 'C++' },
  { value: 'java', label: 'Java' },
];

export function getInitialCodeState(problem, existingState = null) {
  const LANGS = ['javascript', 'python', 'cpp', 'java'];
  const newState = existingState ? { ...existingState } : {};
  
  LANGS.forEach(lang => {
    // If empty or matches exactly the old boilerplate, overwrite it with the problem's boilerplate
    if (!newState[lang] || newState[lang] === getBoilerplate(lang)) {
       newState[lang] = problem?.starterCode?.[lang] || getBoilerplate(lang);
    }
  });
  
  return newState;
}
