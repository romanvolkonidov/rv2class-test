"use client";

/**
 * Jitsi Annotation Overlay Component
 * 
 * A complete annotation system for Jitsi screen sharing with real-time collaboration.
 * Features device-agnostic coordinates (0-1 range) for consistent annotations across 
 * different screen sizes, resolutions, and zoom levels.
 * 
 * Key Features:
 * - Uses relative coordinates (0-1 range) for device independence
 * - Syncs via Jitsi's data channel (sendEndpointTextMessage)
 * - Automatically detects and overlays on Jitsi's screen share video
 * - Full toolbar with drawing, shapes, text, colors
 * - Collaborative editing with author tracking
 */

import { useRef, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { 
  Pencil, Eraser, Square, Circle, Undo, Redo, Trash2, X, 
  ChevronDown, ChevronUp, Type, MousePointer2, GripVertical 
} from "lucide-react";
import { cn } from "@/lib/utils";

type AnnotationTool = "pointer" | "pencil" | "eraser" | "rectangle" | "circle" | "text";

interface RelativePoint {
  x: number; // 0-1 range
  y: number; // 0-1 range
}

interface AnnotationAction {
  tool: AnnotationTool;
  color: string;
  width: number; // Relative (0-1 range)
  points?: RelativePoint[];
  startPoint?: RelativePoint;
  endPoint?: RelativePoint;
  text?: string;
  fontSize?: number; // Relative (0-1 range)
  author?: string;
  id?: string;
}

interface VideoMetrics {
  cssWidth: number;
  cssHeight: number;
  contentWidth: number;
  contentHeight: number;
  offsetX: number;
  offsetY: number;
}

export default function JitsiAnnotationOverlay({ 
  onClose, 
  viewOnly = false, 
  isClosing: externalIsClosing = false,
  isTutor = false,
  jitsiApi = null
}: { 
  onClose?: () => void; 
  viewOnly?: boolean; 
  isClosing?: boolean;
  isTutor?: boolean;
  jitsiApi?: any;
}) {
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
  const [remoteActions, setRemoteActions] = useState<AnnotationAction[]>([]);
  const [startPoint, setStartPoint] = useState<RelativePoint | null>(null);
  const [screenShareElement, setScreenShareElement] = useState<HTMLVideoElement | null>(null);
  const [toolbarCollapsed, setToolbarCollapsed] = useState(true);
  const [textInput, setTextInput] = useState("");
  const [fontSize, setFontSize] = useState(24);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showClearOptions, setShowClearOptions] = useState(false);
  const [isClosing, setIsClosing] = useState(externalIsClosing);
  const [toolbarPosition, setToolbarPosition] = useState({ x: 0, y: 0 });
  const [toolbarOrientation, setToolbarOrientation] = useState<'horizontal' | 'vertical'>('horizontal');
  const [isToolbarPositioned, setIsToolbarPositioned] = useState(false);
  const [editingTextId, setEditingTextId] = useState<string | null>(null);
  const [editingTextValue, setEditingTextValue] = useState("");
  
  const toolbarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsClosing(externalIsClosing);
  }, [externalIsClosing]);

  // Generate unique ID
  const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  // Get participant identity from Jitsi
  const getLocalParticipantId = () => {
    if (jitsiApi) {
      try {
        const displayName = jitsiApi.getDisplayName();
        return displayName || 'unknown';
      } catch (error) {
        console.error('Error getting participant ID:', error);
      }
    }
    return 'unknown';
  };

  // Send annotation data via Jitsi
  const sendAnnotationData = (action: AnnotationAction) => {
    if (!jitsiApi) {
      console.warn('Jitsi API not available for sending annotations');
      return;
    }

    try {
      const message = JSON.stringify({ type: "annotate", action });
      jitsiApi.executeCommand('sendEndpointTextMessage', '', message);
      console.log('📤 Sent annotation via Jitsi:', action.tool);
    } catch (error) {
      console.error('Error sending annotation data:', error);
    }
  };

  // Broadcast clear command
  const broadcastClear = () => {
    if (!jitsiApi) return;
    try {
      const message = JSON.stringify({ type: "clearAnnotations" });
      jitsiApi.executeCommand('sendEndpointTextMessage', '', message);
    } catch (error) {
      console.error('Error broadcasting clear:', error);
    }
  };

  // Broadcast clear by type
  const broadcastClearByType = (authorType: "all" | "teacher" | "students") => {
    if (!jitsiApi || !isTutor) return;
    try {
      const message = JSON.stringify({ 
        type: "clearAnnotationsByType",
        authorType,
        teacherIdentity: getLocalParticipantId()
      });
      jitsiApi.executeCommand('sendEndpointTextMessage', '', message);
    } catch (error) {
      console.error('Error broadcasting clear by type:', error);
    }
  };

  // Broadcast delete annotation
  const broadcastDeleteAnnotation = (id: string) => {
    if (!jitsiApi) return;
    try {
      const message = JSON.stringify({ type: "deleteAnnotation", id });
      jitsiApi.executeCommand('sendEndpointTextMessage', '', message);
    } catch (error) {
      console.error('Error broadcasting delete:', error);
    }
  };

  // Listen for annotation messages from Jitsi
  useEffect(() => {
    if (!jitsiApi) {
      console.log('⚠️ Jitsi API not available yet for annotations');
      return;
    }

    console.log('👂 Setting up Jitsi annotation message listener');

    const handleEndpointMessage = (participant: any, data: any) => {
      try {
        const message = JSON.parse(data);
        console.log('📥 Received annotation message:', message.type);
        
        if (message.type === "annotate" && canvasRef.current) {
          const action = message.action;
          
          if (action.tool === "text" && action.id) {
            const existingIndex = remoteActions.findIndex(a => a.id === action.id);
            if (existingIndex !== -1) {
              const newRemote = [...remoteActions];
              newRemote[existingIndex] = action;
              setRemoteActions(newRemote);
            } else {
              setRemoteActions(prev => [...prev, action]);
            }
          } else {
            setRemoteActions(prev => [...prev, action]);
          }
          redrawCanvas();
        } else if (message.type === "clearAnnotations") {
          setHistory([]);
          setHistoryStep(0);
          setRemoteActions([]);
          if (canvasRef.current) {
            const ctx = canvasRef.current.getContext("2d");
            if (ctx) {
              ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
            }
          }
        } else if (message.type === "clearAnnotationsByType") {
          const { authorType, teacherIdentity } = message;
          if (authorType === "all") {
            setHistory([]);
            setHistoryStep(0);
            setRemoteActions([]);
          } else {
            const filterByAuthor = (action: AnnotationAction) => {
              if (authorType === "teacher") {
                return action.author !== teacherIdentity;
              } else {
                return action.author === teacherIdentity;
              }
            };
            setHistory(prev => prev.filter(filterByAuthor));
            setRemoteActions(prev => prev.filter(filterByAuthor));
            setHistoryStep(prev => Math.min(prev, history.filter(filterByAuthor).length));
          }
          redrawCanvas();
        } else if (message.type === "deleteAnnotation") {
          const { id } = message;
          setHistory(prev => prev.filter(a => a.id !== id));
          setRemoteActions(prev => prev.filter(a => a.id !== id));
          redrawCanvas();
        }
      } catch (error) {
        console.error('Error processing annotation message:', error);
      }
    };

    jitsiApi.addListener('endpointTextMessageReceived', handleEndpointMessage);

    return () => {
      if (jitsiApi) {
        jitsiApi.removeListener('endpointTextMessageReceived', handleEndpointMessage);
      }
    };
  }, [jitsiApi, remoteActions, history]);

  // Find Jitsi screen share video element
  useEffect(() => {
    if (isClosing) return;

    console.log('🔍 Searching for Jitsi screen share video element...');

    const findScreenShareVideo = () => {
      // Jitsi embeds video in an iframe
      const jitsiIframe = document.querySelector('iframe[name*="jitsi"]') as HTMLIFrameElement;
      
      let videos: NodeListOf<HTMLVideoElement>;
      
      if (jitsiIframe && jitsiIframe.contentDocument) {
        videos = jitsiIframe.contentDocument.querySelectorAll('video');
        console.log(`📺 Found ${videos.length} videos in Jitsi iframe`);
      } else {
        videos = document.querySelectorAll('video');
        console.log(`📺 Found ${videos.length} videos in main document`);
      }
      
      // Look for Jitsi's large video (screen share shows here)
      for (const video of videos) {
        const videoId = video.getAttribute('id');
        const videoClass = video.className;
        
        if (videoId === 'largeVideo' || 
            videoClass.includes('large-video') ||
            videoClass.includes('videocontainer__video')) {
          
          if (video.videoWidth > 0 && video.videoHeight > 0) {
            console.log('✅ Found Jitsi screen share video:', {
              id: videoId,
              class: videoClass,
              size: `${video.videoWidth}x${video.videoHeight}`
            });
            setScreenShareElement(video);
            return video;
          }
        }
      }
      
      // Fallback: find largest video
      let largestVideo: HTMLVideoElement | null = null;
      let largestArea = 0;
      
      videos.forEach((video: HTMLVideoElement) => {
        const area = video.clientWidth * video.clientHeight;
        if (area > largestArea && area > 100000) {
          largestArea = area;
          largestVideo = video;
        }
      });
      
      if (largestVideo) {
        const videoElement = largestVideo as HTMLVideoElement;
        console.log('✅ Found largest video (likely screen share):', {
          size: `${videoElement.clientWidth}x${videoElement.clientHeight}`,
          area: largestArea
        });
        setScreenShareElement(videoElement);
      } else {
        console.log('⚠️ No suitable video found for screen share');
      }
      
      return largestVideo;
    };

    const video = findScreenShareVideo();
    
    if (!video) {
      console.log('⏳ Video not found, will retry every second...');
      const interval = setInterval(() => {
        const found = findScreenShareVideo();
        if (found) {
          clearInterval(interval);
        }
      }, 1000);
      
      return () => clearInterval(interval);
    }
  }, [isClosing]);

  // Update canvas to match video
  useEffect(() => {
    if (!screenShareElement || !canvasRef.current || !containerRef.current) return;

    const canvas = canvasRef.current;
    const container = containerRef.current;

    const updateCanvasPosition = () => {
      if (!screenShareElement || !canvas || !container) return;

      const rect = screenShareElement.getBoundingClientRect();
      const cssWidth = rect.width;
      const cssHeight = rect.height;

      let contentWidth = cssWidth;
      let contentHeight = cssHeight;
      let offsetX = 0;
      let offsetY = 0;

      const naturalWidth = screenShareElement.videoWidth;
      const naturalHeight = screenShareElement.videoHeight;

      if (naturalWidth && naturalHeight && cssWidth && cssHeight) {
        const objectFit = window.getComputedStyle(screenShareElement).objectFit || 'contain';
        const scale = Math.min(cssWidth / naturalWidth, cssHeight / naturalHeight);
        contentWidth = naturalWidth * scale;
        contentHeight = naturalHeight * scale;
        offsetX = (cssWidth - contentWidth) / 2;
        offsetY = (cssHeight - contentHeight) / 2;
      }

      metricsRef.current = { cssWidth, cssHeight, contentWidth, contentHeight, offsetX, offsetY };

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

    const resizeObserver = new ResizeObserver(updateCanvasPosition);
    resizeObserver.observe(screenShareElement);
    screenShareElement.addEventListener("loadedmetadata", updateCanvasPosition);
    window.addEventListener("resize", updateCanvasPosition);
    window.addEventListener("scroll", updateCanvasPosition, true);

    return () => {
      resizeObserver.disconnect();
      screenShareElement.removeEventListener("loadedmetadata", updateCanvasPosition);
      window.removeEventListener("resize", updateCanvasPosition);
      window.removeEventListener("scroll", updateCanvasPosition, true);
    };
  }, [screenShareElement]);

  // Initialize toolbar position
  useEffect(() => {
    if (!isToolbarPositioned && toolbarRef.current) {
      const toolbar = toolbarRef.current;
      const toolbarRect = toolbar.getBoundingClientRect();
      const x = (window.innerWidth - toolbarRect.width) / 2;
      const y = window.innerHeight - toolbarRect.height - 80;
      setToolbarPosition({ x, y });
      setIsToolbarPositioned(true);
    }
  }, [isToolbarPositioned]);

  // Coordinate conversion
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

  const toAbsolute = (point: RelativePoint): { x: number; y: number } => {
    const metrics = metricsRef.current;
    const effectiveWidth = metrics.contentWidth || metrics.cssWidth || 1;
    const effectiveHeight = metrics.contentHeight || metrics.cssHeight || 1;
    return {
      x: metrics.offsetX + point.x * effectiveWidth,
      y: metrics.offsetY + point.y * effectiveHeight,
    };
  };

  const redrawCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const allActions = [...history.slice(0, historyStep), ...remoteActions];

    allActions.forEach((action) => {
      ctx.strokeStyle = action.color;
      ctx.fillStyle = action.color;
      ctx.lineWidth = action.width * 1000;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      if (action.tool === "pencil" && action.points && action.points.length > 0) {
        ctx.beginPath();
        const startAbs = toAbsolute(action.points[0]);
        ctx.moveTo(startAbs.x, startAbs.y);
        action.points.forEach((p) => {
          const abs = toAbsolute(p);
          ctx.lineTo(abs.x, abs.y);
        });
        ctx.stroke();
      } else if (action.tool === "eraser" && action.points && action.points.length > 0) {
        ctx.globalCompositeOperation = "destination-out";
        ctx.lineWidth = action.width * 1000 * 2;
        ctx.beginPath();
        const startAbs = toAbsolute(action.points[0]);
        ctx.moveTo(startAbs.x, startAbs.y);
        action.points.forEach((p) => {
          const abs = toAbsolute(p);
          ctx.lineTo(abs.x, abs.y);
        });
        ctx.stroke();
        ctx.globalCompositeOperation = "source-over";
      } else if (action.tool === "rectangle" && action.startPoint && action.endPoint) {
        const start = toAbsolute(action.startPoint);
        const end = toAbsolute(action.endPoint);
        ctx.strokeRect(start.x, start.y, end.x - start.x, end.y - start.y);
      } else if (action.tool === "circle" && action.startPoint && action.endPoint) {
        const start = toAbsolute(action.startPoint);
        const end = toAbsolute(action.endPoint);
        const radiusX = Math.abs(end.x - start.x) / 2;
        const radiusY = Math.abs(end.y - start.y) / 2;
        const centerX = (start.x + end.x) / 2;
        const centerY = (start.y + end.y) / 2;
        ctx.beginPath();
        ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, 2 * Math.PI);
        ctx.stroke();
      } else if (action.tool === "text" && action.text && action.startPoint) {
        const pos = toAbsolute(action.startPoint);
        const fontSizeValue = (action.fontSize || 0.024) * 1000;
        ctx.font = `${fontSizeValue}px Arial`;
        ctx.fillText(action.text, pos.x, pos.y);
      }
    });
  };

  const getCanvasCoordinates = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    let clientX: number, clientY: number;
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }
    return { x: clientX - rect.left, y: clientY - rect.top };
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (viewOnly) return;
    const { x, y } = getCanvasCoordinates(e);
    const relativePoint = toRelative(x, y);
    
    if (tool === "pointer") {
      const allActions = [...history.slice(0, historyStep), ...remoteActions];
      const textActions = allActions.filter(a => a.tool === "text" && a.id);
      
      for (let i = textActions.length - 1; i >= 0; i--) {
        const action = textActions[i];
        if (!action.startPoint || !action.text) continue;
        const pos = toAbsolute(action.startPoint);
        const fontSizeValue = (action.fontSize || 0.024) * 1000;
        const canvas = canvasRef.current;
        if (!canvas) continue;
        const ctx = canvas.getContext("2d");
        if (!ctx) continue;
        ctx.font = `${fontSizeValue}px Arial`;
        const metrics = ctx.measureText(action.text);
        const textWidth = metrics.width;
        const textHeight = fontSizeValue;
        
        if (x >= pos.x && x <= pos.x + textWidth && y >= pos.y - textHeight && y <= pos.y) {
          const localParticipant = getLocalParticipantId();
          const canEdit = isTutor || action.author === localParticipant;
          if (canEdit) {
            setEditingTextId(action.id || null);
            setEditingTextValue(action.text);
          }
          return;
        }
      }
    }

    setIsDrawing(true);
    setStartPoint(relativePoint);

    if (tool === "pencil" || tool === "eraser") {
      const newAction: AnnotationAction = {
        tool,
        color,
        width: lineWidth / 1000,
        points: [relativePoint],
        author: getLocalParticipantId(),
      };
      setHistory([...history.slice(0, historyStep), newAction]);
      setHistoryStep(historyStep + 1);
    } else if (tool === "text") {
      setTextInput("");
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing || viewOnly) return;
    const { x, y } = getCanvasCoordinates(e);
    const relativePoint = toRelative(x, y);

    if (tool === "pencil" || tool === "eraser") {
      const lastAction = history[historyStep - 1];
      if (lastAction && lastAction.points) {
        lastAction.points.push(relativePoint);
        setHistory([...history]);
        redrawCanvas();
      }
    } else if ((tool === "rectangle" || tool === "circle") && startPoint) {
      redrawCanvas();
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.strokeStyle = color;
      ctx.lineWidth = lineWidth;
      const start = toAbsolute(startPoint);
      const current = { x, y };

      if (tool === "rectangle") {
        ctx.strokeRect(start.x, start.y, current.x - start.x, current.y - start.y);
      } else if (tool === "circle") {
        const radiusX = Math.abs(current.x - start.x) / 2;
        const radiusY = Math.abs(current.y - start.y) / 2;
        const centerX = (start.x + current.x) / 2;
        const centerY = (start.y + current.y) / 2;
        ctx.beginPath();
        ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, 2 * Math.PI);
        ctx.stroke();
      }
    }
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing || viewOnly) return;

    if (tool === "pencil" || tool === "eraser") {
      const lastAction = history[historyStep - 1];
      if (lastAction) {
        sendAnnotationData(lastAction);
      }
    } else if ((tool === "rectangle" || tool === "circle") && startPoint) {
      const { x, y } = getCanvasCoordinates(e);
      const relativeEnd = toRelative(x, y);
      const newAction: AnnotationAction = {
        tool,
        color,
        width: lineWidth / 1000,
        startPoint,
        endPoint: relativeEnd,
        author: getLocalParticipantId(),
      };
      setHistory([...history.slice(0, historyStep), newAction]);
      setHistoryStep(historyStep + 1);
      sendAnnotationData(newAction);
      redrawCanvas();
    }

    setIsDrawing(false);
    setStartPoint(null);
  };

  const handleTextSubmit = () => {
    if (!textInput.trim() || !startPoint || viewOnly) return;
    const newAction: AnnotationAction = {
      tool: "text",
      color,
      width: lineWidth / 1000,
      text: textInput,
      fontSize: fontSize / 1000,
      startPoint,
      author: getLocalParticipantId(),
      id: generateId(),
    };
    setHistory([...history.slice(0, historyStep), newAction]);
    setHistoryStep(historyStep + 1);
    sendAnnotationData(newAction);
    setTextInput("");
    setStartPoint(null);
    redrawCanvas();
  };

  const handleUndo = () => {
    if (historyStep > 0) {
      setHistoryStep(historyStep - 1);
      redrawCanvas();
    }
  };

  const handleRedo = () => {
    if (historyStep < history.length) {
      setHistoryStep(historyStep + 1);
      redrawCanvas();
    }
  };

  const handleClear = () => {
    setHistory([]);
    setHistoryStep(0);
    setRemoteActions([]);
    broadcastClear();
    redrawCanvas();
  };

  const handleClearByType = (type: "all" | "teacher" | "students") => {
    if (!isTutor) return;
    const localParticipant = getLocalParticipantId();
    if (type === "all") {
      handleClear();
    } else {
      const filterByAuthor = (action: AnnotationAction) => {
        if (type === "teacher") {
          return action.author !== localParticipant;
        } else {
          return action.author === localParticipant;
        }
      };
      setHistory(prev => prev.filter(filterByAuthor));
      setRemoteActions(prev => prev.filter(filterByAuthor));
      setHistoryStep(prev => Math.min(prev, history.filter(filterByAuthor).length));
    }
    broadcastClearByType(type);
    redrawCanvas();
    setShowClearOptions(false);
  };

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      if (onClose) onClose();
    }, 300);
  };

  const availableColors = [
    { value: "#FF0000", label: "Red" },
    { value: "#00FF00", label: "Green" },
    { value: "#0000FF", label: "Blue" },
    { value: "#FFFF00", label: "Yellow" },
    { value: "#FF00FF", label: "Magenta" },
    { value: "#00FFFF", label: "Cyan" },
    { value: "#FFA500", label: "Orange" },
    { value: "#800080", label: "Purple" },
    { value: "#FFFFFF", label: "White" },
    { value: "#000000", label: "Black" },
  ];

  useEffect(() => {
    if (!showColorPicker) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.color-picker-container')) {
        setShowColorPicker(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showColorPicker]);

  useEffect(() => {
    if (!showClearOptions) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.clear-options-container')) {
        setShowClearOptions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showClearOptions]);

  return (
    <>
      {/* Canvas Overlay */}
      <div
        ref={containerRef}
        className={cn(
          "fixed pointer-events-auto z-[9998] transition-opacity duration-300",
          isClosing && "opacity-0"
        )}
      >
        <canvas
          ref={canvasRef}
          className="absolute inset-0 cursor-crosshair"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onTouchStart={handleMouseDown}
          onTouchMove={handleMouseMove}
          onTouchEnd={handleMouseUp}
        />
      </div>

      {/* Toolbar */}
      <div
        ref={toolbarRef}
        className={cn(
          "fixed z-[9999] transition-all duration-300",
          isClosing && "opacity-0 scale-95"
        )}
        style={{
          left: `${toolbarPosition.x}px`,
          top: `${toolbarPosition.y}px`,
        }}
      >
        <div className={cn(
          "bg-gray-900/95 backdrop-blur-sm rounded-xl shadow-2xl p-2 border-2 border-gray-700",
          toolbarOrientation === 'horizontal' ? 'flex flex-row items-center gap-2' : 'flex flex-col items-center gap-2'
        )}>
          {/* Collapse/Expand */}
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setToolbarCollapsed(!toolbarCollapsed)}
            className="text-gray-300 hover:text-white"
          >
            {toolbarCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </Button>

          {!toolbarCollapsed && (
            <>
              {/* Tools */}
              <div className={cn(
                "flex gap-1",
                toolbarOrientation === 'horizontal' ? 'flex-row' : 'flex-col'
              )}>
                <Button size="sm" variant={tool === "pointer" ? "default" : "ghost"} onClick={() => setTool("pointer")} title="Pointer">
                  <MousePointer2 className="w-4 h-4" />
                </Button>
                <Button size="sm" variant={tool === "pencil" ? "default" : "ghost"} onClick={() => setTool("pencil")} title="Pencil">
                  <Pencil className="w-4 h-4" />
                </Button>
                <Button size="sm" variant={tool === "eraser" ? "default" : "ghost"} onClick={() => setTool("eraser")} title="Eraser">
                  <Eraser className="w-4 h-4" />
                </Button>
                <Button size="sm" variant={tool === "rectangle" ? "default" : "ghost"} onClick={() => setTool("rectangle")} title="Rectangle">
                  <Square className="w-4 h-4" />
                </Button>
                <Button size="sm" variant={tool === "circle" ? "default" : "ghost"} onClick={() => setTool("circle")} title="Circle">
                  <Circle className="w-4 h-4" />
                </Button>
                <Button size="sm" variant={tool === "text" ? "default" : "ghost"} onClick={() => setTool("text")} title="Text">
                  <Type className="w-4 h-4" />
                </Button>
              </div>

              {/* Color Picker */}
              <div className="relative color-picker-container">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowColorPicker(!showColorPicker)}
                  className="w-8 h-8 p-0 rounded-full border-2 border-white"
                  style={{ backgroundColor: color }}
                  title="Color"
                />
                {showColorPicker && (
                  <div className="absolute bottom-full mb-2 bg-gray-800 p-2 rounded-lg shadow-xl grid grid-cols-5 gap-1">
                    {availableColors.map((c) => (
                      <button
                        key={c.value}
                        onClick={() => {
                          setColor(c.value);
                          setShowColorPicker(false);
                        }}
                        className="w-6 h-6 rounded-full border-2 border-white hover:scale-110 transition-transform"
                        style={{ backgroundColor: c.value }}
                        title={c.label}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Actions */}
              <Button size="sm" variant="ghost" onClick={handleUndo} disabled={historyStep === 0} title="Undo">
                <Undo className="w-4 h-4" />
              </Button>
              <Button size="sm" variant="ghost" onClick={handleRedo} disabled={historyStep === history.length} title="Redo">
                <Redo className="w-4 h-4" />
              </Button>

              {/* Clear */}
              {isTutor ? (
                <div className="relative clear-options-container">
                  <Button size="sm" variant="ghost" onClick={() => setShowClearOptions(!showClearOptions)} className="text-red-400 hover:text-red-300" title="Clear Options">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                  {showClearOptions && (
                    <div className="absolute bottom-full mb-2 bg-gray-800 p-2 rounded-lg shadow-xl flex flex-col gap-1 min-w-[120px]">
                      <Button size="sm" variant="ghost" onClick={() => handleClearByType("all")} className="text-red-400 hover:text-red-300 justify-start">
                        Clear All
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => handleClearByType("teacher")} className="text-blue-400 hover:text-blue-300 justify-start">
                        Clear Mine
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => handleClearByType("students")} className="text-yellow-400 hover:text-yellow-300 justify-start">
                        Clear Students
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                <Button size="sm" variant="ghost" onClick={handleClear} className="text-red-400 hover:text-red-300" title="Clear">
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </>
          )}

          {/* Close */}
          {onClose && (
            <Button size="sm" variant="ghost" onClick={handleClose} className="text-gray-400 hover:text-white" title="Close">
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Text Input Modal */}
      {tool === "text" && startPoint && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/50">
          <div className="bg-white p-6 rounded-lg shadow-2xl w-96">
            <h3 className="text-lg font-semibold mb-4">Add Text</h3>
            <input
              type="text"
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && e.ctrlKey) {
                  handleTextSubmit();
                } else if (e.key === "Escape") {
                  setStartPoint(null);
                  setTextInput("");
                }
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-4"
              placeholder="Enter text..."
              autoFocus
            />
            <div className="flex gap-2">
              <Button onClick={handleTextSubmit} className="flex-1">Submit (Ctrl+Enter)</Button>
              <Button variant="outline" onClick={() => { setStartPoint(null); setTextInput(""); }} className="flex-1">Cancel (Esc)</Button>
            </div>
          </div>
        </div>
      )}

      {/* Text Edit Modal */}
      {editingTextId && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/50">
          <div className="bg-white p-6 rounded-lg shadow-2xl w-96">
            <h3 className="text-lg font-semibold mb-4">Edit Text</h3>
            <input
              type="text"
              value={editingTextValue}
              onChange={(e) => setEditingTextValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && e.ctrlKey) {
                  const localIndex = history.findIndex(a => a.id === editingTextId);
                  const remoteIndex = remoteActions.findIndex(a => a.id === editingTextId);
                  if (localIndex !== -1) {
                    const updatedHistory = [...history];
                    updatedHistory[localIndex] = { ...updatedHistory[localIndex], text: editingTextValue };
                    setHistory(updatedHistory);
                    sendAnnotationData(updatedHistory[localIndex]);
                  } else if (remoteIndex !== -1) {
                    const updatedRemote = [...remoteActions];
                    updatedRemote[remoteIndex] = { ...updatedRemote[remoteIndex], text: editingTextValue };
                    setRemoteActions(updatedRemote);
                    sendAnnotationData(updatedRemote[remoteIndex]);
                  }
                  setEditingTextId(null);
                  setEditingTextValue("");
                  redrawCanvas();
                } else if (e.key === "Escape") {
                  setEditingTextId(null);
                  setEditingTextValue("");
                }
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-4"
              autoFocus
            />
            <div className="flex gap-2">
              <Button onClick={() => {
                const localIndex = history.findIndex(a => a.id === editingTextId);
                const remoteIndex = remoteActions.findIndex(a => a.id === editingTextId);
                if (localIndex !== -1) {
                  const updatedHistory = [...history];
                  updatedHistory[localIndex] = { ...updatedHistory[localIndex], text: editingTextValue };
                  setHistory(updatedHistory);
                  sendAnnotationData(updatedHistory[localIndex]);
                } else if (remoteIndex !== -1) {
                  const updatedRemote = [...remoteActions];
                  updatedRemote[remoteIndex] = { ...updatedRemote[remoteIndex], text: editingTextValue };
                  setRemoteActions(updatedRemote);
                  sendAnnotationData(updatedRemote[remoteIndex]);
                }
                setEditingTextId(null);
                setEditingTextValue("");
                redrawCanvas();
              }} className="flex-1">Save</Button>
              <Button variant="destructive" onClick={() => {
                setHistory(prev => prev.filter(a => a.id !== editingTextId));
                setRemoteActions(prev => prev.filter(a => a.id !== editingTextId));
                broadcastDeleteAnnotation(editingTextId);
                setEditingTextId(null);
                setEditingTextValue("");
                redrawCanvas();
              }}>Delete</Button>
              <Button variant="outline" onClick={() => {
                setEditingTextId(null);
                setEditingTextValue("");
              }}>Cancel</Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
