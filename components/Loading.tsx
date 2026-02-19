import React from 'react';

const Loading: React.FC<{ message?: string }> = ({ message = "Се генерира..." }) => {
  return (
    <div className="flex flex-col items-center justify-center p-12 space-y-4">
      <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
      <p className="text-indigo-600 font-medium animate-pulse">{message}</p>
    </div>
  );
};

export default Loading;
