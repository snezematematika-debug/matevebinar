
import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import remarkGfm from 'remark-gfm';
import rehypeKatex from 'rehype-katex';
import rehypeRaw from 'rehype-raw';

interface FormattedTextProps {
  text: string;
  className?: string;
  theme?: 'light' | 'dark'; // 'light' is default, 'dark' for chalkboard
}

const FormattedText: React.FC<FormattedTextProps> = ({ text, className = "", theme = 'light' }) => {
  if (!text) return null;

  // Theme based classes
  const colors = theme === 'light' ? {
      h1: "text-3xl font-bold mt-6 mb-4 border-b pb-2 text-indigo-900 border-indigo-100",
      h2: "text-2xl font-bold mt-6 mb-3 text-slate-800",
      h3: "text-xl font-bold mt-5 mb-2 block text-slate-800",
      p: "text-lg mb-3 leading-relaxed text-slate-700",
      list: "pl-6 mb-4 space-y-1 block text-slate-700",
      blockquote: "border-l-4 pl-4 italic my-4 py-2 rounded-r border-indigo-200 text-slate-600 bg-slate-50",
      hr: "my-6 border-dashed border-slate-300",
      tableHeader: "bg-slate-50 text-slate-700 border-slate-200",
      tableCell: "text-slate-600",
      strong: "font-bold text-slate-900"
  } : {
      // Dark Mode (Chalkboard) - MAX VISIBILITY FOR PROJECTORS
      h1: "text-5xl md:text-6xl font-bold mt-10 mb-8 border-b-4 pb-4 text-white border-white/20 text-center tracking-wide",
      h2: "text-4xl md:text-5xl font-bold mt-10 mb-6 text-yellow-200 underline decoration-white/20 underline-offset-8",
      h3: "text-3xl md:text-4xl font-bold mt-8 mb-4 block text-yellow-100",
      p: "text-3xl md:text-4xl mb-6 leading-relaxed text-white/95 font-medium tracking-wide",
      list: "pl-10 mb-8 space-y-3 block text-white/95 text-3xl md:text-4xl",
      blockquote: "border-l-8 pl-8 italic my-8 py-6 rounded-r border-yellow-400 text-yellow-100 bg-white/5 text-3xl md:text-4xl",
      hr: "my-10 border-dashed border-white/30 border-t-4",
      tableHeader: "bg-white/10 text-yellow-200 border-white/30 text-3xl md:text-4xl p-4",
      tableCell: "text-white/95 text-3xl md:text-4xl border-white/20 p-4",
      strong: "font-bold text-yellow-300"
  };

  return (
    <div className={`formatted-text ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkMath, remarkGfm]}
        rehypePlugins={[rehypeKatex, rehypeRaw]}
        components={{
          h1: ({node, ...props}) => <h1 className={colors.h1} {...props} />,
          h2: ({node, ...props}) => <h2 className={colors.h2} {...props} />,
          h3: ({node, ...props}) => <h3 className={colors.h3} {...props} />,
          
          p: ({node, children, ...props}) => {
             return <p className={colors.p} {...props}>{children}</p>;
          },
          
          ul: ({node, ...props}) => <ul className={`list-disc ${colors.list}`} {...props} />,
          ol: ({node, ...props}) => <ol className={`list-decimal ${colors.list}`} {...props} />,
          li: ({node, ...props}) => <li className="pl-2 mb-2" {...props} />,
          blockquote: ({node, ...props}) => <blockquote className={colors.blockquote} {...props} />,
          hr: ({node, ...props}) => <hr className={colors.hr} {...props} />,
          
          // Table Styling
          table: ({node, ...props}) => (
            <div className={`overflow-x-auto my-6 rounded-lg shadow-sm border ${theme === 'dark' ? 'border-white/30' : 'border-slate-200'}`}>
                <table className={`w-full border-collapse ${theme === 'dark' ? 'bg-transparent' : 'bg-white'}`} {...props} />
            </div>
          ),
          thead: ({node, ...props}) => <thead className={`border-b-2 ${colors.tableHeader}`} {...props} />,
          tbody: ({node, ...props}) => <tbody className={`divide-y ${theme === 'dark' ? 'divide-white/20' : 'divide-slate-100'}`} {...props} />,
          tr: ({node, ...props}) => <tr className={`transition-colors ${theme === 'dark' ? 'hover:bg-white/10' : 'hover:bg-slate-50'}`} {...props} />,
          th: ({node, ...props}) => <th className={`px-6 py-4 text-left font-bold uppercase tracking-wider ${colors.tableHeader}`} {...props} />,
          td: ({node, ...props}) => <td className={`px-6 py-4 align-top ${colors.tableCell}`} {...props} />,
          strong: ({node, ...props}) => <strong className={colors.strong} {...props} />,
          
          div: ({node, className, ...props}: any) => {
             return <div className={className} {...props} />;
          }
        }}
      >
        {text}
      </ReactMarkdown>
    </div>
  );
};

export default FormattedText;
