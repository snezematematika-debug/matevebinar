
import React, { useState, useEffect } from 'react';
import { PROJECT_THEMES, PROJECT_TOPICS } from '../projectTopics';
import { generateProject } from '../services/geminiService';
import { CurriculumTopic } from '../types';
import Loading from './Loading';
import FormattedText from './FormattedText';
import { parse } from 'marked';

const ProjectGenerator: React.FC = () => {
  const [selectedThemeId, setSelectedThemeId] = useState<string>(PROJECT_THEMES[0].id);
  const [selectedTopicId, setSelectedTopicId] = useState<string>("");
  
  const [projectContent, setProjectContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Custom fields for the print view
  const [teacherName, setTeacherName] = useState('');
  const [schoolName, setSchoolName] = useState('');

  const availableTopics = PROJECT_TOPICS.filter(topic => topic.themeId === selectedThemeId);
  const currentTopic: CurriculumTopic | undefined = PROJECT_TOPICS.find(t => t.id === selectedTopicId);

  // Set default topic when theme changes
  useEffect(() => {
    if (availableTopics.length > 0) {
      setSelectedTopicId(availableTopics[0].id);
    } else {
      setSelectedTopicId("");
    }
  }, [selectedThemeId]);

  // Reset content when topic changes
  useEffect(() => {
    setProjectContent(null);
    setError(null);
  }, [selectedTopicId]);

  const handleAiGenerate = async () => {
    if (!currentTopic) return;
    setLoading(true);
    setError(null);
    try {
      const content = await generateProject(currentTopic.name);
      setProjectContent(content);
    } catch (err: any) {
      setError(err.message || "Неуспешно генерирање на проект.");
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadMd = () => {
    if (!projectContent) return;

    const blob = new Blob([projectContent], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Project_${currentTopic?.name.replace(/\s+/g, '_')}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDownloadWord = () => {
    if (!projectContent) return;
    
    const htmlContent = parse(projectContent);
    const themeTitle = PROJECT_THEMES.find(t => t.id === selectedThemeId)?.title;

    const fullHtml = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <meta charset='utf-8'>
        <title>Проектна Задача</title>
        <style>
          body { font-family: 'Calibri', 'Arial', sans-serif; font-size: 11pt; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
          td, th { border: 1px solid black; padding: 8px; vertical-align: top; }
          .header-cell { background-color: #f3f4f6; font-weight: bold; width: 30%; }
          h1 { font-size: 16pt; color: #E67E22; border-bottom: 2px solid #ccc; padding-bottom: 5px; text-transform: uppercase; text-align: center; }
          h2 { font-size: 14pt; color: #D35400; margin-top: 15px; }
          p { margin-bottom: 10px; }
        </style>
      </head>
      <body>
        <p style="text-align: right; font-size: 9pt; color: #666; border-bottom: 1px solid #ccc;">Мате-Ментор - Платформа за дигитално образование</p>
        
        <!-- Header Table -->
        <table>
          <tr>
            <td class="header-cell">Предмет:</td>
            <td>Математика за VII одделение</td>
          </tr>
          <tr>
            <td class="header-cell">Категорија:</td>
            <td style="text-transform: uppercase; font-weight: bold;">${themeTitle}</td>
          </tr>
          <tr>
            <td class="header-cell">Проектна тема:</td>
            <td style="font-weight: bold;">${currentTopic?.name}</td>
          </tr>
          <tr>
            <td class="header-cell">Ментор:</td>
            <td>${teacherName || '__________________'}</td>
          </tr>
          <tr>
            <td class="header-cell">ООУ:</td>
            <td>${schoolName || '__________________'}</td>
          </tr>
        </table>

        <h1>Проектна Задача</h1>
        
        <!-- Content -->
        <div>
            ${htmlContent}
        </div>

        <!-- Footer -->
        <br/><br/>
        <table style="border: none;">
            <tr style="border: none;">
                <td style="border: none; border-top: 1px solid black; padding-top: 10px;">Датум на предавање: ________________</td>
                <td style="border: none; border-top: 1px solid black; padding-top: 10px; text-align: right;">Оценка: ________________</td>
            </tr>
        </table>
      </body>
      </html>
    `;

    const blob = new Blob([fullHtml], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Project_${currentTopic?.name.replace(/\s+/g, '_')}.doc`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 animate-fade-in">
       {/* Force Portrait specifically for this component */}
       <style>{`
        @media print {
            @page {
                size: portrait;
            }
        }
      `}</style>

      {/* Input Section - Hidden on Print */}
      <div className="print:hidden">
        <div className="border-b pb-4 mb-6">
            <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                🚀 Проектни задачи (STEAM)
                <span className="text-sm font-normal text-indigo-600 bg-indigo-50 px-2 py-1 rounded-full">VII Одд.</span>
            </h2>
            <p className="text-slate-500 mt-1">Генерирајте креативни истражувачки проекти поврзани со реалниот живот.</p>
        </div>

        {/* Teacher Instruction */}
        <div className="bg-orange-50 border-l-4 border-orange-500 p-4 mb-6 rounded-r-lg shadow-sm">
            <div className="flex items-start gap-3">
                <span className="text-2xl">💡</span>
                <div>
                    <p className="text-orange-900 text-sm font-medium">
                        Учење преку истражување!
                    </p>
                    <p className="text-orange-800 text-sm mt-1">
                        Поттикнете ја креативноста кај учениците со <strong>STEAM проекти</strong>. Овие активности ја поврзуваат математиката со уметноста, инженерството и реалните проблеми, правејќи ја наставата забавна и применлива.
                    </p>
                </div>
            </div>
        </div>

        <div className="flex flex-col gap-4 bg-slate-50 p-6 rounded-xl border border-slate-100">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Theme Selector */}
                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">1. Избери STEAM Категорија</label>
                    <select 
                        value={selectedThemeId}
                        onChange={(e) => setSelectedThemeId(e.target.value)}
                        className="w-full p-3 border-2 border-indigo-300 rounded-lg focus:ring-4 focus:ring-indigo-100 focus:border-indigo-600 focus:outline-none bg-white font-bold text-slate-700 transition-all shadow-sm"
                    >
                        {PROJECT_THEMES.map(theme => (
                        <option key={theme.id} value={theme.id}>{theme.title}</option>
                        ))}
                    </select>
                </div>

                {/* Topic Selector */}
                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">2. Избери Проектна Тема</label>
                    <select 
                        value={selectedTopicId}
                        onChange={(e) => setSelectedTopicId(e.target.value)}
                        className="w-full p-3 border-2 border-indigo-300 rounded-lg focus:ring-4 focus:ring-indigo-100 focus:border-indigo-600 focus:outline-none bg-white font-bold text-slate-700 transition-all shadow-sm"
                        disabled={availableTopics.length === 0}
                    >
                        {availableTopics.map(topic => (
                        <option key={topic.id} value={topic.id}>{topic.name}</option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="flex flex-col gap-4 border-t border-slate-200 pt-4 mt-2">
                 <p className="text-sm font-bold text-slate-500">Податоци за наставникот (за печатење):</p>
                 <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">Изготвил (Име)</label>
                        <input 
                            type="text" 
                            value={teacherName} 
                            onChange={(e) => setTeacherName(e.target.value)}
                            placeholder="Вашето име"
                            className="w-full p-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-indigo-500 focus:outline-none bg-white text-sm"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">ООУ</label>
                        <input 
                            type="text" 
                            value={schoolName} 
                            onChange={(e) => setSchoolName(e.target.value)}
                            placeholder="Име на училиштето"
                            className="w-full p-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-indigo-500 focus:outline-none bg-white text-sm"
                        />
                    </div>
                 </div>
            </div>
            
            <div className="mt-4 flex justify-end">
                <button
                    onClick={handleAiGenerate}
                    disabled={loading || !selectedTopicId}
                    className={`
                        w-full md:w-auto px-6 py-2.5 rounded-lg transition-all font-bold shadow-sm flex items-center justify-center gap-2
                        ${projectContent 
                            ? 'bg-white border-2 border-indigo-600 text-indigo-700 hover:border-indigo-300 hover:bg-indigo-50' // Strong Blue Outline
                            : 'bg-indigo-600 text-white hover:bg-indigo-700' // Solid
                        }
                    `}
                >
                    {loading ? 'Се креира...' : (projectContent ? '🔄 Регенерирај Проект' : '🚀 Генерирај Проект')}
                </button>
            </div>
        </div>

        {error && (
            <div className="p-4 bg-red-50 text-red-700 rounded-lg border border-red-200 mt-4">
            <strong>Грешка:</strong> {error}
            </div>
        )}

        {loading && <Loading message="Се креира проектна задача..." />}
      </div>

      {projectContent && !loading && (
        <div className="mt-8 space-y-6 animate-slide-up print:mt-0">
          
          {/* Action Buttons - Hidden on Print */}
           {/* PROFESSIONAL TOOLBAR STYLE */}
           <div className="print:hidden flex flex-wrap justify-end gap-3 items-center bg-slate-50 p-3 rounded-xl border border-slate-200">
             <div className="text-sm text-slate-500 mr-auto pl-2 font-medium hidden sm:block">
                Достапни формати:
             </div>
             
             {/* Word/MD Group with Thicker Blue Border */}
             <div className="flex rounded-lg shadow-sm bg-white border-2 border-indigo-600 divide-x-2 divide-indigo-600 overflow-hidden">
                <button 
                    onClick={handleDownloadMd}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-indigo-700 hover:bg-indigo-50 transition-colors"
                    title="Преземи Markdown формат"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Markdown
                </button>
                <button 
                    onClick={handleDownloadWord}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-indigo-700 hover:bg-indigo-50 transition-colors"
                    title="Преземи Microsoft Word формат"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Word Doc
                </button>
             </div>
             
             <button 
                onClick={handlePrint}
                className="flex items-center gap-2 px-5 py-2 bg-slate-900 text-white text-sm font-bold rounded-lg shadow-md hover:bg-slate-800 hover:shadow-lg transition-all transform hover:-translate-y-0.5"
             >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                Печати PDF
             </button>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm print:border-none print:shadow-none print:p-0">
            {/* PRINT HEADER TABLE - Visible ONLY on print */}
            <div className="hidden print:block mb-6 text-black">
                 <div className="text-right text-xs text-slate-500 mb-2 border-b pb-1">Мате-Ментор - Платформа за дигитално образование</div>
                 <table className="w-full border-collapse border border-black mb-6 text-sm">
                    <tbody>
                        <tr>
                            <td className="border border-black p-2 font-bold bg-slate-100 w-1/3">Предмет:</td>
                            <td className="border border-black p-2 w-2/3">Математика за VII одделение</td>
                        </tr>
                        <tr>
                            <td className="border border-black p-2 font-bold bg-slate-100">Категорија:</td>
                            <td className="border border-black p-2 uppercase font-bold">{PROJECT_THEMES.find(t => t.id === selectedThemeId)?.title}</td>
                        </tr>
                        <tr>
                            <td className="border border-black p-2 font-bold bg-slate-100">Проектна тема:</td>
                            <td className="border border-black p-2 font-bold">{currentTopic?.name}</td>
                        </tr>
                        <tr>
                            <td className="border border-black p-2 font-bold bg-slate-100">Ментор:</td>
                            <td className="border border-black p-2">{teacherName || '__________________'}</td>
                        </tr>
                        <tr>
                            <td className="border border-black p-2 font-bold bg-slate-100">ООУ:</td>
                            <td className="border border-black p-2">{schoolName || '__________________'}</td>
                        </tr>
                    </tbody>
                </table>
                <h1 className="text-2xl font-bold text-center mb-6 uppercase border-b-2 border-black pb-2">Проектна Задача</h1>
            </div>

            {/* CONTENT */}
            <div className="p-8 text-slate-700 leading-relaxed print:p-0 print:text-black">
              <FormattedText text={projectContent} />
            </div>

            {/* PRINT FOOTER */}
            <div className="mt-8 pt-4 border-t border-black hidden print:block text-black">
                <div className="flex justify-between text-xs">
                    <p>Датум на предавање: ________________</p>
                    <p>Оценка: ________________</p>
                </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectGenerator;
