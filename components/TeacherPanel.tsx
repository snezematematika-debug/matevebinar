
import React, { useState, useRef, useEffect } from 'react';
import { CURRICULUM, THEMES } from '../constants';
import { generateTeacherTask } from '../services/geminiService';
import { GradeLevel } from '../types';
import Loading from './Loading';
import FormattedText from './FormattedText';

interface TeacherPanelProps {
  grade: GradeLevel;
}

type Tool = 'pen' | 'line' | 'eraser';

const TeacherPanel: React.FC<TeacherPanelProps> = ({ grade }) => {
  const [selectedThemeId, setSelectedThemeId] = useState<string>("");
  const [selectedTopic, setSelectedTopic] = useState<string>("");
  
  const [task, setTask] = useState<{problem: string, hint: string, solution: string} | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showHint, setShowHint] = useState(false);
  const [showSolution, setShowSolution] = useState(false);

  // Whiteboard state
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState('#000000');
  const [lineWidth, setLineWidth] = useState(3);
  const [activeTool, setActiveTool] = useState<Tool>('pen');
  
  // For Line and Undo logic
  const [snapshot, setSnapshot] = useState<ImageData | null>(null);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });

  // Filter content
  const filteredThemes = THEMES.filter(t => t.grade === grade);
  const availableTopics = CURRICULUM.filter(topic => topic.themeId === selectedThemeId && topic.grade === grade);

  useEffect(() => {
    if (filteredThemes.length > 0) {
      setSelectedThemeId(filteredThemes[0].id);
    } else {
      setSelectedThemeId("");
    }
    setTask(null);
  }, [grade]);

  useEffect(() => {
    if (availableTopics.length > 0) {
      setSelectedTopic(availableTopics[0].name);
    } else {
      setSelectedTopic("");
    }
  }, [selectedThemeId, grade]);

  const fetchTask = async () => {
    if (!selectedTopic) return;
    setLoading(true);
    setError(null);
    setShowHint(false);
    setShowSolution(false);
    try {
      const result = await generateTeacherTask(selectedTopic, grade);
      setTask(result);
      clearCanvas();
    } catch (err: any) {
      setError(err.message || "Грешка при преземање на задачата.");
    } finally {
      setLoading(false);
    }
  };

  // Drawing logic using POINTER EVENTS (Fixes Tablet Issues)
  const getCoordinates = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    
    // Calculate scale if CSS size differs from internal size
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    return { 
        x: (e.clientX - rect.left) * scaleX, 
        y: (e.clientY - rect.top) * scaleY
    };
  };

  const startDrawing = (e: React.PointerEvent<HTMLCanvasElement>) => {
    // Prevent default browser actions (scrolling/gestures)
    e.preventDefault();
    e.stopPropagation();
    
    // Capture pointer to track movement even outside canvas
    (e.target as HTMLElement).setPointerCapture(e.pointerId);

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const { x, y } = getCoordinates(e);
    setIsDrawing(true);
    setStartPos({ x, y });
    
    // Save snapshot for line preview or undo
    try {
        setSnapshot(ctx.getImageData(0, 0, canvas.width, canvas.height));
    } catch(err) {
        // ignore CORS taint issues if any
    }

    if (activeTool === 'pen' || activeTool === 'eraser') {
        ctx.beginPath();
        ctx.moveTo(x, y);
    }
  };

  const draw = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isDrawing) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const { x, y } = getCoordinates(e);

    ctx.lineWidth = activeTool === 'eraser' ? 25 : lineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = activeTool === 'eraser' ? '#ffffff' : color;

    if (activeTool === 'pen' || activeTool === 'eraser') {
        ctx.lineTo(x, y);
        ctx.stroke();
    } else if (activeTool === 'line') {
        // Restore from snapshot to show live preview of the line
        if (snapshot) {
            ctx.putImageData(snapshot, 0, 0);
        }
        ctx.beginPath();
        ctx.moveTo(startPos.x, startPos.y);
        ctx.lineTo(x, y);
        ctx.stroke();
    }
  };

  const endDrawing = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if(isDrawing) {
        setIsDrawing(false);
        const canvas = canvasRef.current;
        if (canvas) {
            const ctx = canvas.getContext('2d');
            ctx?.beginPath(); // Reset path
        }
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

  const downloadCapture = () => {
    const canvas = canvasRef.current;
    if (!canvas || !task) return;
    
    const wrapText = (ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number) => {
        const words = text.split(' ');
        let line = '';
        let testY = y;
        for (let n = 0; n < words.length; n++) {
            let testLine = line + words[n] + ' ';
            let metrics = ctx.measureText(testLine);
            let testWidth = metrics.width;
            if (testWidth > maxWidth && n > 0) {
                ctx.fillText(line, x, testY);
                line = words[n] + ' ';
                testY += lineHeight;
            } else {
                line = testLine;
            }
        }
        ctx.fillText(line, x, testY);
        return testY + lineHeight;
    };

    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');
    if (!tempCtx) return;

    tempCanvas.width = canvas.width;
    tempCanvas.height = 2500;

    tempCtx.fillStyle = 'white';
    tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);

    tempCtx.fillStyle = '#111827';
    tempCtx.fillRect(0, 0, tempCanvas.width, 100);
    
    tempCtx.fillStyle = 'white';
    tempCtx.font = 'bold 28px Inter, sans-serif';
    tempCtx.fillText(`📐 Мате-Ментор | Интерактивна тетратка`, 40, 60);

    tempCtx.fillStyle = '#1e293b';
    tempCtx.font = 'bold 22px Inter, sans-serif';
    let currentY = 150;
    currentY = wrapText(tempCtx, `Лекција: ${selectedTopic}`, 40, currentY, tempCanvas.width - 80, 32);
    
    tempCtx.font = 'italic 20px Inter, sans-serif';
    tempCtx.fillStyle = '#475569';
    currentY = wrapText(tempCtx, `Задача: ${task.problem}`, 40, currentY + 20, tempCanvas.width - 80, 30);

    tempCtx.strokeStyle = '#cbd5e1';
    tempCtx.lineWidth = 1;
    tempCtx.beginPath();
    tempCtx.moveTo(40, currentY + 30);
    tempCtx.lineTo(tempCanvas.width - 40, currentY + 30);
    tempCtx.stroke();

    const drawingStartY = currentY + 60;
    const finalHeight = drawingStartY + canvas.height + 60;

    const finalImageData = tempCtx.getImageData(0, 0, tempCanvas.width, drawingStartY);
    tempCanvas.height = finalHeight;
    tempCtx.fillStyle = 'white';
    tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
    tempCtx.putImageData(finalImageData, 0, 0);

    tempCtx.drawImage(canvas, 0, drawingStartY);

    tempCtx.fillStyle = '#94a3b8';
    tempCtx.font = '14px Inter, sans-serif';
    tempCtx.fillText(`АВТОР: Снежана Златковска - ${new Date().toLocaleDateString()}`, 40, finalHeight - 25);

    const link = document.createElement('a');
    link.download = `MateMentor_Rabota_${Date.now()}.png`;
    link.href = tempCanvas.toDataURL('image/png');
    link.click();
  };

  useEffect(() => {
    const handleResize = () => {
        const canvas = canvasRef.current;
        if (canvas && canvas.parentElement) {
            canvas.width = canvas.parentElement.clientWidth;
            canvas.height = canvas.parentElement.clientHeight || 550;
        }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [task]);

  const selectTool = (tool: Tool) => {
      setActiveTool(tool);
      if (tool === 'eraser') {
          setColor('#ffffff');
      } else if (color === '#ffffff') {
          setColor('#000000');
      }
  };

  // Custom cursor for a dot/point tip
  const dotCursor = `url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="8" height="8" viewBox="0 0 8 8"><circle cx="4" cy="4" r="3" fill="${encodeURIComponent(color)}"/></svg>') 4 4, crosshair`;

  return (
    <div className="space-y-4">
      <div className="border-b pb-4 print:hidden">
        <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            📓 Интерактивна тетратка
        </h2>
        <p className="text-slate-500 mt-1">Генерирајте задачи и објаснувајте ги на проширена дигитална табла со напредни алатки за цртање.</p>
      </div>

      <div className="flex flex-col gap-4 bg-slate-50 p-6 rounded-xl border border-slate-100 print:hidden">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Тема</label>
                <select 
                    value={selectedThemeId}
                    onChange={(e) => setSelectedThemeId(e.target.value)}
                    className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none bg-white font-medium"
                >
                    {filteredThemes.map(theme => (
                    <option key={theme.id} value={theme.id}>{theme.title}</option>
                    ))}
                </select>
            </div>
            <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Лекција</label>
                <select 
                    value={selectedTopic}
                    onChange={(e) => setSelectedTopic(e.target.value)}
                    className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none bg-white font-medium"
                    disabled={availableTopics.length === 0}
                >
                    {availableTopics.map(topic => (
                    <option key={topic.id} value={topic.name}>{topic.name}</option>
                    ))}
                </select>
            </div>
        </div>
        
        <div className="flex justify-end">
            <button
                onClick={fetchTask}
                disabled={loading || !selectedTopic}
                className="bg-teal-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-teal-700 shadow-md transition-all transform active:scale-95"
            >
                {loading ? 'Се генерира...' : '🧩 Нова задача'}
            </button>
        </div>
      </div>

      {error && <div className="p-4 bg-red-50 text-red-700 rounded-lg border border-red-200">{error}</div>}

      {loading && <Loading message="AI ја подготвува задачата..." />}

      {task && !loading && (
        <div className="flex flex-col space-y-4 animate-fade-in">
            {/* Header Bar */}
            <div className="bg-indigo-900 text-white p-4 rounded-xl shadow-lg flex justify-between items-center">
                <span className="font-bold flex items-center gap-2">
                    <span className="bg-indigo-700 p-1.5 rounded-lg">📖</span>
                    {selectedTopic}
                </span>
                <div className="flex gap-2 print:hidden">
                   <button onClick={() => setShowHint(!showHint)} className="text-xs bg-indigo-700 hover:bg-indigo-600 px-3 py-1.5 rounded-lg border border-indigo-500 transition-colors">
                      {showHint ? 'Сокриј помош' : 'Помош'}
                   </button>
                   <button onClick={() => setShowSolution(!showSolution)} className="text-xs bg-indigo-700 hover:bg-indigo-600 px-3 py-1.5 rounded-lg border border-indigo-500 transition-colors">
                      {showSolution ? 'Сокриј решение' : 'Решение'}
                   </button>
                </div>
            </div>

            {/* Notebook Container - WIDER SPLIT (40/60) */}
            <div className="flex flex-col md:flex-row gap-0 bg-[#e0d4c3] rounded-2xl shadow-2xl overflow-hidden border-[12px] border-[#8b5e3c] relative min-h-[650px]">
                
                {/* Spiral Divider - Indigo Blue Color - EXTENDED TO EDGES */}
                <div className="hidden md:block absolute left-[40%] top-0 bottom-0 w-8 -ml-4 z-20 flex flex-col justify-around py-0">
                    {[...Array(26)].map((_, i) => (
                        <div key={i} className="w-10 h-3 bg-indigo-400 rounded-full shadow-md -ml-1 border border-indigo-500"></div>
                    ))}
                </div>

                {/* Left Page: Task (Wider split: flex-4) */}
                <div className="md:flex-[4] bg-[#fcf9f2] p-6 md:p-10 border-r md:border-r-4 border-slate-200 relative overflow-y-auto max-h-[600px] md:max-h-none">
                    <div className="absolute top-0 left-6 bottom-0 w-px bg-red-200 opacity-50"></div>
                    <div className="relative z-10 space-y-6">
                        <div className="bg-teal-50/50 p-6 rounded-xl border border-teal-100 shadow-sm">
                            <h3 className="text-lg font-bold text-teal-900 mb-3 border-b-2 border-teal-200 pb-2 uppercase tracking-wide">Задача</h3>
                            <div className="text-xl text-slate-800 leading-relaxed italic font-medium">
                                <FormattedText text={task.problem} />
                            </div>
                        </div>

                        {showHint && (
                            <div className="bg-amber-50 p-4 rounded-xl border border-amber-200 animate-slide-up">
                                <h4 className="font-bold text-amber-900 text-xs uppercase mb-1">Помош:</h4>
                                <p className="text-amber-800 text-sm">{task.hint}</p>
                            </div>
                        )}

                        {showSolution && (
                            <div className="bg-emerald-50 p-6 rounded-xl border border-emerald-200 animate-slide-up">
                                <h4 className="font-bold text-emerald-900 text-xs uppercase mb-2">Решение:</h4>
                                <div className="text-emerald-800 text-sm">
                                    <FormattedText text={task.solution} />
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Page: Whiteboard (Wider split: flex-6) */}
                <div className="md:flex-[6] bg-white p-4 md:p-8 flex flex-col relative min-h-[500px] md:min-h-0">
                    <div className="absolute inset-0 pointer-events-none" style={{
                        backgroundImage: 'linear-gradient(#d1d5db 1px, transparent 1px), linear-gradient(90deg, #d1d5db 1px, transparent 1px)',
                        backgroundSize: '30px 30px',
                        opacity: 0.65
                    }}></div>
                    
                    {/* Whiteboard Controls */}
                    <div className="relative z-10 flex flex-wrap justify-between items-center mb-4 bg-slate-50/90 backdrop-blur p-2 rounded-xl border border-slate-200 shadow-sm print:hidden">
                        <div className="flex gap-2 items-center">
                            {/* Colors */}
                            <div className="flex gap-1.5 border-r pr-2 border-slate-300">
                                <button 
                                    onClick={() => { selectTool('pen'); setColor('#000000'); }} 
                                    className={`w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 ${color === '#000000' && activeTool !== 'eraser' ? 'border-teal-500 scale-110 ring-2 ring-teal-200' : 'border-slate-300'}`}
                                    style={{backgroundColor: '#000000'}}
                                />
                                <button 
                                    onClick={() => { selectTool('pen'); setColor('#2563eb'); }} 
                                    className={`w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 ${color === '#2563eb' && activeTool !== 'eraser' ? 'border-teal-500 scale-110 ring-2 ring-teal-200' : 'border-slate-300'}`}
                                    style={{backgroundColor: '#2563eb'}}
                                />
                                <button 
                                    onClick={() => { selectTool('pen'); setColor('#dc2626'); }} 
                                    className={`w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 ${color === '#dc2626' && activeTool !== 'eraser' ? 'border-teal-500 scale-110 ring-2 ring-teal-200' : 'border-slate-300'}`}
                                    style={{backgroundColor: '#dc2626'}}
                                />
                            </div>

                            {/* Tools */}
                            <div className="flex gap-1.5">
                                <button 
                                    onClick={() => selectTool('pen')} 
                                    className={`w-9 h-9 rounded-lg border flex items-center justify-center transition-all ${activeTool === 'pen' ? 'bg-teal-500 text-white border-teal-600 shadow-inner' : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'}`}
                                    title="Рачно пишување"
                                >
                                    <span className="text-lg">🖊️</span>
                                </button>
                                <button 
                                    onClick={() => selectTool('line')} 
                                    className={`w-9 h-9 rounded-lg border flex items-center justify-center transition-all ${activeTool === 'line' ? 'bg-teal-500 text-white border-teal-600 shadow-inner' : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'}`}
                                    title="Права линија"
                                >
                                    <span className="text-lg font-bold">📏</span>
                                </button>
                                <button 
                                    onClick={() => selectTool('eraser')} 
                                    className={`w-9 h-9 rounded-lg border flex items-center justify-center transition-all ${activeTool === 'eraser' ? 'bg-teal-500 text-white border-teal-600 shadow-inner' : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'}`}
                                    title="Гума"
                                >
                                    <span className="text-xl">🧽</span>
                                </button>
                            </div>
                        </div>
                        
                        <div className="flex gap-2">
                             <button onClick={clearCanvas} className="text-xs bg-slate-200 hover:bg-slate-300 px-3 py-2 rounded-lg text-slate-700 font-bold transition-colors">
                                Избриши
                             </button>
                             <button onClick={downloadCapture} className="text-xs bg-indigo-600 hover:bg-indigo-700 px-3 py-2 rounded-lg text-white font-bold transition-colors shadow-md">
                                📸 Зачувај работа
                             </button>
                        </div>
                    </div>

                    {/* Canvas Area with Pointer Events for Tablet Support */}
                    <div 
                      className="flex-1 relative bg-white/20 rounded-lg border-2 border-slate-200/50 overflow-hidden select-none"
                      style={{ cursor: activeTool === 'pen' ? dotCursor : 'crosshair' }}
                    >
                        <canvas 
                            ref={canvasRef}
                            onPointerDown={startDrawing}
                            onPointerUp={endDrawing}
                            onPointerMove={draw}
                            onPointerOut={endDrawing}
                            style={{ touchAction: 'none' }} // Crucial for graphics tablets
                            className="w-full h-full"
                        />
                    </div>
                </div>
            </div>
        </div>
      )}

      {!task && !loading && (
          <div className="flex flex-col items-center justify-center py-24 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 opacity-70 animate-fade-in">
              <span className="text-8xl mb-6">📓</span>
              <p className="text-xl font-bold text-slate-500">Вашата интерактивна тетратка е подготвена.</p>
              <p className="text-slate-400 mt-2">Изберете лекција и започнете со настава.</p>
              <button 
                onClick={fetchTask} 
                className="mt-6 px-10 py-3 bg-teal-600 text-white rounded-xl font-bold hover:bg-teal-700 shadow-xl transition-all transform hover:-translate-y-1"
              >
                  Отвори задача
              </button>
          </div>
      )}
    </div>
  );
};

export default TeacherPanel;
