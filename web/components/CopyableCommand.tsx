import React, { useState } from 'react';

interface CopyableCommandProps {
  command: string;
}

const CopyableCommand: React.FC<CopyableCommandProps> = ({ command }) => {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(command);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-gray-800 rounded-lg p-2 mt-2 relative">
      <pre className="text-green-400 font-mono text-sm overflow-x-auto">
        {command}
      </pre>
      <button
        onClick={copyToClipboard}
        className="absolute top-2 right-2 text-gray-400 hover:text-white"
      >
        {copied ? 'Copied!' : 'Copy'}
      </button>
    </div>
  );
};

export default CopyableCommand;