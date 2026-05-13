import { api } from './api';

export const executeCode = async ({ source_code, language, stdin = '' }) => {
  try {
    const response = await api.post('/run', {
      code: source_code,
      language,
      stdin
    });
    return response.data || response;
  } catch (error) {
    return {
      success: false,
      message: error.message || 'Error connecting to execution service'
    };
  }
};
