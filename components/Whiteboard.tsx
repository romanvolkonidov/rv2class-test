"use client";

import { useRef, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Pencil, Eraser, Square, Circle, Type, Undo, Redo, Trash2, Download, ChevronDown, ChevronUp } from "lucide-react";
import { useRoomContext, useDataChannel } from "@livekit/components-react";

type DrawingTool = "pencil" | "eraser" | "rectangle" | "circle" | "text";

interface Point {
  x: number;
  y: number;
}

interface DrawingAction {
  tool: DrawingTool;
  color: string;
  width: number;
  points?: Point[];
  startPoint?: Point;
  endPoint?: Point;
  text?: string;
}

export default function Whiteboard() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [tool, setTool] = useState<DrawingTool>("pencil");
  const [color, setColor] = useState("#000000");
  const [lineWidth, setLineWidth] = useState(3);
  const [history, setHistory] = useState<DrawingAction[]>([]);
  const [historyStep, setHistoryStep] = useState(0);
  const [startPoint, setStartPoint] = useState<Point | null>(null);
  const [toolbarCollapsed, setToolbarCollapsed] = useState(false);
  const [currentDrawingAction, setCurrentDrawingAction] = useState<DrawingAction | null>(null);
  const room = useRoomContext();
  
  // Persist history in session storage
  const SESSION_STORAGE_KEY = 'whiteboard-history';
  
  // Load history from session storage on mount
  useEffect(() => {
    try {
      const savedHistory = sessionStorage.getItem(SESSION_STORAGE_KEY);
      if (savedHistory) {
        const parsed = JSON.parse(savedHistory);
        setHistory(parsed.history || []);
        setHistoryStep(parsed.historyStep || 0);
      }
    } catch (error) {
      console.error("Error loading whiteboard history:", error);
    }
  }, []);
  
  // Save history to session storage whenever it changes
  useEffect(() => {
    try {
      sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify({
        history,
        historyStep
      }));
    } catch (error) {
      console.error("Error saving whiteboard history:", error);
    }
  }, [history, historyStep]);

  // Send drawing data to other participants
  const sendDrawingData = (action: DrawingAction) => {
    try {
      const encoder = new TextEncoder();
      const data = encoder.encode(JSON.stringify({ type: "draw", action }));
      room.localParticipant.publishData(data, { reliable: true });
      console.log("Whiteboard: Sent drawing data", action.tool);
    } catch (error) {
      console.error("Whiteboard: Error sending drawing data:", error);
    }
  };

  // Receive drawing data from other participants
  useDataChannel((message) => {
    try {
      const decoder = new TextDecoder();
      const text = decoder.decode(message.payload);
      const data = JSON.parse(text);
      
      if (data.type === "draw" && canvasRef.current) {
        // Add received action to history so it persists
        const action = data.action;
        setHistory(prev => {
          // Check if this action is already in history to avoid duplicates
          const exists = prev.some(a => JSON.stringify(a) === JSON.stringify(action));
          if (exists) return prev;
          
          const newHistory = [...prev, action];
          return newHistory;
        });
        setHistoryStep(prev => prev + 1);
      } else if (data.type === "clear") {
        clearCanvas();
      }
    } catch (error) {
      console.error("Error processing data channel message:", error);
    }
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    console.log("Whiteboard: Canvas initialized");

    // Set canvas size
    const resize = () => {
      const container = canvas.parentElement;
      if (container) {
        canvas.width = container.clientWidth;
        canvas.height = container.clientHeight;
        console.log("Whiteboard: Canvas resized to", canvas.width, "x", canvas.height);
        redrawCanvas();
      }
    };

    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  const drawAction = (action: DrawingAction) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.strokeStyle = action.color;
    ctx.lineWidth = action.width;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    if (action.tool === "pencil" && action.points) {
      ctx.beginPath();
      action.points.forEach((point, index) => {
        if (index === 0) {
          ctx.moveTo(point.x, point.y);
        } else {
          ctx.lineTo(point.x, point.y);
        }
      });
      ctx.stroke();
    } else if (action.tool === "eraser" && action.points) {
      ctx.globalCompositeOperation = "destination-out";
      ctx.lineWidth = action.width * 3;
      ctx.beginPath();
      action.points.forEach((point, index) => {
        if (index === 0) {
          ctx.moveTo(point.x, point.y);
        } else {
          ctx.lineTo(point.x, point.y);
        }
      });
      ctx.stroke();
      ctx.globalCompositeOperation = "source-over";
    } else if (action.tool === "rectangle" && action.startPoint && action.endPoint) {
      const width = action.endPoint.x - action.startPoint.x;
      const height = action.endPoint.y - action.startPoint.y;
      ctx.strokeRect(action.startPoint.x, action.startPoint.y, width, height);
    } else if (action.tool === "circle" && action.startPoint && action.endPoint) {
      const radius = Math.sqrt(
        Math.pow(action.endPoint.x - action.startPoint.x, 2) +
        Math.pow(action.endPoint.y - action.startPoint.y, 2)
      );
      ctx.beginPath();
      ctx.arc(action.startPoint.x, action.startPoint.y, radius, 0, 2 * Math.PI);
      ctx.stroke();
    }
  };

  const redrawCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    history.slice(0, historyStep).forEach((action) => {
      drawAction(action);
    });
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    e.preventDefault();
    console.log("Whiteboard: Start drawing with tool:", tool);
    const rect = canvas.getBoundingClientRect();
    
    let clientX: number, clientY: number;
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const point = {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };

    setIsDrawing(true);
    setStartPoint(point);

    if (tool === "pencil" || tool === "eraser") {
      const action: DrawingAction = {
        tool,
        color,
        width: lineWidth,
        points: [point],
      };
      setCurrentDrawingAction(action);
    }
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    
    let clientX: number, clientY: number;
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const point = {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };

    if (tool === "pencil" || tool === "eraser") {
      if (currentDrawingAction && currentDrawingAction.points) {
        // Create a new action object with updated points (immutable update)
        const updatedAction = {
          ...currentDrawingAction,
          points: [...currentDrawingAction.points, point]
        };
        
        setCurrentDrawingAction(updatedAction);
        drawAction(updatedAction);
        sendDrawingData(updatedAction);
      }
    } else if ((tool === "rectangle" || tool === "circle") && startPoint) {
      redrawCanvas();
      const tempAction: DrawingAction = {
        tool,
        color,
        width: lineWidth,
        startPoint,
        endPoint: point,
      };
      drawAction(tempAction);
    }
  };

  const stopDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    setIsDrawing(false);

    const canvas = canvasRef.current;
    if (!canvas) return;

    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    
    let clientX: number, clientY: number;
    if ('changedTouches' in e) {
      clientX = e.changedTouches[0].clientX;
      clientY = e.changedTouches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const point = {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };

    if ((tool === "rectangle" || tool === "circle") && startPoint) {
      const action: DrawingAction = {
        tool,
        color,
        width: lineWidth,
        startPoint,
        endPoint: point,
      };
      setHistory([...history.slice(0, historyStep), action]);
      setHistoryStep(historyStep + 1);
      sendDrawingData(action);
    } else if ((tool === "pencil" || tool === "eraser") && currentDrawingAction) {
      // Add the completed drawing action to history
      setHistory([...history.slice(0, historyStep), currentDrawingAction]);
      setHistoryStep(historyStep + 1);
      sendDrawingData(currentDrawingAction);
      setCurrentDrawingAction(null);
    }

    setStartPoint(null);
  };

  const undo = () => {
    if (historyStep > 0) {
      setHistoryStep(historyStep - 1);
      redrawCanvas();
    }
  };

  const redo = () => {
    if (historyStep < history.length) {
      setHistoryStep(historyStep + 1);
      redrawCanvas();
    }
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    setHistory([]);
    setHistoryStep(0);
    
    // Clear session storage
    try {
      sessionStorage.removeItem(SESSION_STORAGE_KEY);
    } catch (error) {
      console.error("Error clearing whiteboard history:", error);
    }
  };

  const clearAndBroadcast = () => {
    clearCanvas();
    const encoder = new TextEncoder();
    const data = encoder.encode(JSON.stringify({ type: "clear" }));
    room.localParticipant.publishData(data, { reliable: true });
  };

  const downloadCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const link = document.createElement("a");
    link.download = `whiteboard-${Date.now()}.png`;
    link.href = canvas.toDataURL();
    link.click();
  };

  useEffect(() => {
    redrawCanvas();
  }, [historyStep]);

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Toolbar - Modern Compact Design */}
      <div className="bg-white/95 backdrop-blur-xl border-b-2 border-gray-300 shadow-sm">
        <div 
          className={`
            max-w-7xl mx-auto transition-all duration-300 ease-in-out
            ${toolbarCollapsed ? 'p-1.5' : 'p-2'}
          `}
        >
          {toolbarCollapsed ? (
            /* Collapsed View */
            <div className="flex items-center gap-1.5 flex-wrap">
              <Button
                size="icon"
                variant="ghost"
                onClick={() => setToolbarCollapsed(false)}
                title="Expand Toolbar"
                className="h-8 w-8 rounded-lg hover:bg-gray-200 border border-gray-400 text-gray-700 transition-colors"
              >
                <ChevronDown className="h-4 w-4 stroke-[2.5]" />
              </Button>
              <div className="w-px h-6 bg-gray-400" />
              <Button
                size="icon"
                variant="ghost"
                onClick={clearAndBroadcast}
                title="Clear"
                className="h-8 w-8 rounded-lg hover:bg-red-100 hover:text-red-700 border border-gray-400 text-gray-700 transition-colors"
              >
                <Trash2 className="h-4 w-4 stroke-[2.5]" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                onClick={downloadCanvas}
                title="Download"
                className="h-8 w-8 rounded-lg hover:bg-green-100 hover:text-green-700 border border-gray-400 text-gray-700 transition-colors"
              >
                <Download className="h-4 w-4 stroke-[2.5]" />
              </Button>
            </div>
          ) : (
            /* Expanded View */
            <div className="flex items-center gap-2 flex-wrap">
              {/* Collapse Button */}
              <Button
                size="icon"
                variant="ghost"
                onClick={() => setToolbarCollapsed(true)}
                title="Collapse Toolbar"
                className="h-8 w-8 rounded-lg hover:bg-gray-200 border border-gray-400 text-gray-700 transition-colors"
              >
                <ChevronUp className="h-4 w-4 stroke-[2.5]" />
              </Button>

              <div className="w-px h-8 bg-gray-400" />

              {/* Drawing Tools */}
              <div className="flex gap-1.5">
                <Button
                  size="icon"
                  variant={tool === "pencil" ? "default" : "ghost"}
                  onClick={() => setTool("pencil")}
                  title="Pencil"
                  className={`h-8 w-8 rounded-lg transition-all border-2 ${
                    tool === "pencil" 
                      ? 'bg-blue-600 hover:bg-blue-700 text-white border-blue-700 shadow-md' 
                      : 'hover:bg-gray-200 border-gray-400 text-gray-700'
                  }`}
                >
                  <Pencil className="h-4 w-4 stroke-[2.5]" />
                </Button>
                <Button
                  size="icon"
                  variant={tool === "eraser" ? "default" : "ghost"}
                  onClick={() => setTool("eraser")}
                  title="Eraser"
                  className={`h-8 w-8 rounded-lg transition-all border-2 ${
                    tool === "eraser" 
                      ? 'bg-blue-600 hover:bg-blue-700 text-white border-blue-700 shadow-md' 
                      : 'hover:bg-gray-200 border-gray-400 text-gray-700'
                  }`}
                >
                  <Eraser className="h-4 w-4 stroke-[2.5]" />
                </Button>
                <Button
                  size="icon"
                  variant={tool === "rectangle" ? "default" : "ghost"}
                  onClick={() => setTool("rectangle")}
                  title="Rectangle"
                  className={`h-8 w-8 rounded-lg transition-all border-2 ${
                    tool === "rectangle" 
                      ? 'bg-blue-600 hover:bg-blue-700 text-white border-blue-700 shadow-md' 
                      : 'hover:bg-gray-200 border-gray-400 text-gray-700'
                  }`}
                >
                  <Square className="h-4 w-4 stroke-[2.5]" />
                </Button>
                <Button
                  size="icon"
                  variant={tool === "circle" ? "default" : "ghost"}
                  onClick={() => setTool("circle")}
                  title="Circle"
                  className={`h-8 w-8 rounded-lg transition-all border-2 ${
                    tool === "circle" 
                      ? 'bg-blue-600 hover:bg-blue-700 text-white border-blue-700 shadow-md' 
                      : 'hover:bg-gray-200 border-gray-400 text-gray-700'
                  }`}
                >
                  <Circle className="h-4 w-4 stroke-[2.5]" />
                </Button>
              </div>

              <div className="w-px h-8 bg-gray-400" />

              {/* Color Picker */}
              <div className="flex items-center gap-1.5">
                <input
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="w-8 h-8 rounded-lg cursor-pointer border-2 border-gray-400 hover:border-gray-600 transition-colors"
                  title="Pick Color"
                />
                <div className="flex gap-1">
                  {["#000000", "#EF4444", "#3B82F6", "#10B981", "#F59E0B", "#8B5CF6"].map((c) => (
                    <button
                      key={c}
                      className={`w-7 h-7 rounded-md transition-all border-2 ${
                        color === c ? 'ring-2 ring-blue-600 ring-offset-1 border-gray-600' : 'border-gray-400 hover:border-gray-600'
                      }`}
                      style={{ backgroundColor: c }}
                      onClick={() => setColor(c)}
                      aria-label={`Color ${c}`}
                    />
                  ))}
                </div>
              </div>

              <div className="w-px h-8 bg-gray-400" />

              {/* Line Width */}
              <div className="flex items-center gap-1.5 bg-gray-100 rounded-lg px-2 py-1 border border-gray-300">
                <input
                  type="range"
                  min="1"
                  max="20"
                  value={lineWidth}
                  onChange={(e) => setLineWidth(Number(e.target.value))}
                  className="w-20 accent-blue-600"
                  title="Line Width"
                />
                <span className="text-xs font-bold text-gray-800 w-6 text-center">{lineWidth}</span>
              </div>

              <div className="w-px h-8 bg-gray-400" />

              {/* History Controls */}
              <div className="flex gap-1.5">
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={undo}
                  disabled={historyStep === 0}
                  title="Undo"
                  className="h-8 w-8 rounded-lg hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed border border-gray-400 text-gray-700 transition-colors"
                >
                  <Undo className="h-4 w-4 stroke-[2.5]" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={redo}
                  disabled={historyStep === history.length}
                  title="Redo"
                  className="h-8 w-8 rounded-lg hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed border border-gray-400 text-gray-700 transition-colors"
                >
                  <Redo className="h-4 w-4 stroke-[2.5]" />
                </Button>
              </div>

              <div className="w-px h-8 bg-gray-400" />

              {/* Actions */}
              <div className="flex gap-1.5">
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={clearAndBroadcast}
                  title="Clear"
                  className="h-8 w-8 rounded-lg hover:bg-red-100 hover:text-red-700 border border-gray-400 text-gray-700 transition-colors"
                >
                  <Trash2 className="h-4 w-4 stroke-[2.5]" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={downloadCanvas}
                  title="Download"
                  className="h-8 w-8 rounded-lg hover:bg-green-100 hover:text-green-700 border border-gray-400 text-gray-700 transition-colors"
                >
                  <Download className="h-4 w-4 stroke-[2.5]" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Canvas */}
      <div className="flex-1 relative">
        <canvas
          ref={canvasRef}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          className="absolute inset-0 cursor-crosshair bg-white touch-none"
        />
      </div>
    </div>
  );
}
