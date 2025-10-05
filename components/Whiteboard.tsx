"use client";

import { useRef, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Pencil, Eraser, Square, Circle, Type, Undo, Redo, Trash2, Download } from "lucide-react";
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
  const room = useRoomContext();

  // Send drawing data to other participants
  const sendDrawingData = (action: DrawingAction) => {
    const encoder = new TextEncoder();
    const data = encoder.encode(JSON.stringify({ type: "draw", action }));
    room.localParticipant.publishData(data, { reliable: true });
  };

  // Receive drawing data from other participants
  useDataChannel((message) => {
    try {
      const decoder = new TextDecoder();
      const text = decoder.decode(message.payload);
      const data = JSON.parse(text);
      
      if (data.type === "draw" && canvasRef.current) {
        drawAction(data.action);
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

    // Set canvas size
    const resize = () => {
      const container = canvas.parentElement;
      if (container) {
        canvas.width = container.clientWidth;
        canvas.height = container.clientHeight;
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
      setHistory([...history.slice(0, historyStep), action]);
      setHistoryStep(historyStep + 1);
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
      const currentAction = history[historyStep - 1];
      if (currentAction && currentAction.points) {
        currentAction.points.push(point);
        drawAction(currentAction);
        sendDrawingData(currentAction);
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
    } else if (tool === "pencil" || tool === "eraser") {
      const currentAction = history[historyStep - 1];
      if (currentAction) {
        sendDrawingData(currentAction);
      }
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
    <div className="h-full flex flex-col bg-gray-100">
      {/* Toolbar */}
      <div className="bg-white border-b border-gray-200 p-3 shadow-sm">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Drawing Tools */}
          <div className="flex gap-1 border-r pr-2">
            <Button
              size="icon"
              variant={tool === "pencil" ? "default" : "ghost"}
              onClick={() => setTool("pencil")}
              title="Pencil"
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              size="icon"
              variant={tool === "eraser" ? "default" : "ghost"}
              onClick={() => setTool("eraser")}
              title="Eraser"
            >
              <Eraser className="h-4 w-4" />
            </Button>
            <Button
              size="icon"
              variant={tool === "rectangle" ? "default" : "ghost"}
              onClick={() => setTool("rectangle")}
              title="Rectangle"
            >
              <Square className="h-4 w-4" />
            </Button>
            <Button
              size="icon"
              variant={tool === "circle" ? "default" : "ghost"}
              onClick={() => setTool("circle")}
              title="Circle"
            >
              <Circle className="h-4 w-4" />
            </Button>
          </div>

          {/* Color Picker */}
          <div className="flex items-center gap-2 border-r pr-2">
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="w-10 h-10 rounded cursor-pointer"
            />
            <div className="flex gap-1">
              {["#000000", "#EF4444", "#3B82F6", "#10B981", "#F59E0B"].map((c) => (
                <button
                  key={c}
                  className="w-6 h-6 rounded border-2 border-gray-300 hover:border-gray-500"
                  style={{ backgroundColor: c }}
                  onClick={() => setColor(c)}
                />
              ))}
            </div>
          </div>

          {/* Line Width */}
          <div className="flex items-center gap-2 border-r pr-2">
            <input
              type="range"
              min="1"
              max="20"
              value={lineWidth}
              onChange={(e) => setLineWidth(Number(e.target.value))}
              className="w-24"
            />
            <span className="text-sm text-gray-600 w-8">{lineWidth}px</span>
          </div>

          {/* History Controls */}
          <div className="flex gap-1 border-r pr-2">
            <Button
              size="icon"
              variant="ghost"
              onClick={undo}
              disabled={historyStep === 0}
              title="Undo"
            >
              <Undo className="h-4 w-4" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              onClick={redo}
              disabled={historyStep === history.length}
              title="Redo"
            >
              <Redo className="h-4 w-4" />
            </Button>
          </div>

          {/* Actions */}
          <div className="flex gap-1">
            <Button
              size="icon"
              variant="ghost"
              onClick={clearAndBroadcast}
              title="Clear"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              onClick={downloadCanvas}
              title="Download"
            >
              <Download className="h-4 w-4" />
            </Button>
          </div>
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
