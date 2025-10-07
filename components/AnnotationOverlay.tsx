"use client";

import { useRef, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Pencil, Eraser, Square, Circle, Undo, Redo, Trash2, X, ChevronDown, ChevronUp, Type } from "lucide-react";
import { useRoomContext, useDataChannel } from "@livekit/components-react";

type AnnotationTool = "pencil" | "eraser" | "rectangle" | "circle" | "text";

// Use relative coordinates (0-1 range) instead of absolute pixels
interface RelativePoint {
  x: number; // 0-1 range
  y: number; // 0-1 range
}

interface AnnotationAction {
  tool: AnnotationTool;
  color: string;
  width: number; // This will also be relative (0-1 range)
  points?: RelativePoint[];
  startPoint?: RelativePoint;
  endPoint?: RelativePoint;
  text?: string; // For text annotations
  fontSize?: number; // Relative font size (0-1 range)
}

interface VideoMetrics {
  cssWidth: number;
  cssHeight: number;
  contentWidth: number;
  contentHeight: number;
  offsetX: number;
  offsetY: number;
}

export default function AnnotationOverlay({ onClose, viewOnly = false }: { onClose?: () => void; viewOnly?: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const metricsRef = useRef<VideoMetrics>({
    cssWidth: 0,
    cssHeight: 0,
    contentWidth: 0,
    contentHeight: 0,
    offsetX: 0,
    offsetY: 0,
  });
  const [isDrawing, setIsDrawing] = useState(false);
  const [tool, setTool] = useState<AnnotationTool>("pencil");
  const [color, setColor] = useState("#FF0000");
  const [lineWidth, setLineWidth] = useState(3);
  const [history, setHistory] = useState<AnnotationAction[]>([]);
  const [historyStep, setHistoryStep] = useState(0);
  const [startPoint, setStartPoint] = useState<RelativePoint | null>(null);
  const [screenShareElement, setScreenShareElement] = useState<HTMLVideoElement | null>(null);
  const [toolbarCollapsed, setToolbarCollapsed] = useState(false);
  const [textInput, setTextInput] = useState("");
  const [textInputPosition, setTextInputPosition] = useState<RelativePoint | null>(null);
  const [isTextInputVisible, setIsTextInputVisible] = useState(false);
  const [fontSize, setFontSize] = useState(24);
  const room = useRoomContext();

  // Find the screen share video element
  useEffect(() => {
    const findScreenShareVideo = () => {
      // Look for video elements with screen_share track
      const videos = document.querySelectorAll('video');
      for (const video of videos) {
        // Check if this is a screen share video (LiveKit adds data-lk-source attribute)
        const source = video.getAttribute('data-lk-source');
        if (source === 'screen_share' || source === 'screen_share_audio') {
          setScreenShareElement(video);
          return video;
        }
      }
      
      // Fallback: look for the largest video element (usually the screen share)
      let largestVideo: HTMLVideoElement | null = null;
      let largestArea = 0;
      videos.forEach(video => {
        const area = video.clientWidth * video.clientHeight;
        if (area > largestArea) {
          largestArea = area;
          largestVideo = video;
        }
      });
      
      if (largestVideo) {
        setScreenShareElement(largestVideo);
      }
      
      return largestVideo;
    };

    // Try to find immediately
    const video = findScreenShareVideo();
    
    // If not found, keep trying (screen share might not be active yet)
    if (!video) {
      const interval = setInterval(() => {
        const found = findScreenShareVideo();
        if (found) {
          clearInterval(interval);
        }
      }, 500);
      
      return () => clearInterval(interval);
    }
  }, []);

  // Update canvas size and position to match screen share video
  useEffect(() => {
    if (!screenShareElement || !canvasRef.current || !containerRef.current) return;

    const canvas = canvasRef.current;
    const container = containerRef.current;

    const updateCanvasPosition = () => {
      if (!screenShareElement || !canvas || !container) return;

      const rect = screenShareElement.getBoundingClientRect();
      const cssWidth = rect.width;
      const cssHeight = rect.height;

      // Default metrics assume video fills the element
      let contentWidth = cssWidth;
      let contentHeight = cssHeight;
      let offsetX = 0;
      let offsetY = 0;

      const naturalWidth = screenShareElement.videoWidth;
      const naturalHeight = screenShareElement.videoHeight;

      if (naturalWidth && naturalHeight && cssWidth && cssHeight) {
        // Check object-fit style (default is 'contain' for LiveKit)
        const objectFit = window.getComputedStyle(screenShareElement).objectFit || 'contain';
        
        if (objectFit === 'cover') {
          const scale = Math.max(cssWidth / naturalWidth, cssHeight / naturalHeight);
          contentWidth = naturalWidth * scale;
          contentHeight = naturalHeight * scale;
          offsetX = (cssWidth - contentWidth) / 2;
          offsetY = (cssHeight - contentHeight) / 2;
        } else {
          // 'contain' or 'fill'
          const scale = Math.min(cssWidth / naturalWidth, cssHeight / naturalHeight);
          contentWidth = naturalWidth * scale;
          contentHeight = naturalHeight * scale;
          offsetX = (cssWidth - contentWidth) / 2;
          offsetY = (cssHeight - contentHeight) / 2;
        }
      }

      metricsRef.current = {
        cssWidth,
        cssHeight,
        contentWidth,
        contentHeight,
        offsetX,
        offsetY,
      };

      // Position the container to match the video exactly
      container.style.left = `${rect.left}px`;
      container.style.top = `${rect.top}px`;
      container.style.width = `${cssWidth}px`;
      container.style.height = `${cssHeight}px`;

      const dpr = window.devicePixelRatio || 1;
      canvas.width = cssWidth * dpr;
      canvas.height = cssHeight * dpr;
      canvas.style.width = `${cssWidth}px`;
      canvas.style.height = `${cssHeight}px`;

      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.scale(dpr, dpr);
      }

      redrawCanvas();
    };

    updateCanvasPosition();

    const handleResize = () => updateCanvasPosition();

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(screenShareElement);
    screenShareElement.addEventListener("loadedmetadata", handleResize);
    window.addEventListener("resize", handleResize);
    window.addEventListener("scroll", handleResize, true);

    return () => {
      resizeObserver.disconnect();
      screenShareElement.removeEventListener("loadedmetadata", handleResize);
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("scroll", handleResize, true);
    };
  }, [screenShareElement]);

  // Convert absolute pixel coordinates to relative (0-1 range)
  const toRelative = (x: number, y: number): RelativePoint => {
    const metrics = metricsRef.current;
    const effectiveWidth = metrics.contentWidth || metrics.cssWidth || 1;
    const effectiveHeight = metrics.contentHeight || metrics.cssHeight || 1;

    const normalizedX = (x - metrics.offsetX) / effectiveWidth;
    const normalizedY = (y - metrics.offsetY) / effectiveHeight;

    return {
      x: Math.min(Math.max(normalizedX, 0), 1),
      y: Math.min(Math.max(normalizedY, 0), 1),
    };
  };

  // Convert relative coordinates to absolute pixels within the video content
  const toAbsolute = (point: RelativePoint): { x: number; y: number } => {
    const metrics = metricsRef.current;
    const effectiveWidth = metrics.contentWidth || metrics.cssWidth || 1;
    const effectiveHeight = metrics.contentHeight || metrics.cssHeight || 1;

    return {
      x: metrics.offsetX + point.x * effectiveWidth,
      y: metrics.offsetY + point.y * effectiveHeight,
    };
  };

  // Send annotation data to other participants
  const sendAnnotationData = (action: AnnotationAction) => {
    const encoder = new TextEncoder();
    const data = encoder.encode(JSON.stringify({ type: "annotate", action }));
    room.localParticipant.publishData(data, { reliable: true });
  };

  // Receive annotation data from other participants
  useDataChannel((message) => {
    try {
      const decoder = new TextDecoder();
      const text = decoder.decode(message.payload);
      const data = JSON.parse(text);
      
      if (data.type === "annotate" && canvasRef.current) {
        const action = data.action;
        // Add received action to history
        setHistory(prev => {
          const newHistory = [...prev.slice(0, historyStep), action];
          return newHistory;
        });
        setHistoryStep(prev => prev + 1);
      } else if (data.type === "clearAnnotations") {
        clearCanvas();
      } else if (data.type === "syncAnnotations" && viewOnly) {
        // Receive full annotation history from teacher
        setHistory(data.history || []);
        setHistoryStep(data.historyStep || 0);
      }
    } catch (error) {
      console.error("Error processing annotation message:", error);
    }
  });

  const drawAction = (action: AnnotationAction) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const metrics = metricsRef.current;
    const effectiveWidth = metrics.contentWidth || metrics.cssWidth || canvas.width;
    const absoluteWidth = action.width * effectiveWidth;

    ctx.strokeStyle = action.color;
    ctx.lineWidth = absoluteWidth;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    if (action.tool === "pencil" && action.points) {
      ctx.globalCompositeOperation = "source-over";
      ctx.beginPath();
      action.points.forEach((point, index) => {
        const abs = toAbsolute(point);
        if (index === 0) {
          ctx.moveTo(abs.x, abs.y);
        } else {
          ctx.lineTo(abs.x, abs.y);
        }
      });
      ctx.stroke();
    } else if (action.tool === "eraser" && action.points) {
      ctx.globalCompositeOperation = "destination-out";
      ctx.lineWidth = absoluteWidth * 3;
      ctx.beginPath();
      action.points.forEach((point, index) => {
        const abs = toAbsolute(point);
        if (index === 0) {
          ctx.moveTo(abs.x, abs.y);
        } else {
          ctx.lineTo(abs.x, abs.y);
        }
      });
      ctx.stroke();
      ctx.globalCompositeOperation = "source-over";
    } else if (action.tool === "rectangle" && action.startPoint && action.endPoint) {
      const start = toAbsolute(action.startPoint);
      const end = toAbsolute(action.endPoint);
      const width = end.x - start.x;
      const height = end.y - start.y;
      ctx.strokeRect(start.x, start.y, width, height);
    } else if (action.tool === "circle" && action.startPoint && action.endPoint) {
      const start = toAbsolute(action.startPoint);
      const end = toAbsolute(action.endPoint);
      const radius = Math.sqrt(
        Math.pow(end.x - start.x, 2) +
        Math.pow(end.y - start.y, 2)
      );
      ctx.beginPath();
      ctx.arc(start.x, start.y, radius, 0, 2 * Math.PI);
      ctx.stroke();
    } else if (action.tool === "text" && action.text && action.startPoint) {
      const pos = toAbsolute(action.startPoint);
      const absoluteFontSize = action.fontSize ? action.fontSize * effectiveWidth : 24;
      
      ctx.globalCompositeOperation = "source-over";
      ctx.fillStyle = action.color;
      ctx.font = `${absoluteFontSize}px Arial, sans-serif`;
      ctx.textBaseline = "top";
      
      // Support multi-line text
      const lines = action.text.split('\n');
      lines.forEach((line, index) => {
        ctx.fillText(line, pos.x, pos.y + (index * absoluteFontSize * 1.2));
      });
    }
  };

  const redrawCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.restore();

    history.slice(0, historyStep).forEach((action) => {
      drawAction(action);
    });
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (viewOnly) return; // Don't allow drawing in view-only mode
    e.preventDefault();
    e.stopPropagation();
    
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    let clientX: number, clientY: number;
    if ('touches' in e) {
      const touch = e.touches[0];
      clientX = touch.clientX;
      clientY = touch.clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    // Get position relative to canvas
    const canvasX = clientX - rect.left;
    const canvasY = clientY - rect.top;

    // Convert to relative coordinates (0-1 range)
    const relativePoint = toRelative(canvasX, canvasY);

    // Handle text tool specially
    if (tool === "text") {
      setTextInputPosition(relativePoint);
      setIsTextInputVisible(true);
      setTextInput("");
      return;
    }

    setIsDrawing(true);
    setStartPoint(relativePoint);

    if (tool === "pencil" || tool === "eraser") {
      const metrics = metricsRef.current;
      const effectiveWidth = metrics.contentWidth || metrics.cssWidth || canvas.width;
      const relativeWidth = effectiveWidth ? lineWidth / effectiveWidth : 0;
      
      const action: AnnotationAction = {
        tool,
        color,
        width: relativeWidth,
        points: [relativePoint],
      };
      setHistory([...history.slice(0, historyStep), action]);
      setHistoryStep(historyStep + 1);
    }
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    e.preventDefault();
    e.stopPropagation();

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    let clientX: number, clientY: number;
    if ('touches' in e) {
      const touch = e.touches[0];
      clientX = touch.clientX;
      clientY = touch.clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    // Get position relative to canvas
    const canvasX = clientX - rect.left;
    const canvasY = clientY - rect.top;

    // Convert to relative coordinates (0-1 range)
    const relativePoint = toRelative(canvasX, canvasY);

    if (tool === "pencil" || tool === "eraser") {
      const currentAction = history[historyStep - 1];
      if (currentAction && currentAction.points) {
        currentAction.points.push(relativePoint);
        drawAction(currentAction);
        sendAnnotationData(currentAction);
      }
    } else if ((tool === "rectangle" || tool === "circle") && startPoint) {
      redrawCanvas();
      
      // Store relative line width
      const metrics = metricsRef.current;
      const effectiveWidth = metrics.contentWidth || metrics.cssWidth || canvas.width;
      const relativeWidth = effectiveWidth ? lineWidth / effectiveWidth : 0;
      
      const tempAction: AnnotationAction = {
        tool,
        color,
        width: relativeWidth,
        startPoint,
        endPoint: relativePoint,
      };
      drawAction(tempAction);
    }
  };

  const stopDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    setIsDrawing(false);
    e.preventDefault();
    e.stopPropagation();

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    let clientX: number, clientY: number;
    if ('changedTouches' in e) {
      const touch = e.changedTouches[0];
      clientX = touch.clientX;
      clientY = touch.clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    // Get position relative to canvas
    const canvasX = clientX - rect.left;
    const canvasY = clientY - rect.top;

    // Convert to relative coordinates (0-1 range)
    const relativePoint = toRelative(canvasX, canvasY);

    if ((tool === "rectangle" || tool === "circle") && startPoint) {
      // Store relative line width
      const metrics = metricsRef.current;
      const effectiveWidth = metrics.contentWidth || metrics.cssWidth || canvas.width;
      const relativeWidth = effectiveWidth ? lineWidth / effectiveWidth : 0;
      
      const action: AnnotationAction = {
        tool,
        color,
        width: relativeWidth,
        startPoint,
        endPoint: relativePoint,
      };
      setHistory([...history.slice(0, historyStep), action]);
      setHistoryStep(historyStep + 1);
      sendAnnotationData(action);
    } else if (tool === "pencil" || tool === "eraser") {
      const currentAction = history[historyStep - 1];
      if (currentAction) {
        sendAnnotationData(currentAction);
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

  const handleTextSubmit = () => {
    if (!textInput.trim() || !textInputPosition) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const metrics = metricsRef.current;
    const effectiveWidth = metrics.contentWidth || metrics.cssWidth || canvas.width;
    const relativeFontSize = effectiveWidth ? fontSize / effectiveWidth : 0;

    const action: AnnotationAction = {
      tool: "text",
      color,
      width: 0,
      text: textInput,
      startPoint: textInputPosition,
      fontSize: relativeFontSize,
    };

    setHistory([...history.slice(0, historyStep), action]);
    setHistoryStep(historyStep + 1);
    sendAnnotationData(action);

    // Reset text input
    setTextInput("");
    setTextInputPosition(null);
    setIsTextInputVisible(false);
  };

  const handleTextCancel = () => {
    setTextInput("");
    setTextInputPosition(null);
    setIsTextInputVisible(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
    setHistory([]);
    setHistoryStep(0);
  };

  const clearAndBroadcast = () => {
    clearCanvas();
    const encoder = new TextEncoder();
    const data = encoder.encode(JSON.stringify({ type: "clearAnnotations" }));
    room.localParticipant.publishData(data, { reliable: true });
  };

  useEffect(() => {
    redrawCanvas();
  }, [historyStep]);

  if (!screenShareElement) {
    // In view-only mode, don't show the waiting message
    if (viewOnly) {
      return null;
    }
    
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div className="bg-white rounded-lg p-6 text-center">
          <p className="text-gray-600 mb-4">Waiting for screen share...</p>
          <p className="text-sm text-gray-400">Start screen sharing to enable annotations</p>
          <Button onClick={onClose} className="mt-4">Close</Button>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Positioned container that matches screen share video */}
      <div 
        ref={containerRef}
        className="fixed z-50"
        style={{ pointerEvents: viewOnly ? 'none' : 'none' }}
      >
        {/* Annotation Canvas - transparent background to see screen share */}
        <canvas
          ref={canvasRef}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          className="w-full h-full touch-none"
          style={{ 
            pointerEvents: viewOnly ? 'none' : 'auto',
            cursor: viewOnly ? 'default' : tool === 'text' ? 'text' : 'crosshair'
          }}
        />
      </div>

      {/* Text Input Modal */}
      {isTextInputVisible && textInputPosition && !viewOnly && (
        <div 
          className="fixed z-[65] bg-white/95 backdrop-blur-xl rounded-lg shadow-2xl border-2 border-blue-500 p-4"
          style={{
            left: `${toAbsolute(textInputPosition).x + (metricsRef.current?.offsetX || 0)}px`,
            top: `${toAbsolute(textInputPosition).y + (metricsRef.current?.offsetY || 0)}px`,
            transform: 'translate(10px, 10px)'
          }}
        >
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <label className="text-sm font-semibold text-gray-700">Text:</label>
              <input
                type="number"
                min="12"
                max="72"
                value={fontSize}
                onChange={(e) => setFontSize(Number(e.target.value))}
                className="w-16 px-2 py-1 border border-gray-300 rounded text-sm"
                title="Font Size"
              />
              <span className="text-xs text-gray-500">px</span>
            </div>
            <textarea
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder="Type your text..."
              className="w-64 h-20 px-3 py-2 border-2 border-gray-300 rounded-lg resize-none focus:outline-none focus:border-blue-500"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter' && e.ctrlKey) {
                  handleTextSubmit();
                } else if (e.key === 'Escape') {
                  handleTextCancel();
                }
              }}
            />
            <div className="flex gap-2 justify-end">
              <Button
                size="sm"
                variant="outline"
                onClick={handleTextCancel}
                className="text-gray-700 border-gray-400 hover:bg-gray-100"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleTextSubmit}
                disabled={!textInput.trim()}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                Add Text
              </Button>
            </div>
            <div className="text-xs text-gray-500 text-center">
              Ctrl+Enter to submit • Esc to cancel
            </div>
          </div>
        </div>
      )}

      {/* Toolbar - Only show for teachers, not in view-only mode */}
      {!viewOnly && (
        <div className="fixed top-3 left-1/2 transform -translate-x-1/2 z-[60] max-w-[95vw]">
          {/* Main Toolbar */}
          <div 
            className={`
              bg-white/95 backdrop-blur-xl rounded-xl shadow-lg 
              border-2 border-gray-300 transition-all duration-300 ease-in-out
              ${toolbarCollapsed ? 'p-1.5' : 'p-2'}
            `}
          >
            {toolbarCollapsed ? (
              /* Collapsed View - Just essential buttons */
              <div className="flex items-center gap-1.5">
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
                  title="Clear All"
                  className="h-8 w-8 rounded-lg hover:bg-red-100 hover:text-red-700 border border-gray-400 text-gray-700 transition-colors"
                >
                  <Trash2 className="h-4 w-4 stroke-[2.5]" />
                </Button>
                {onClose && (
                  <>
                    <div className="w-px h-6 bg-gray-400" />
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={onClose}
                      title="Close Annotations"
                      className="h-8 w-8 rounded-lg hover:bg-red-100 hover:text-red-700 border border-gray-400 text-gray-700 transition-colors"
                    >
                      <X className="h-4 w-4 stroke-[2.5]" />
                    </Button>
                  </>
                )}
              </div>
            ) : (
              /* Expanded View - Full toolbar */
              <div className="flex items-center gap-2 flex-wrap justify-center">
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
                  <Button
                    size="icon"
                    variant={tool === "text" ? "default" : "ghost"}
                    onClick={() => setTool("text")}
                    title="Text"
                    className={`h-8 w-8 rounded-lg transition-all border-2 ${
                      tool === "text" 
                        ? 'bg-blue-600 hover:bg-blue-700 text-white border-blue-700 shadow-md' 
                        : 'hover:bg-gray-200 border-gray-400 text-gray-700'
                    }`}
                  >
                    <Type className="h-4 w-4 stroke-[2.5]" />
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
                    {["#FF0000", "#0000FF", "#00FF00", "#FFFF00", "#FF00FF", "#000000"].map((c) => (
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

                {/* Line Width or Font Size based on tool */}
                {tool === "text" ? (
                  <div className="flex items-center gap-1.5 bg-gray-100 rounded-lg px-2 py-1 border border-gray-300">
                    <span className="text-xs font-semibold text-gray-700">Size:</span>
                    <input
                      type="range"
                      min="12"
                      max="72"
                      value={fontSize}
                      onChange={(e) => setFontSize(Number(e.target.value))}
                      className="w-20 accent-blue-600"
                      title="Font Size"
                    />
                    <span className="text-xs font-bold text-gray-800 w-8 text-center">{fontSize}px</span>
                  </div>
                ) : (
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
                )}

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

                {/* Clear */}
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={clearAndBroadcast}
                  title="Clear All"
                  className="h-8 w-8 rounded-lg hover:bg-red-100 hover:text-red-700 border border-gray-400 text-gray-700 transition-colors"
                >
                  <Trash2 className="h-4 w-4 stroke-[2.5]" />
                </Button>

                {/* Close Button */}
                {onClose && (
                  <>
                    <div className="w-px h-8 bg-gray-400" />
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={onClose}
                      title="Close Annotations"
                      className="h-8 w-8 rounded-lg hover:bg-red-100 hover:text-red-700 border border-gray-400 text-gray-700 transition-colors"
                    >
                      <X className="h-4 w-4 stroke-[2.5]" />
                    </Button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
