import axios from 'axios';

const LANG_MAP = {
  javascript: 63,
  python: 71,
  cpp: 54,
  java: 62
};

const STATUS_MAP = {
  3: 'Accepted',
  4: 'Wrong Answer',
  5: 'Time Limit Exceeded',
  6: 'Compilation Error',
  7: 'Runtime Error (SIGSEGV)',
  8: 'Runtime Error',
  9: 'Runtime Error (SIGKILL)',
  10: 'Runtime Error (SIGXFSZ)'
};

const toBase64 = (str) => {
  if (!str) return '';
  return Buffer.from(str, 'utf-8').toString('base64');
};

const fromBase64 = (str) => {
  if (!str) return '';
  return Buffer.from(str, 'base64').toString('utf-8');
};

export const executeCode = async (req, res) => {
  try {
    let { source_code, language, stdin = '' } = req.body;

    if (!source_code || !language) {
      return res.status(400).json({ success: false, message: 'source_code and language are required' });
    }

    if (!LANG_MAP[language]) {
      return res.status(400).json({ success: false, message: 'Unsupported language' });
    }

    if (source_code.length > 20000) {
      return res.status(400).json({ success: false, message: 'Source code exceeds maximum length of 20000 characters' });
    }

    if (language === 'java') {
      if (!source_code.includes('class Main')) {
        source_code = `
public class Main {
    public static void main(String[] args) {
        ${source_code}
    }
}
        `.trim();
      }
    }

    const payload = {
      language_id: LANG_MAP[language],
      source_code: toBase64(source_code),
      stdin: toBase64(stdin)
    };

    const response = await axios.post(
      'https://ce.judge0.com/submissions/?base64_encoded=true&wait=true',
      payload,
      {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 10000
      }
    );

    const { stdout, stderr, compile_output, status } = response.data;

    const decodedStdout = fromBase64(stdout);
    const decodedStderr = fromBase64(stderr);
    const decodedCompile = fromBase64(compile_output);

    const statusId = status?.id;
    const readableDescription = STATUS_MAP[statusId] || status?.description || 'Unknown Status';

    return res.json({
      success: true,
      stdout: decodedStdout,
      stderr: decodedStderr,
      compile_output: decodedCompile,
      status: {
        id: statusId,
        description: readableDescription
      }
    });

  } catch (error) {
    let msg = 'Internal server error during execution';
    if (error.response) {
      msg = error.response.data?.message || error.response.data?.error || `Judge0 Error ${error.response.status}`;
    } else if (error.code === 'ECONNABORTED') {
      msg = 'Execution timed out';
    } else {
      msg = error.message;
    }
    return res.status(500).json({ success: false, message: msg });
  }
};
