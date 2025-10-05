"use client";

import { useRef, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Pencil, Eraser, Square, Circle, Undo, Redo, Trash2, X } from "lucide-react";
import { useRoomContext, useDataChannel } from "@livekit/components-react";

type AnnotationTool = "pencil" | "eraser" | "rectangle" | "circle";

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
}

interface VideoMetrics {
  cssWidth: number;
  cssHeight: number;
  contentWidth: number;
  contentHeight: number;
  offsetX: number;
  offsetY: number;
}

export default function AnnotationOverlay({ onClose }: { onClose: () => void }) {
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
        // Add received action to history so it persists
        setHistory(prev => {
          const newHistory = [...prev.slice(0, historyStep), action];
          return newHistory;
        });
        setHistoryStep(prev => prev + 1);
      } else if (data.type === "clearAnnotations") {
        clearCanvas();
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
        style={{ pointerEvents: 'none' }}
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
          className="w-full h-full cursor-crosshair touch-none"
          style={{ pointerEvents: 'auto' }}
        />
      </div>

      {/* Toolbar - responsive design for mobile and desktop */}
      <div className="fixed top-2 left-1/2 transform -translate-x-1/2 bg-white/95 backdrop-blur-sm rounded-lg shadow-lg p-2 z-[60] max-w-[95vw]">
        <div className="flex items-center gap-1.5 flex-wrap justify-center">
          {/* Close Button */}
          <Button
            size="icon"
            variant="destructive"
            onClick={onClose}
            title="Close Annotations"
            className="h-9 w-9 flex-shrink-0"
          >
            <X className="h-4 w-4" />
          </Button>

          {/* Drawing Tools */}
          <div className="flex gap-1 border-r border-gray-300 pr-1.5 flex-shrink-0">
            <Button
              size="icon"
              variant={tool === "pencil" ? "default" : "ghost"}
              onClick={() => setTool("pencil")}
              title="Pencil"
              className="h-9 w-9"
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              size="icon"
              variant={tool === "eraser" ? "default" : "ghost"}
              onClick={() => setTool("eraser")}
              title="Eraser"
              className="h-9 w-9"
            >
              <Eraser className="h-4 w-4" />
            </Button>
            <Button
              size="icon"
              variant={tool === "rectangle" ? "default" : "ghost"}
              onClick={() => setTool("rectangle")}
              title="Rectangle"
              className="h-9 w-9"
            >
              <Square className="h-4 w-4" />
            </Button>
            <Button
              size="icon"
              variant={tool === "circle" ? "default" : "ghost"}
              onClick={() => setTool("circle")}
              title="Circle"
              className="h-9 w-9"
            >
              <Circle className="h-4 w-4" />
            </Button>
          </div>

          {/* Color Picker - Compact on mobile */}
          <div className="flex items-center gap-1.5 border-r border-gray-300 pr-1.5 flex-shrink-0">
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="w-9 h-9 rounded cursor-pointer border-2 border-gray-300"
              title="Pick Color"
            />
            <div className="hidden sm:flex gap-1">
              {["#FF0000", "#0000FF", "#00FF00", "#FFFF00", "#FF00FF"].map((c) => (
                <button
                  key={c}
                  className="w-6 h-6 rounded border-2 border-gray-300 hover:border-gray-500 flex-shrink-0"
                  style={{ backgroundColor: c }}
                  onClick={() => setColor(c)}
                  aria-label={`Color ${c}`}
                />
              ))}
            </div>
          </div>

          {/* Line Width - Hidden on very small screens */}
          <div className="hidden sm:flex items-center gap-2 border-r border-gray-300 pr-1.5 flex-shrink-0">
            <input
              type="range"
              min="1"
              max="20"
              value={lineWidth}
              onChange={(e) => setLineWidth(Number(e.target.value))}
              className="w-20"
            />
            <span className="text-xs text-gray-600 w-7">{lineWidth}px</span>
          </div>

          {/* History Controls */}
          <div className="flex gap-1 border-r border-gray-300 pr-1.5 flex-shrink-0">
            <Button
              size="icon"
              variant="ghost"
              onClick={undo}
              disabled={historyStep === 0}
              title="Undo"
              className="h-9 w-9"
            >
              <Undo className="h-4 w-4" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              onClick={redo}
              disabled={historyStep === history.length}
              title="Redo"
              className="h-9 w-9"
            >
              <Redo className="h-4 w-4" />
            </Button>
          </div>

          {/* Clear */}
          <Button
            size="icon"
            variant="ghost"
            onClick={clearAndBroadcast}
            title="Clear All Annotations"
            className="h-9 w-9 flex-shrink-0"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </>
  );
}
