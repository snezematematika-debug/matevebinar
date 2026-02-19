
import React, { useState, useEffect } from 'react';
import { CURRICULUM, THEMES } from '../constants';
import { generateQuizQuestions } from '../services/geminiService';
import { GradeLevel, QuizQuestion } from '../types';
import Loading from './Loading';
import FormattedText from './FormattedText';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';

interface QuizMakerProps {
  grade: GradeLevel;
}

const QuizMaker: React.FC<QuizMakerProps> = ({ grade }) => {
  const [selectedThemeId, setSelectedThemeId] = useState<string>("");
  const [selectedTopic, setSelectedTopic] = useState<string>("");

  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [rubric, setRubric] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedAnswers, setSelectedAnswers] = useState<number[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filter content
  const filteredThemes = THEMES.filter(t => t.grade === grade);
  const availableTopics = CURRICULUM.filter(topic => topic.themeId === selectedThemeId && topic.grade === grade);

  // Initialize selection
  useEffect(() => {
    if (filteredThemes.length > 0) {
      setSelectedThemeId(filteredThemes[0].id);
    } else {
      setSelectedThemeId("");
    }
    setQuestions([]);
    setRubric(null);
  }, [grade]);

  useEffect(() => {
    if (availableTopics.length > 0) {
      setSelectedTopic(availableTopics[0].name);
    } else {
      setSelectedTopic("");
    }
  }, [selectedThemeId, grade]);

  const handleGenerate = async () => {
    if (!selectedTopic) return;
    setLoading(true);
    setError(null);
    setQuestions([]);
    setRubric(null);
    setShowResults(false);
    setSelectedAnswers([]);
    try {
      const result = await generateQuizQuestions(selectedTopic, grade);
      // Handle the new object structure { questions, rubric }
      setQuestions(result.questions);
      setRubric(result.rubric);
      setSelectedAnswers(new Array(result.questions.length).fill(-1));
    } catch (err: any) {
      setError(err.message || "Неуспешно генерирање на квиз.");
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerSelect = (qIndex: number, optionIndex: number) => {
    if (showResults) return;
    const newAnswers = [...selectedAnswers];
    newAnswers[qIndex] = optionIndex;
    setSelectedAnswers(newAnswers);
  };

  const calculateScore = () => {
    let score = 0;
    questions.forEach((q, idx) => {
      if (selectedAnswers[idx] === q.correctAnswerIndex) score++;
    });
    return score;
  };

  return (
    <div className="space-y-6">
      <div className="border-b pb-4 mb-6 print:hidden">
        <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            📝 Квиз тестови
            <span className="text-sm font-normal text-teal-600 bg-teal-50 px-2 py-1 rounded-full">{grade} Одд.</span>
        </h2>
        <p className="text-slate-500 mt-1">Проверка на знаење за теми од {grade} одделение.</p>
      </div>

      {/* Motivational Instruction for Teachers */}
      <div className="bg-teal-50 border-l-4 border-teal-500 p-4 mb-6 rounded-r-lg shadow-sm print:hidden">
        <div className="flex items-start gap-3">
            <span className="text-2xl">📊</span>
            <div>
                <p className="text-teal-900 text-sm font-medium">
                    Дигитална трансформација на оценувањето!
                </p>
                <p className="text-teal-800 text-sm mt-1">
                    Напуштете го класичното тестирање. Овој генератор ви овозможува брзо креирање на <strong>формативни тестови</strong> кои даваат моментална повратна информација. Идеално за кратки проверки на часот кои ги мотивираат учениците наместо да ги плашат.
                </p>
            </div>
        </div>
      </div>

      <div className="flex flex-col gap-4 bg-slate-50 p-6 rounded-xl border border-slate-100 print:hidden">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             {/* Theme Selector */}
            <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">1. Избери Наставна Тема</label>
                <select 
                    value={selectedThemeId}
                    onChange={(e) => setSelectedThemeId(e.target.value)}
                    className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none bg-white font-medium text-slate-700"
                >
                    {filteredThemes.map(theme => (
                    <option key={theme.id} value={theme.id}>{theme.title}</option>
                    ))}
                </select>
            </div>

            {/* Topic Selector */}
            <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">2. Избери Лекција</label>
                <select 
                    value={selectedTopic}
                    onChange={(e) => setSelectedTopic(e.target.value)}
                    className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none bg-white text-slate-700"
                    disabled={availableTopics.length === 0}
                >
                    {availableTopics.map(topic => (
                    <option key={topic.id} value={topic.name}>{topic.name}</option>
                    ))}
                </select>
            </div>
        </div>
        
        <div className="mt-4 flex justify-end">
            <button
                onClick={handleGenerate}
                disabled={loading || !selectedTopic}
                className={`
                    w-full md:w-auto px-6 py-2.5 rounded-lg transition-all font-bold shadow-sm flex items-center justify-center gap-2
                    ${questions.length > 0
                        ? 'bg-white border-2 border-teal-600 text-teal-700 hover:border-teal-300 hover:bg-teal-50' // Strong Teal Outline
                        : 'bg-teal-600 text-white hover:bg-teal-700' // Solid style when new
                    }
                `}
            >
                {loading ? 'Се подготвува...' : (questions.length > 0 ? '🔄 Регенерирај Тест' : '🎲 Старт')}
            </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 text-red-700 rounded-lg border border-red-200">
           <strong>Грешка:</strong> {error}
        </div>
      )}

      {loading && <Loading message="Се генерираат прашања..." />}

      {!loading && questions.length > 0 && (
        <div className="space-y-6 animate-fade-in">
          
          {/* PRINT HEADER - Visible ONLY on print */}
          <div className="hidden print:block mb-6 text-black">
              <div className="text-right text-xs text-slate-500 mb-2 border-b pb-1">Мате-Ментор - Платформа за дигитално образование</div>
              <h1 className="text-2xl font-bold text-center mb-2 uppercase border-b-2 border-black pb-2">Тест по Математика ({grade} Одд.)</h1>
              <div className="flex justify-between text-sm mb-4">
                  <span>Ученик: __________________________</span>
                  <span>Датум: ________________</span>
              </div>
          </div>

          {questions.map((q, idx) => {
            const isCorrect = selectedAnswers[idx] === q.correctAnswerIndex;
            return (
              <div key={idx} className="bg-white border rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow break-inside-avoid">
                <div className="flex justify-between items-start mb-4">
                    <div className="flex-1 text-slate-800 text-lg">
                        <span className="font-bold text-slate-400 mr-2">{idx + 1}.</span> 
                        <div className="inline-block"><FormattedText text={q.question} /></div>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded font-bold ml-4 uppercase tracking-wider print:hidden ${
                        q.difficulty === 'Лесно' ? 'bg-green-100 text-green-700' :
                        q.difficulty === 'Средно' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-red-100 text-red-700'
                    }`}>
                        {q.difficulty}
                    </span>
                </div>

                <div className="space-y-2 pl-6">
                  {q.options.map((opt, optIdx) => {
                    let btnClass = "w-full text-left p-3 rounded-lg border transition-all text-sm flex items-center gap-2 cursor-pointer select-none ";
                    
                    if (showResults) {
                        if (optIdx === q.correctAnswerIndex) {
                            btnClass += "bg-green-100 border-green-500 text-green-900 font-bold";
                        } else if (optIdx === selectedAnswers[idx]) {
                            btnClass += "bg-red-50 border-red-300 text-red-900";
                        } else {
                            btnClass += "bg-slate-50 border-slate-200 opacity-50";
                        }
                    } else {
                        if (selectedAnswers[idx] === optIdx) {
                            btnClass += "bg-teal-50 border-teal-500 text-teal-900 font-medium shadow-inner";
                        } else {
                            btnClass += "hover:bg-slate-50 border-slate-200 active:bg-slate-100";
                        }
                    }

                    // Print styles override
                    btnClass += " print:border-none print:p-1 print:pl-0 print:bg-transparent";

                    return (
                      <div
                        key={optIdx}
                        onClick={() => !showResults && handleAnswerSelect(idx, optIdx)}
                        className={btnClass}
                        role="button"
                        aria-disabled={showResults}
                      >
                        <span className="font-mono font-bold text-slate-400 flex-shrink-0 print:text-black">{String.fromCharCode(65 + optIdx)}.</span> 
                        <div className="flex-1"><FormattedText text={opt} /></div>
                      </div>
                    );
                  })}
                </div>

                {showResults && (
                  <div className={`mt-4 ml-6 p-3 rounded-lg text-sm print:hidden ${isCorrect ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
                    <p className="font-bold mb-1">
                        {isCorrect ? '✅ Точен одговор!' : '❌ Неточен одговор.'}
                    </p>
                    <FormattedText text={q.explanation} />
                  </div>
                )}
              </div>
            );
          })}

          {/* RUBRIC SECTION - Visible on Screen and Print */}
          {rubric && (
              <div className="mt-8 pt-8 border-t-2 border-slate-200 print:border-black break-before-page">
                  <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 print:bg-transparent print:border-none print:p-0">
                      <h3 className="text-xl font-bold text-slate-800 mb-4 print:text-black flex items-center gap-2">
                          <span className="print:hidden">👨‍🏫</span> Водич за наставникот (Рубрика)
                      </h3>
                      <div className="text-slate-700 print:text-black rubric-content">
                         <ReactMarkdown 
                             remarkPlugins={[remarkGfm]}
                             rehypePlugins={[rehypeRaw]}
                             components={{
                                 table: ({node, ...props}) => <table className="w-full border-collapse border border-yellow-300 bg-white/50 mb-4 text-sm" {...props} />,
                                 thead: ({node, ...props}) => <thead className="bg-yellow-100" {...props} />,
                                 th: ({node, ...props}) => <th className="border border-yellow-300 p-2 text-left font-bold text-yellow-900" {...props} />,
                                 td: ({node, ...props}) => <td className="border border-yellow-300 p-2" {...props} />,
                                 tr: ({node, ...props}) => <tr className="border-b border-yellow-200" {...props} />,
                             }}
                         >
                             {rubric}
                         </ReactMarkdown>
                      </div>
                  </div>
              </div>
          )}

          <div className="sticky bottom-6 bg-white/90 backdrop-blur p-4 shadow-2xl rounded-xl border border-slate-200 flex justify-between items-center z-10 print:hidden">
            {showResults ? (
                <div className="text-xl font-bold flex items-center gap-4">
                    <span>Резултат: <span className={calculateScore() > questions.length/2 ? "text-green-600" : "text-orange-600"}>{calculateScore()} / {questions.length}</span></span>
                    <button 
                        onClick={handleGenerate} 
                        className="text-sm bg-white border-2 border-slate-300 text-slate-700 hover:bg-slate-50 px-4 py-2 rounded-lg transition-colors font-bold"
                    >
                        Нов Тест
                    </button>
                    <button
                        onClick={() => window.print()}
                        className="text-sm bg-slate-900 hover:bg-slate-800 text-white px-5 py-2 rounded-lg transition-colors flex items-center gap-2 font-bold shadow-md"
                    >
                         <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                        </svg>
                         Печати
                    </button>
                </div>
            ) : (
                <button
                    onClick={() => setShowResults(true)}
                    disabled={selectedAnswers.includes(-1)}
                    className="w-full py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed font-bold shadow-lg transform active:scale-95 transition-all"
                >
                    Заврши и Провери
                </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default QuizMaker;
