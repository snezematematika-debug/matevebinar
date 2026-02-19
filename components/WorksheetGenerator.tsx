
import React, { useState, useEffect, useRef } from 'react';
import { CURRICULUM, THEMES } from '../constants';
import { generateWorksheet } from '../services/geminiService';
import { CurriculumTopic, GradeLevel } from '../types';
import Loading from './Loading';
import FormattedText from './FormattedText';
import { parse } from 'marked';

interface WorksheetGeneratorProps {
  grade: GradeLevel;
}

type Tool = 'pen' | 'line' | 'eraser';

const WorksheetGenerator: React.FC<WorksheetGeneratorProps> = ({ grade }) => {
  const [selectedThemeId, setSelectedThemeId] = useState<string>("");
  const [selectedTopicId, setSelectedTopicId] = useState<string>("");
  const [worksheetType, setWorksheetType] = useState<'STANDARD' | 'DIFFERENTIATED' | 'EXIT_TICKET'>('STANDARD');
  
  const [worksheetContent, setWorksheetContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Whiteboard State
  const [isBoardOpen, setIsBoardOpen] = useState(false);
  const [isTaskPanelOpen, setIsTaskPanelOpen] = useState(true);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const snapshotRef = useRef<ImageData | null>(null); 
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState('#000000');
  const [activeTool, setActiveTool] = useState<Tool>('pen');
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });

  // Custom fields for the print view
  const [teacherName, setTeacherName] = useState('');
  const [schoolName, setSchoolName] = useState('');

  // Filter themes and topics
  const filteredThemes = THEMES.filter(t => t.grade === grade);
  const availableTopics = CURRICULUM.filter(topic => topic.themeId === selectedThemeId && topic.grade === grade);
  const currentTopic: CurriculumTopic | undefined = CURRICULUM.find(t => t.id === selectedTopicId);

  // Initialize selection when grade changes
  useEffect(() => {
    if (filteredThemes.length > 0) {
      setSelectedThemeId(filteredThemes[0].id);
    } else {
      setSelectedThemeId("");
    }
    setWorksheetContent(null);
  }, [grade]);

  // Set default topic when theme changes
  useEffect(() => {
    if (availableTopics.length > 0) {
      setSelectedTopicId(availableTopics[0].id);
    } else {
      setSelectedTopicId("");
    }
  }, [selectedThemeId, grade]);

  // ULTRA PRECISE COORDINATE CALCULATION using POINTER EVENTS
  const getCoordinates = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    
    const rect = canvas.getBoundingClientRect();
    
    // Calculate scale factors if the canvas is stretched via CSS
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    // Apply scaling and offset correction
    // clientX/Y works for Mouse, Touch, and Pen in PointerEvent
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
  };

  // Canvas Resize Logic (Preserves drawing and updates internal resolution)
  useEffect(() => {
    if (isBoardOpen && canvasRef.current) {
        const resizeCanvas = () => {
            const canvas = canvasRef.current;
            if (!canvas) return;
            const parent = canvas.parentElement;
            if (!parent) return;

            const rect = parent.getBoundingClientRect();
            if (rect.width === 0 || rect.height === 0) return;

            // Capture current drawing
            const ctx = canvas.getContext('2d');
            let tempImg: ImageData | null = null;
            if (canvas.width > 0 && canvas.height > 0) {
                try {
                    tempImg = ctx?.getImageData(0, 0, canvas.width, canvas.height) || null;
                } catch (e) { console.warn("Resize snapshot failed"); }
            }

            // Sync internal resolution with physical layout
            canvas.width = rect.width;
            canvas.height = rect.height;

            // Restore drawing
            if (tempImg) {
                ctx?.putImageData(tempImg, 0, 0);
            }
        };

        // Delay slightly to allow layout animations to finish
        const timeoutId = setTimeout(resizeCanvas, 100);
        window.addEventListener('resize', resizeCanvas);
        
        return () => {
            clearTimeout(timeoutId);
            window.removeEventListener('resize', resizeCanvas);
        };
    }
  }, [isBoardOpen, isTaskPanelOpen]);

  const startDrawing = (e: React.PointerEvent<HTMLCanvasElement>) => {
    // Crucial for tablet: prevents scrolling/selecting
    e.preventDefault(); 
    e.stopPropagation();

    // Set capture to track the pen even if it leaves the canvas bounds momentarily
    (e.target as HTMLElement).setPointerCapture(e.pointerId);

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    
    const coords = getCoordinates(e);
    setIsDrawing(true);
    setStartPos(coords);
    
    // Safety check for taking snapshot
    try {
        snapshotRef.current = ctx.getImageData(0, 0, canvas.width, canvas.height);
    } catch (err) {
        snapshotRef.current = null;
    }
    
    if (activeTool === 'pen' || activeTool === 'eraser') {
      ctx.beginPath();
      ctx.moveTo(coords.x, coords.y);
    }
  };

  const draw = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.preventDefault(); 
    e.stopPropagation();

    if (!isDrawing) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    
    const coords = getCoordinates(e);
    
    ctx.lineWidth = activeTool === 'eraser' ? 30 : 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = activeTool === 'eraser' ? '#ffffff' : color;

    if (activeTool === 'pen' || activeTool === 'eraser') {
      ctx.lineTo(coords.x, coords.y);
      ctx.stroke();
    } else if (activeTool === 'line') {
      // Live Line Preview
      if (snapshotRef.current) {
        ctx.putImageData(snapshotRef.current, 0, 0);
      }
      ctx.beginPath();
      ctx.moveTo(startPos.x, startPos.y);
      ctx.lineTo(coords.x, coords.y);
      ctx.stroke();
    }
  };

  const endDrawing = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (isDrawing) {
        setIsDrawing(false);
        snapshotRef.current = null;
        // Release capture
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    }
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx?.clearRect(0, 0, canvas.width, canvas.height);
    }
  };

  const handleAiGenerate = async () => {
    if (!currentTopic) return;
    setLoading(true);
    setError(null);
    try {
      const content = await generateWorksheet(currentTopic.name, worksheetType);
      setWorksheetContent(content);
    } catch (err: any) {
      setError(err.message || "Неуспешно генерирање на работен лист.");
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => window.print();

  const handleDownloadMd = () => {
    if (!worksheetContent) return;
    const blob = new Blob([worksheetContent], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Worksheet_${currentTopic?.name.replace(/\s+/g, '_')}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDownloadWord = () => {
    if (!worksheetContent) return;
    const htmlContent = parse(worksheetContent);
    const themeTitle = THEMES.find(t => t.id === selectedThemeId)?.title || "ГЕОМЕТРИЈА";
    const titleType = worksheetType === 'EXIT_TICKET' ? 'Излезни Ливчиња (Exit Tickets)' : 
                     worksheetType === 'DIFFERENTIATED' ? 'Диференциран Работен Лист' : 'Работен Лист';
    const fullHtml = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <meta charset='utf-8'>
        <title>Работен Лист - ${currentTopic?.name}</title>
        <style>
          body { font-family: 'Calibri', 'Arial', sans-serif; font-size: 11pt; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
          td, th { border: 1px solid black; padding: 8px; vertical-align: top; }
          .header-cell { background-color: #f3f4f6; font-weight: bold; width: 30%; }
          h1 { font-size: 16pt; color: #2E4053; margin-top: 20px; text-align: center; text-transform: uppercase; border-bottom: 2px solid black; padding-bottom: 5px; }
          h2 { font-size: 14pt; color: #2E86C1; margin-top: 15px; }
        </style>
      </head>
      <body>
        <p style="text-align: right; font-size: 9pt; color: #666; border-bottom: 1px solid #ccc;">Мате-Ментор - Платформа за дигитално образование</p>
        <table>
          <tr><td class="header-cell">Предмет:</td><td>Математика за ${grade} одделение</td></tr>
          <tr><td class="header-cell">Тема:</td><td style="text-transform: uppercase; font-weight: bold;">${themeTitle}</td></tr>
          <tr><td class="header-cell">Лекција:</td><td style="font-weight: bold;">${currentTopic?.name}</td></tr>
          <tr><td class="header-cell">Изготвил/-а:</td><td>${teacherName || '__________________'}</td></tr>
          <tr><td class="header-cell">ООУ:</td><td>${schoolName || '__________________'}</td></tr>
        </table>
        <h1>${titleType}</h1>
        <div>${htmlContent}</div>
        <br/><br/>
        <table style="border: none;">
            <tr style="border: none;">
                <td style="border: none; border-top: 1px solid black; padding-top: 10px;">Датум: ________________</td>
                <td style="border: none; border-top: 1px solid black; padding-top: 10px; text-align: right;">Потпис: ________________</td>
            </tr>
        </table>
      </body>
      </html>
    `;
    const blob = new Blob([fullHtml], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Worksheet_${currentTopic?.name.replace(/\s+/g, '_')}.doc`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const dotCursor = `url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="8" height="8" viewBox="0 0 8 8"><circle cx="4" cy="4" r="3" fill="${encodeURIComponent(color)}"/></svg>') 4 4, crosshair`;

  return (
    <div className="space-y-6 animate-fade-in relative">
       <style>{`
        @media print { @page { size: portrait; } }
      `}</style>

      {/* Input Section */}
      <div className="print:hidden">
        <div className="border-b pb-4 mb-6">
            <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                📄 Работни листови
                <span className="text-sm font-normal text-indigo-600 bg-indigo-50 px-2 py-1 rounded-full">{grade} Одд.</span>
            </h2>
            <p className="text-slate-500 mt-1">Изберете лекција и генерирајте работен лист.</p>
        </div>

        <div className="flex flex-col gap-4 bg-slate-50 p-6 rounded-xl border border-slate-100">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">1. Избери Наставна Тема</label>
                    <select value={selectedThemeId} onChange={(e) => setSelectedThemeId(e.target.value)} className="w-full p-3 border-2 border-indigo-300 rounded-lg focus:ring-4 focus:ring-indigo-100 bg-white font-bold text-slate-700 shadow-sm outline-none">
                        {filteredThemes.map(theme => <option key={theme.id} value={theme.id}>{theme.title}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">2. Тип на работен лист</label>
                    <select value={worksheetType} onChange={(e) => setWorksheetType(e.target.value as any)} className="w-full p-3 border-2 border-indigo-300 rounded-lg focus:ring-4 focus:ring-indigo-100 bg-white font-bold text-slate-700 shadow-sm outline-none">
                        <option value="STANDARD">Стандарден (Едно ниво)</option>
                        <option value="DIFFERENTIATED">Диференциран (3 Нивоа)</option>
                        <option value="EXIT_TICKET">Излезно Ливче (Exit Ticket)</option>
                    </select>
                </div>
                <div className="md:col-span-2">
                    <label className="block text-sm font-bold text-slate-700 mb-1">3. Избери Лекција</label>
                    <select value={selectedTopicId} onChange={(e) => setSelectedTopicId(e.target.value)} className="w-full p-3 border-2 border-indigo-300 rounded-lg focus:ring-4 focus:ring-indigo-100 bg-white font-bold text-slate-700 shadow-sm outline-none" disabled={availableTopics.length === 0}>
                        {availableTopics.map(topic => <option key={topic.id} value={topic.id}>{topic.name}</option>)}
                    </select>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4 border-t pt-4">
                <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Изготвил</label>
                    <input type="text" value={teacherName} onChange={(e) => setTeacherName(e.target.value)} placeholder="Вашето име" className="w-full p-2 border border-slate-300 rounded-lg text-sm outline-none"/>
                </div>
                <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">ООУ</label>
                    <input type="text" value={schoolName} onChange={(e) => setSchoolName(e.target.value)} placeholder="Училиште" className="w-full p-2 border border-slate-300 rounded-lg text-sm outline-none"/>
                </div>
            </div>
            
            <div className="mt-4 flex justify-end">
                <button onClick={handleAiGenerate} disabled={loading || !selectedTopicId} className="w-full md:w-auto px-6 py-2.5 bg-indigo-600 text-white rounded-lg font-bold shadow-md hover:bg-indigo-700 disabled:opacity-50">
                    {loading ? 'Се генерира...' : (worksheetContent ? '🔄 Регенерирај' : '✨ Креирај')}
                </button>
            </div>
        </div>
        {loading && <Loading message="Се генерира работниот лист..." />}
      </div>

      {worksheetContent && !loading && (
        <div className="mt-8 space-y-6 animate-slide-up print:mt-0">
          <div className="print:hidden flex flex-wrap justify-end gap-3 items-center bg-slate-50 p-3 rounded-xl border border-slate-200">
             <button onClick={() => setIsBoardOpen(true)} className="px-5 py-2 bg-teal-600 text-white text-sm font-bold rounded-lg shadow-md hover:bg-teal-700 transition-all">
                <span>👨‍🏫 Објасни на табла</span>
             </button>
             <button onClick={handleDownloadWord} className="px-5 py-2 bg-white border-2 border-indigo-600 text-indigo-700 text-sm font-bold rounded-lg hover:bg-indigo-50">Word Doc</button>
             <button onClick={handlePrint} className="px-5 py-2 bg-slate-900 text-white text-sm font-bold rounded-lg shadow-md hover:bg-slate-800">Печати PDF</button>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm p-8 print:p-0 print:border-none">
            <FormattedText text={worksheetContent} />
          </div>
        </div>
      )}

      {/* WHITEBOARD MODAL */}
      {isBoardOpen && (
        <div className="fixed inset-0 z-[100] bg-slate-900/95 flex items-center justify-center p-4 animate-fade-in print:hidden">
            <div className="bg-white w-full max-w-[95vw] h-[95vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden border-[8px] border-slate-700">
                <div className="bg-slate-100 p-4 border-b flex flex-wrap justify-between items-center gap-4">
                    <div className="flex items-center gap-4">
                        <button onClick={() => setIsTaskPanelOpen(!isTaskPanelOpen)} className="px-3 py-1.5 bg-indigo-600 text-white text-xs font-bold rounded-lg shadow-sm transition-all hover:bg-indigo-700">
                            {isTaskPanelOpen ? '👁️ Скриј задачи' : '👁️ Види задачи'}
                        </button>
                        <div className="flex gap-1 border-r pr-4 border-slate-300">
                            <button onClick={() => { setActiveTool('pen'); setColor('#000000'); }} className={`w-8 h-8 rounded-full border-2 ${color === '#000000' && activeTool !== 'eraser' ? 'border-teal-500 ring-2 ring-teal-200 scale-110' : 'border-slate-300'}`} style={{backgroundColor: '#000000'}}/>
                            <button onClick={() => { setActiveTool('pen'); setColor('#2563eb'); }} className={`w-8 h-8 rounded-full border-2 ${color === '#2563eb' && activeTool !== 'eraser' ? 'border-teal-500 ring-2 ring-teal-200 scale-110' : 'border-slate-300'}`} style={{backgroundColor: '#2563eb'}}/>
                            <button onClick={() => { setActiveTool('pen'); setColor('#dc2626'); }} className={`w-8 h-8 rounded-full border-2 ${color === '#dc2626' && activeTool !== 'eraser' ? 'border-teal-500 ring-2 ring-teal-200 scale-110' : 'border-slate-300'}`} style={{backgroundColor: '#dc2626'}}/>
                        </div>
                        <div className="flex gap-1">
                            <button onClick={() => setActiveTool('pen')} className={`px-4 py-1.5 rounded-lg text-xs font-bold border transition-all ${activeTool === 'pen' ? 'bg-teal-600 text-white shadow-md' : 'bg-white text-slate-600'}`}>🖊️ Молив</button>
                            <button onClick={() => setActiveTool('line')} className={`px-4 py-1.5 rounded-lg text-xs font-bold border transition-all ${activeTool === 'line' ? 'bg-teal-600 text-white shadow-md' : 'bg-white text-slate-600'}`}>📏 Линија</button>
                            <button onClick={() => setActiveTool('eraser')} className={`px-4 py-1.5 rounded-lg text-xs font-bold border transition-all ${activeTool === 'eraser' ? 'bg-teal-600 text-white shadow-md' : 'bg-white text-slate-600'}`}>🧽 Гума</button>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={clearCanvas} className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-xs font-bold transition-all">Исчисти</button>
                        <button onClick={() => setIsBoardOpen(false)} className="px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold shadow-lg transition-all">Затвори</button>
                    </div>
                </div>

                <div className="flex-1 flex overflow-hidden">
                    {isTaskPanelOpen && (
                      <div className="w-1/3 border-r bg-slate-50 overflow-y-auto p-6 animate-slide-right">
                          <h4 className="font-bold text-slate-800 mb-4 border-b pb-2 flex items-center gap-2">
                            <span>📋</span> Задачи
                          </h4>
                          <div className="prose prose-sm prose-slate max-w-none">
                            <FormattedText text={worksheetContent || ""} />
                          </div>
                      </div>
                    )}
                    {/* CANVAS AREA with POINTER EVENTS for Tablet Support */}
                    <div 
                      className="flex-1 relative bg-white overflow-hidden select-none" 
                      style={{ cursor: activeTool === 'pen' ? dotCursor : 'crosshair' }}
                    >
                        <div className="absolute inset-0 pointer-events-none opacity-[0.05]" style={{ backgroundImage: 'linear-gradient(#000 1px, transparent 1px), linear-gradient(90deg, #000 1px, transparent 1px)', backgroundSize: '30px 30px' }}></div>
                        <canvas 
                            ref={canvasRef} 
                            onPointerDown={startDrawing} 
                            onPointerMove={draw} 
                            onPointerUp={endDrawing} 
                            onPointerOut={endDrawing} 
                            style={{ touchAction: 'none' }} // Critical for tablets
                            className="w-full h-full block" 
                        />
                    </div>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default WorksheetGenerator;
