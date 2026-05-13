import { useCallback, useMemo } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { oneDark } from '@codemirror/theme-one-dark';
import { javascript } from '@codemirror/lang-javascript';
import { python } from '@codemirror/lang-python';
import { cpp } from '@codemirror/lang-cpp';
import { java } from '@codemirror/lang-java';

const langMap = {
  javascript: () => javascript(),
  python: () => python(),
  cpp: () => cpp(),
  java: () => java(),
};

export default function CodeEditor({ value, onChange, language = 'javascript', readOnly = false, height = '400px' }) {
  const langLoader = langMap[language] || langMap.javascript;
  const extensions = useMemo(
    () => [langLoader(), oneDark],
    [language]
  );

  const handleChange = useCallback(
    (v) => {
      onChange?.(v);
    },
    [onChange]
  );

  return (
    <CodeMirror
      value={value}
      height={height}
      theme={oneDark}
      extensions={extensions}
      onChange={handleChange}
      editable={!readOnly}
      basicSetup={{ lineNumbers: true, foldGutter: true }}
      className="rounded-lg overflow-hidden"
    />
  );
}
