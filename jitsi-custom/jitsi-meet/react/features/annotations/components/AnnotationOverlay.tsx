import React, { useRef, useState, useEffect, useLayoutEffect } from "react";
import { Button } from "./ui/button";
import { 
  Pencil, 
  Undo, 
  Redo,
  Type, 
  ArrowUpRight,
  Edit,
  Trash2,
  GripVertical,
  X,
  Minimize2,
  Eraser,
  Square,
  Circle,
  MousePointer2,
  Minus,
  Palette,
  ChevronDown
} from "lucide-react";
import { cn } from "../lib/utils";
import { useSelector, useDispatch } from 'react-redux';
import { IReduxState } from '../../app/types';
import { TRACK_REMOVED } from '../../base/tracks/actionTypes';
import { getLocalDesktopTrack } from '../../base/tracks/functions.any';

type AnnotationTool = "pencil" | "text" | "arrow" | "eraser" | "rectangle" | "circle" | "pointer";

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
  author?: string; // Identity of the participant who created this annotation
  id?: string; // Unique ID for this annotation (useful for editing)
}

interface TextBounds {
  id: string;
  bounds: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  controlCirclePos: {
    x: number;
    y: number;
  };
  action: AnnotationAction;
}

interface VideoMetrics {
  cssWidth: number;
  cssHeight: number;
  contentWidth: number;
  contentHeight: number;
  offsetX: number;
  offsetY: number;
}

export default function AnnotationOverlay({ 
  onClose, 
  viewOnly = false, 
  isClosing: externalIsClosing = false,
  isTutor = false 
}: { 
  onClose?: () => void; 
  viewOnly?: boolean; 
  isClosing?: boolean;
  isTutor?: boolean;
}) {
  // Get the conference object from Jitsi's Redux store
  const conference = useSelector((state: IReduxState) => (state as any)['features/base/conference'].conference);
  const localParticipant = useSelector((state: IReduxState) => (state as any)['features/base/participants'].local);
  const dispatch = useDispatch();
  const tracks = useSelector((state: IReduxState) => (state as any)['features/base/tracks']);
  
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
  const [tool, setTool] = useState<AnnotationTool>("pencil"); // Default to pencil for immediate drawing
  const [color, setColor] = useState("#FF0000");
  const [lineWidth, setLineWidth] = useState(3);
  const [history, setHistory] = useState<AnnotationAction[]>([]);
  const [historyStep, setHistoryStep] = useState(0);
  const [remoteActions, setRemoteActions] = useState<AnnotationAction[]>([]); // Separate array for remote actions
  const [startPoint, setStartPoint] = useState<RelativePoint | null>(null);
  const [screenShareElement, setScreenShareElement] = useState<HTMLVideoElement | null>(null);
  const [toolbarVisible, setToolbarVisible] = useState(true); // Control toolbar visibility
  const [toolbarCollapsed, setToolbarCollapsed] = useState(false); // Start expanded
  const [textInput, setTextInput] = useState("");
  const [textInputPosition, setTextInputPosition] = useState<RelativePoint | null>(null);
  const [isTextInputVisible, setIsTextInputVisible] = useState(false);
  const [fontSize, setFontSize] = useState(24);
  const [internalIsClosing, setInternalIsClosing] = useState(false);
  const [editingTextId, setEditingTextId] = useState<string | null>(null); // ID of text being edited
  const [showClearOptions, setShowClearOptions] = useState(false); // For clear options modal
  const [textBounds, setTextBounds] = useState<TextBounds[]>([]); // Store bounds of all text annotations
  const [hoveredControlId, setHoveredControlId] = useState<string | null>(null); // ID of hovered control circle
  const [expandedControlId, setExpandedControlId] = useState<string | null>(null); // ID of expanded control menu
  const [draggingTextId, setDraggingTextId] = useState<string | null>(null); // ID of text being dragged
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number } | null>(null);
  
  // Jitsi room context
  const room = {
    localParticipant: {
      identity: localParticipant?.id || 'local-user'
    }
  };
  
  // Toolbar dragging state
  // Start with bottom-right corner position (professional location)
  const [toolbarPosition, setToolbarPosition] = useState({ 
    x: window.innerWidth - 420, // 420px from right edge (toolbar is ~400px wide + margin)
    y: window.innerHeight - 100 // 100px from bottom
  });
  const [isDraggingToolbar, setIsDraggingToolbar] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const toolbarRef = useRef<HTMLDivElement>(null);
  const [isToolbarPositioned, setIsToolbarPositioned] = useState(false);
  const longPressTimerRef = useRef<number | null>(null);
  const [showDragHint, setShowDragHint] = useState(false);
  const [toolbarOrientation, setToolbarOrientation] = useState<'horizontal' | 'vertical'>('horizontal');
  const lastOrientationChangeRef = useRef<number>(0);
  const orientationDebounceTimeoutRef = useRef<number | null>(null);
  const isOrientationLocked = useRef<boolean>(false);
  const lastUserDragPositionRef = useRef<{ x: number; y: number } | null>(null);
  const snappedEdgeRef = useRef<'left' | 'right' | 'top' | 'bottom' | null>(null); // Track which edge we're snapped to
  const [shouldWrap, setShouldWrap] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const colorPickerRef = useRef<HTMLDivElement>(null);
  const [showSizePicker, setShowSizePicker] = useState(false);
  const sizePickerRef = useRef<HTMLDivElement>(null);
  
  // Zoom detection
  const [zoomLevel, setZoomLevel] = useState(1);
  
  // Use external or internal closing state
  const isClosing = externalIsClosing || internalIsClosing;

  // Handle text dragging
  useEffect(() => {
    if (!draggingTextId || !dragOffset) return;

    const handleMouseMove = (e: MouseEvent) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      
      const rect = canvas.getBoundingClientRect();
      const newX = e.clientX - rect.left - dragOffset.x;
      const newY = e.clientY - rect.top - dragOffset.y;
      
      // Convert to relative coordinates
      const relativePoint = toRelative(newX, newY);
      
      // Update the text action's position
      const allActions = [...history, ...remoteActions];
      const actionIndex = history.findIndex(a => a.id === draggingTextId);
      
      if (actionIndex !== -1) {
        const updatedHistory = [...history];
        updatedHistory[actionIndex] = {
          ...updatedHistory[actionIndex],
          startPoint: relativePoint,
        };
        setHistory(updatedHistory);
        
        // Redraw canvas immediately to show the updated position
        requestAnimationFrame(() => redrawCanvas());
        
        // Broadcast the update
        sendAnnotationData(updatedHistory[actionIndex]);
      } else {
        // It's in remote actions
        const remoteIndex = remoteActions.findIndex(a => a.id === draggingTextId);
        if (remoteIndex !== -1) {
          const updatedRemote = [...remoteActions];
          updatedRemote[remoteIndex] = {
            ...updatedRemote[remoteIndex],
            startPoint: relativePoint,
          };
          setRemoteActions(updatedRemote);
          
          // Redraw canvas immediately to show the updated position
          requestAnimationFrame(() => redrawCanvas());
          
          // Broadcast the update
          sendAnnotationData(updatedRemote[remoteIndex]);
        }
      }
    };

    const handleMouseUp = () => {
      setDraggingTextId(null);
      setDragOffset(null);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [draggingTextId, dragOffset, history, remoteActions]);

  // Define available colors
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

  // Click outside to close color picker
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

  // Click outside to close size picker
  useEffect(() => {
    if (!showSizePicker) return;
    
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.size-picker-container')) {
        setShowSizePicker(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showSizePicker]);

  // Click outside to close clear options
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

  // Find the screen share video element
  useEffect(() => {
    // Don't search for video element if we're closing
    if (isClosing) {
      return;
    }

    const findScreenShareVideo = () => {
      console.log('🎨 Looking for video element...');
      
      // JITSI: Look for large video container first
      const largeVideoElement = document.querySelector('#largeVideo') as HTMLVideoElement;
      if (largeVideoElement && largeVideoElement.videoWidth > 0) {
        console.log('🎨 Found Jitsi #largeVideo element!', largeVideoElement);
        setScreenShareElement(largeVideoElement);
        return largeVideoElement;
      }
      
      console.log('🎨 #largeVideo not found or not ready, trying other methods...');

      // Look for video elements with screen_share track
      const videos = document.querySelectorAll('video');
      console.log('🎨 Found', videos.length, 'video elements');
      
      for (const video of Array.from(videos)) {
        // Check if this is a screen share video (LiveKit adds data-lk-source attribute)
        const source = video.getAttribute('data-lk-source');
        if (source === 'screen_share' || source === 'screen_share_audio') {
          console.log('🎨 Found screen share video!', video);
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
        console.log('🎨 Using largest video element:', largestVideo, 'area:', largestArea);
        setScreenShareElement(largestVideo);
      } else {
        console.log('🎨 No video element found!');
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
  }, [isClosing]);

  // Monitor for screenshare stop - auto-close toolbar and clear annotations
  useEffect(() => {
    const checkScreenShare = () => {
      const desktopTrack = getLocalDesktopTrack(tracks);
      
      // If there's no desktop track and we have a conference, screen share has stopped
      if (!desktopTrack && conference && !isClosing) {
        console.log('🛑 Screen share stopped - closing annotations');
        
        // Clear all annotations
        clearCanvas();
        
        // Close the overlay if onClose is provided
        if (onClose) {
          onClose();
        }
      }
    };

    // Check periodically
    const interval = setInterval(checkScreenShare, 1000);
    
    return () => clearInterval(interval);
  }, [tracks, conference, isClosing, onClose]);

  // Detect browser zoom level
  useEffect(() => {
    const detectZoom = () => {
      // Method 1: Using devicePixelRatio and screen width
      const zoom = window.devicePixelRatio / (window.outerWidth / window.innerWidth);
      
      // Method 2: More reliable - using visualViewport if available
      if (window.visualViewport) {
        const detectedZoom = window.visualViewport.scale;
        setZoomLevel(detectedZoom);
        console.log('🔍 Browser zoom detected:', (detectedZoom * 100).toFixed(0) + '%');
      } else {
        // Fallback: assume no zoom or use devicePixelRatio
        setZoomLevel(1);
      }
    };

    detectZoom();

    // Listen for zoom changes
    window.addEventListener('resize', detectZoom);
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', detectZoom);
      window.visualViewport.addEventListener('scroll', detectZoom);
    }

    return () => {
      window.removeEventListener('resize', detectZoom);
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', detectZoom);
        window.visualViewport.removeEventListener('scroll', detectZoom);
      }
    };
  }, []);

  // Update canvas size and position to match screen share video
  useEffect(() => {
    if (!screenShareElement || !canvasRef.current || !containerRef.current) return;

    const canvas = canvasRef.current;
    const container = containerRef.current;

    const updateCanvasPosition = () => {
      if (!screenShareElement || !canvas || !container) return;

      const rect = screenShareElement.getBoundingClientRect();
      
      // Account for browser zoom level
      const effectiveZoom = window.visualViewport ? window.visualViewport.scale : 1;
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

      // Log zoom-aware metrics for debugging
      console.log('📐 Canvas metrics updated:', {
        cssWidth: cssWidth.toFixed(2),
        cssHeight: cssHeight.toFixed(2),
        contentWidth: contentWidth.toFixed(2),
        contentHeight: contentHeight.toFixed(2),
        offsetX: offsetX.toFixed(2),
        offsetY: offsetY.toFixed(2),
        zoom: effectiveZoom.toFixed(2),
        videoNatural: `${naturalWidth}x${naturalHeight}`,
      });

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
  }, [screenShareElement, zoomLevel]); // Re-run when zoom changes

  // Initialize toolbar position - top center or left middle based on screen dimensions
  useEffect(() => {
    if (!isToolbarPositioned && toolbarRef.current) {
      // Small delay to ensure toolbar has rendered with proper dimensions
      setTimeout(() => {
        if (!toolbarRef.current) return;
        
        const toolbar = toolbarRef.current;
        const toolbarRect = toolbar.getBoundingClientRect();
        const screenWidth = window.innerWidth;
        const screenHeight = window.innerHeight;
        
        let x, y;
        
        // Position based on which dimension is longer
        if (screenWidth > screenHeight) {
          // Landscape: Position at top center (horizontal toolbar)
          setToolbarOrientation('horizontal');
          x = Math.max(20, (screenWidth - toolbarRect.width) / 2);
          y = 80; // Below Jitsi's top bar
        } else {
          // Portrait: Position at left middle (vertical toolbar)
          setToolbarOrientation('vertical');
          x = 20;
          y = Math.max(80, (screenHeight - toolbarRect.height) / 2);
        }
        
        setToolbarPosition({ x, y });
        setIsToolbarPositioned(true);
      }, 100);
    }
  }, [isToolbarPositioned]);

  // Adjust toolbar position after orientation changes to maintain edge snapping
  useEffect(() => {
    if (!isToolbarPositioned || !toolbarRef.current || isDraggingToolbar) return;
    if (!snappedEdgeRef.current) return; // Only adjust if we're snapped to an edge

    // Wait for CSS transition to complete before adjusting position
    const adjustPositionTimeout = setTimeout(() => {
      const toolbar = toolbarRef.current;
      if (!toolbar || !snappedEdgeRef.current) return;

      const screenWidth = window.innerWidth;
      const screenHeight = window.innerHeight;
      const toolbarRect = toolbar.getBoundingClientRect();

      let newPosition = { ...toolbarPosition };

      // Adjust position based on which edge we're snapped to
      switch (snappedEdgeRef.current) {
        case 'right':
          newPosition.x = screenWidth - toolbarRect.width;
          break;
        case 'left':
          newPosition.x = 0;
          break;
        case 'bottom':
          newPosition.y = screenHeight - toolbarRect.height;
          break;
        case 'top':
          newPosition.y = 0;
          break;
      }

      setToolbarPosition(newPosition);
    }, 650); // Wait slightly longer than CSS transition (600ms)

    return () => clearTimeout(adjustPositionTimeout);
  }, [toolbarOrientation, isToolbarPositioned, isDraggingToolbar]);

  // Handle toolbar dragging - Mouse events
  const handleToolbarMouseDown = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    
    // Immediate drag if clicking on drag handle
    if (target.closest('.drag-handle')) {
      e.preventDefault();
      e.stopPropagation();
      setIsDraggingToolbar(true);
      setDragStart({
        x: e.clientX - toolbarPosition.x,
        y: e.clientY - toolbarPosition.y,
      });
      return;
    }
    
    // Check if clicked on a button or input element
    const isButton = target.closest('button') || target.closest('input') || target.closest('select');
    
    if (isButton) {
      // Clicked on button - start long press timer (2 seconds)
      const startX = e.clientX;
      const startY = e.clientY;
      
      longPressTimerRef.current = setTimeout(() => {
        setShowDragHint(true);
        setIsDraggingToolbar(true);
        setDragStart({
          x: startX - toolbarPosition.x,
          y: startY - toolbarPosition.y,
        });
        
        // Hide hint after 1 second
        setTimeout(() => setShowDragHint(false), 1000);
      }, 2000) as unknown as number; // 2 seconds for buttons
    } else {
      // Clicked on empty space - immediate drag
      e.preventDefault();
      e.stopPropagation();
      setIsDraggingToolbar(true);
      setDragStart({
        x: e.clientX - toolbarPosition.x,
        y: e.clientY - toolbarPosition.y,
      });
    }
  };
  
  const handleToolbarMouseUp = (e: React.MouseEvent) => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
      
      // If not dragging, allow the click event to propagate to buttons
      if (!isDraggingToolbar) {
        // Let the button handle its own click
      }
    }
  };

  // Handle toolbar dragging - Touch events
  const handleToolbarTouchStart = (e: React.TouchEvent) => {
    const target = e.target as HTMLElement;
    const touch = e.touches[0];
    
    // Immediate drag if touching drag handle
    if (target.closest('.drag-handle')) {
      e.stopPropagation();
      setIsDraggingToolbar(true);
      setDragStart({
        x: touch.clientX - toolbarPosition.x,
        y: touch.clientY - toolbarPosition.y,
      });
      return;
    }
    
    // Check if touched a button or input element
    const isButton = target.closest('button') || target.closest('input') || target.closest('select');
    
    if (isButton) {
      // Touched button - start long press timer (2 seconds)
      const startX = touch.clientX;
      const startY = touch.clientY;
      
      longPressTimerRef.current = setTimeout(() => {
        setShowDragHint(true);
        setIsDraggingToolbar(true);
        setDragStart({
          x: startX - toolbarPosition.x,
          y: startY - toolbarPosition.y,
        });
        
        // Haptic feedback if available
        if (navigator.vibrate) {
          navigator.vibrate(50);
        }
        
        // Hide hint after 1 second
        setTimeout(() => setShowDragHint(false), 1000);
      }, 2000) as unknown as number; // 2 seconds for buttons
    } else {
      // Touched empty space - immediate drag
      e.stopPropagation();
      setIsDraggingToolbar(true);
      setDragStart({
        x: touch.clientX - toolbarPosition.x,
        y: touch.clientY - toolbarPosition.y,
      });
    }
  };
  
  const handleToolbarTouchEnd = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  // Mouse/Touch move and end handlers
  useEffect(() => {
    if (!isDraggingToolbar) return;

    const updateOrientationBasedOnPosition = (x: number, y: number) => {
      // Skip if orientation is locked
      if (isOrientationLocked.current) {
        return;
      }

      // Strong debounce: prevent orientation changes within 500ms of the last change
      const now = Date.now();
      if (now - lastOrientationChangeRef.current < 500) {
        return;
      }

      const screenWidth = window.innerWidth;
      const screenHeight = window.innerHeight;
      const toolbar = toolbarRef.current;
      const toolbarWidth = toolbar?.offsetWidth || 0;
      const toolbarHeight = toolbar?.offsetHeight || 0;
      
      // Much larger hysteresis: different thresholds for entering vs leaving edge state
      const enterEdgeThreshold = 3; // Must be very close to edge to activate
      // Simpler approach: only change orientation when ENTERING an edge
      // Use tight threshold - must be very close to edge to trigger change
      const edgeThreshold = 3;
      
      // Check if toolbar is actually touching edges
      const touchingLeft = x <= edgeThreshold;
      const touchingRight = x >= screenWidth - toolbarWidth - edgeThreshold;
      const touchingTop = y <= edgeThreshold;
      const touchingBottom = y >= screenHeight - toolbarHeight - edgeThreshold;
      
      let newOrientation = toolbarOrientation; // Keep current by default
      let snapToEdge = false;
      let edgePosition = { x, y };
      
      // Priority 1: Check if touching top or bottom edges -> Horizontal
      if (touchingTop || touchingBottom) {
        newOrientation = 'horizontal';
        snapToEdge = true;
        if (touchingTop) {
          edgePosition.y = 0;
          snappedEdgeRef.current = 'top';
        } else if (touchingBottom) {
          edgePosition.y = screenHeight - toolbarHeight;
          snappedEdgeRef.current = 'bottom';
        }
      }
      // Priority 2: Check if touching left or right edges -> Vertical
      else if (touchingLeft || touchingRight) {
        newOrientation = 'vertical';
        snapToEdge = true;
        if (touchingLeft) {
          edgePosition.x = 0;
          snappedEdgeRef.current = 'left';
        } else if (touchingRight) {
          edgePosition.x = screenWidth - toolbarWidth;
          snappedEdgeRef.current = 'right';
        }
      }
      // Not touching any edge: keep current orientation (this is the key!)
      else {
        snappedEdgeRef.current = null; // Clear edge tracking when not at edge
      }
      
      // Snap to edge if we detected edge contact
      if (snapToEdge && (edgePosition.x !== x || edgePosition.y !== y)) {
        return edgePosition; // Return snapped position
      }
      
      // Only update if orientation actually changed
      if (newOrientation !== toolbarOrientation) {
        // Lock orientation changes for a period
        isOrientationLocked.current = true;
        lastOrientationChangeRef.current = now;
        setToolbarOrientation(newOrientation);
        
        // Unlock after animation completes
        setTimeout(() => {
          isOrientationLocked.current = false;
        }, 600); // Lock for 600ms to allow transition to complete
      }
      
      return null; // No snapping needed
    };

    const handleMouseMove = (e: MouseEvent) => {
      e.preventDefault();
      const newX = e.clientX - dragStart.x;
      const newY = e.clientY - dragStart.y;
      
      // Keep within viewport bounds
      const toolbar = toolbarRef.current;
      if (toolbar) {
        const maxX = window.innerWidth - toolbar.offsetWidth;
        const maxY = window.innerHeight - toolbar.offsetHeight;
        
        const finalX = Math.max(0, Math.min(newX, maxX));
        const finalY = Math.max(0, Math.min(newY, maxY));
        
        // Check for edge snapping and orientation update
        const snappedPosition = updateOrientationBasedOnPosition(finalX, finalY);
        const actualX = snappedPosition?.x ?? finalX;
        const actualY = snappedPosition?.y ?? finalY;
        
        // Mark this position as coming from user drag
        lastUserDragPositionRef.current = { x: actualX, y: actualY };
        
        setToolbarPosition({
          x: actualX,
          y: actualY,
        });
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      const touch = e.touches[0];
      const newX = touch.clientX - dragStart.x;
      const newY = touch.clientY - dragStart.y;
      
      // Keep within viewport bounds
      const toolbar = toolbarRef.current;
      if (toolbar) {
        const maxX = window.innerWidth - toolbar.offsetWidth;
        const maxY = window.innerHeight - toolbar.offsetHeight;
        
        const finalX = Math.max(0, Math.min(newX, maxX));
        const finalY = Math.max(0, Math.min(newY, maxY));
        
        // Check for edge snapping and orientation update
        const snappedPosition = updateOrientationBasedOnPosition(finalX, finalY);
        const actualX = snappedPosition?.x ?? finalX;
        const actualY = snappedPosition?.y ?? finalY;
        
        // Mark this position as coming from user drag
        lastUserDragPositionRef.current = { x: actualX, y: actualY };
        
        setToolbarPosition({
          x: actualX,
          y: actualY,
        });
      }
    };

    const handleEnd = () => {
      setIsDraggingToolbar(false);
      // Clear the drag position tracking after drag ends
      setTimeout(() => {
        lastUserDragPositionRef.current = null;
      }, 200); // Keep it for a short time to allow position effect to run
      
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleEnd);
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleEnd);
    document.addEventListener('touchcancel', handleEnd);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleEnd);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleEnd);
      document.removeEventListener('touchcancel', handleEnd);
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
      }
    };
  }, [isDraggingToolbar, dragStart, toolbarPosition]);

  // Update orientation based on toolbar position (runs whenever position changes)
  useEffect(() => {
    const toolbar = toolbarRef.current;
    if (!toolbar || isDraggingToolbar || isOrientationLocked.current) return; // Skip if dragging or locked

    // CRITICAL: Only check orientation if this position came from user dragging
    // Don't react to position changes caused by orientation changes themselves
    if (!lastUserDragPositionRef.current || 
        (lastUserDragPositionRef.current.x !== toolbarPosition.x || 
         lastUserDragPositionRef.current.y !== toolbarPosition.y)) {
      // Position didn't come from user drag, ignore it
      return;
    }

    const updateOrientation = () => {
      // Strong debounce: prevent orientation changes within 500ms of the last change
      const now = Date.now();
      if (now - lastOrientationChangeRef.current < 500) {
        return;
      }

      const screenWidth = window.innerWidth;
      const screenHeight = window.innerHeight;
      const toolbarWidth = toolbar.offsetWidth;
      const toolbarHeight = toolbar.offsetHeight;
      
      // Much larger hysteresis
      const enterEdgeThreshold = 3;
      const leaveEdgeThreshold = 80;
      
      // Use different threshold based on current orientation
      const useEnterThreshold = (
        (toolbarOrientation === 'horizontal' && (toolbarPosition.x <= enterEdgeThreshold || toolbarPosition.x >= screenWidth - toolbarWidth - enterEdgeThreshold)) ||
        (toolbarOrientation === 'vertical' && (toolbarPosition.y <= enterEdgeThreshold || toolbarPosition.y >= screenHeight - toolbarHeight - enterEdgeThreshold))
      );
      
      const threshold = useEnterThreshold ? enterEdgeThreshold : leaveEdgeThreshold;
      
      // Check if toolbar is touching edges
      const touchingLeft = toolbarPosition.x <= threshold;
      const touchingRight = toolbarPosition.x >= screenWidth - toolbarWidth - threshold;
      const touchingTop = toolbarPosition.y <= threshold;
      const touchingBottom = toolbarPosition.y >= screenHeight - toolbarHeight - threshold;
      
      let newOrientation = toolbarOrientation;
      
      // Priority 1: Check if touching top or bottom edges -> Horizontal
      if (touchingTop || touchingBottom) {
        newOrientation = 'horizontal';
      }
      // Priority 2: Check if touching left or right edges -> Vertical
      else if (touchingLeft || touchingRight) {
        newOrientation = 'vertical';
      }
      // Not touching any edge: keep current orientation
      
      // Only update if orientation actually changed
      if (newOrientation !== toolbarOrientation) {
        // Lock orientation changes for a period
        isOrientationLocked.current = true;
        lastOrientationChangeRef.current = now;
        setToolbarOrientation(newOrientation);
        
        // Unlock after animation completes
        setTimeout(() => {
          isOrientationLocked.current = false;
        }, 600);
      }
    };

    // Use a longer delay to allow toolbar to settle after position change
    if (orientationDebounceTimeoutRef.current) {
      clearTimeout(orientationDebounceTimeoutRef.current);
    }
    
    orientationDebounceTimeoutRef.current = setTimeout(updateOrientation, 150) as unknown as number;
    
    return () => {
      if (orientationDebounceTimeoutRef.current) {
        clearTimeout(orientationDebounceTimeoutRef.current);
      }
    };
  }, [toolbarPosition, isToolbarPositioned, isDraggingToolbar, toolbarOrientation]);

  // Check if wrapping is needed based on available space
  useEffect(() => {
    const toolbar = toolbarRef.current;
    if (!toolbar) return;

    const checkWrapping = () => {
      const screenWidth = window.innerWidth;
      const screenHeight = window.innerHeight;
      const toolbarRect = toolbar.getBoundingClientRect();
      
      // Add margins - don't use 100% of screen
      const horizontalMargin = 40; // 20px on each side
      const verticalMargin = 40; // 20px on each side
      
      const availableWidth = screenWidth - horizontalMargin;
      const availableHeight = screenHeight - verticalMargin;
      
      // Get the natural size of toolbar content (unwrapped)
      // This is a rough estimate - in reality we'd need to measure
      // For now, check if toolbar is too large for available space
      
      if (toolbarOrientation === 'horizontal') {
        // Check if toolbar width exceeds available width
        const needsWrap = toolbarRect.width > availableWidth;
        setShouldWrap(needsWrap);
      } else {
        // Vertical orientation
        const needsWrap = toolbarRect.height > availableHeight;
        setShouldWrap(needsWrap);
      }
    };

    // Check on mount and when orientation/position changes
    checkWrapping();
    
    // Also check on window resize
    window.addEventListener('resize', checkWrapping);
    return () => window.removeEventListener('resize', checkWrapping);
  }, [toolbarOrientation, toolbarPosition, toolbarCollapsed]);

  // Convert absolute pixel coordinates to relative (0-1 range)
  const toRelative = (x: number, y: number): RelativePoint => {
    const metrics = metricsRef.current;
    const effectiveWidth = metrics.contentWidth || metrics.cssWidth || 1;
    const effectiveHeight = metrics.contentHeight || metrics.cssHeight || 1;

    const normalizedX = (x - metrics.offsetX) / effectiveWidth;
    const normalizedY = (y - metrics.offsetY) / effectiveHeight;

    const result = {
      x: Math.min(Math.max(normalizedX, 0), 1),
      y: Math.min(Math.max(normalizedY, 0), 1),
    };

    // Log first few conversions for debugging zoom issues
    if (!viewOnly && Math.random() < 0.1) { // Log 10% of events to avoid spam
      console.log('🎯 toRelative:', { 
        input: {x, y}, 
        metrics: { width: effectiveWidth.toFixed(2), height: effectiveHeight.toFixed(2), offsetX: metrics.offsetX.toFixed(2), offsetY: metrics.offsetY.toFixed(2) },
        output: { x: result.x.toFixed(3), y: result.y.toFixed(3) }
      });
    }

    return result;
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
    if (conference) {
      try {
        const payload = {
          type: 'annotation-data',
          payload: { type: "annotate", action }
        };
        const message = JSON.stringify(payload);
        console.log('📤 Sending annotation:', action);
        console.log('📤 Message string:', message);
        
        // Jitsi standard format: { value: "string" }
        conference.sendCommand('annotation', { value: message });
      } catch (error) {
        console.error('❌ Failed to send annotation:', error);
      }
    } else {
      console.warn('⚠️ No conference available to send annotation');
    }
  };

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
    } else if (action.tool === "arrow" && action.startPoint && action.endPoint) {
      // Draw arrow from start to end point
      const start = toAbsolute(action.startPoint);
      const end = toAbsolute(action.endPoint);
      
      // Draw the line
      ctx.beginPath();
      ctx.moveTo(start.x, start.y);
      ctx.lineTo(end.x, end.y);
      ctx.stroke();
      
      // Draw arrowhead
      const headLength = absoluteWidth * 4; // Length of the arrowhead
      const angle = Math.atan2(end.y - start.y, end.x - start.x);
      
      ctx.beginPath();
      ctx.moveTo(end.x, end.y);
      ctx.lineTo(
        end.x - headLength * Math.cos(angle - Math.PI / 6),
        end.y - headLength * Math.sin(angle - Math.PI / 6)
      );
      ctx.moveTo(end.x, end.y);
      ctx.lineTo(
        end.x - headLength * Math.cos(angle + Math.PI / 6),
        end.y - headLength * Math.sin(angle + Math.PI / 6)
      );
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
      
      // Calculate and store text bounds for control circles
      if (action.id) {
        let maxWidth = 0;
        lines.forEach(line => {
          const width = ctx.measureText(line).width;
          if (width > maxWidth) maxWidth = width;
        });
        
        const textHeight = lines.length * absoluteFontSize * 1.2;
        const controlCircleRadius = 8;
        
        const bounds: TextBounds = {
          id: action.id,
          bounds: {
            x: pos.x,
            y: pos.y,
            width: maxWidth,
            height: textHeight,
          },
          controlCirclePos: {
            x: pos.x + maxWidth + controlCircleRadius,
            y: pos.y - controlCircleRadius,
          },
          action,
        };
        
        // Update text bounds state
        setTextBounds(prev => {
          const filtered = prev.filter(tb => tb.id !== action.id);
          return [...filtered, bounds];
        });
      }
    }
  };

  const redrawCanvas = React.useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.restore();

    // CRITICAL: Draw local actions up to historyStep (for undo/redo)
    history.slice(0, historyStep).forEach((action) => {
      drawAction(action);
    });

    // CRITICAL: Draw ALL remote actions (concurrent drawing support)
    remoteActions.forEach((action) => {
      drawAction(action);
    });
  }, [history, historyStep, remoteActions, drawAction]);

  // Find text annotation at a given point
  const findTextAtPoint = (point: RelativePoint): AnnotationAction | null => {
    const allActions = [...history.slice(0, historyStep), ...remoteActions];
    
    // Search in reverse order (most recent first)
    for (let i = allActions.length - 1; i >= 0; i--) {
      const action = allActions[i];
      if (action.tool === "text" && action.startPoint && action.text) {
        const pos = toAbsolute(action.startPoint);
        const clickPos = toAbsolute(point);
        
        const metrics = metricsRef.current;
        const effectiveWidth = metrics.contentWidth || metrics.cssWidth || 1;
        const absoluteFontSize = action.fontSize ? action.fontSize * effectiveWidth : 24;
        
        // Create a temporary canvas to measure text
        const canvas = canvasRef.current;
        if (!canvas) continue;
        const ctx = canvas.getContext("2d");
        if (!ctx) continue;
        
        ctx.font = `${absoluteFontSize}px Arial, sans-serif`;
        
        // Calculate bounding box for text
        const lines = action.text.split('\n');
        let maxWidth = 0;
        lines.forEach(line => {
          const width = ctx.measureText(line).width;
          if (width > maxWidth) maxWidth = width;
        });
        
        const textHeight = lines.length * absoluteFontSize * 1.2;
        
        // Check if click is within text bounds (with some padding for easier selection)
        const padding = 5;
        if (clickPos.x >= pos.x - padding && 
            clickPos.x <= pos.x + maxWidth + padding &&
            clickPos.y >= pos.y - padding && 
            clickPos.y <= pos.y + textHeight + padding) {
          return action;
        }
      }
    }
    
    return null;
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    console.log('✏️ startDrawing called!', { tool, viewOnly, hasCanvas: !!canvasRef.current });
    if (viewOnly) return; // Don't allow drawing in view-only mode
    e.preventDefault();
    e.stopPropagation();
    
    const canvas = canvasRef.current;
    if (!canvas) {
      console.log('❌ No canvas ref!');
      return;
    }

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
      setEditingTextId(null); // Not editing existing text
      return;
    }

    // Handle pointer tool - check if clicking on existing text
    if (tool === "pointer") {
      const clickedText = findTextAtPoint(relativePoint);
      if (clickedText) {
        // Check if user can edit this text
        const canEdit = isTutor || clickedText.author === room.localParticipant.identity;
        if (canEdit) {
          // Open edit mode
          setTextInputPosition(clickedText.startPoint!);
          setTextInput(clickedText.text || "");
          setFontSize(clickedText.fontSize ? clickedText.fontSize * (metricsRef.current.contentWidth || metricsRef.current.cssWidth || 1) : 24);
          setColor(clickedText.color);
          setIsTextInputVisible(true);
          setEditingTextId(clickedText.id || null);
        }
      }
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
        author: room.localParticipant.identity,
        id: `${room.localParticipant.identity}-${Date.now()}`,
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
    } else if ((tool === "rectangle" || tool === "circle" || tool === "arrow") && startPoint) {
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

    if ((tool === "rectangle" || tool === "circle" || tool === "arrow") && startPoint) {
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
        author: room.localParticipant.identity,
        id: `${room.localParticipant.identity}-${Date.now()}`,
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

    if (editingTextId) {
      // Editing existing text
      const allActions = [...history.slice(0, historyStep), ...remoteActions];
      const editIndex = allActions.findIndex(a => a.id === editingTextId);
      
      if (editIndex !== -1) {
        const updatedAction: AnnotationAction = {
          ...allActions[editIndex],
          text: textInput,
          color,
          fontSize: relativeFontSize,
        };
        
        // Check if it's in history or remote actions
        const historyIndex = history.slice(0, historyStep).findIndex(a => a.id === editingTextId);
        if (historyIndex !== -1) {
          // Update in history
          const newHistory = [...history];
          newHistory[historyIndex] = updatedAction;
          setHistory(newHistory);
        } else {
          // Update in remote actions
          const remoteIndex = remoteActions.findIndex(a => a.id === editingTextId);
          if (remoteIndex !== -1) {
            const newRemoteActions = [...remoteActions];
            newRemoteActions[remoteIndex] = updatedAction;
            setRemoteActions(newRemoteActions);
          }
        }
        
        // Broadcast the update
        sendAnnotationData({ ...updatedAction, tool: "text" });
      }
    } else {
      // Creating new text
      const action: AnnotationAction = {
        tool: "text",
        color,
        width: 0,
        text: textInput,
        startPoint: textInputPosition,
        fontSize: relativeFontSize,
        author: room.localParticipant.identity,
        id: `${room.localParticipant.identity}-${Date.now()}`,
      };

      setHistory([...history.slice(0, historyStep), action]);
      setHistoryStep(historyStep + 1);
      sendAnnotationData(action);
    }

    // Reset text input
    setTextInput("");
    setTextInputPosition(null);
    setIsTextInputVisible(false);
    setEditingTextId(null);
  };

  const handleTextCancel = () => {
    setTextInput("");
    setTextInputPosition(null);
    setIsTextInputVisible(false);
    setEditingTextId(null);
  };

  // Remove the old handleClose function - X button will now use onClose directly
  // This ensures X button and annotation toggle button work exactly the same way

  const clearCanvas = React.useCallback(() => {
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
    setRemoteActions([]); // Clear remote actions too
    setTextBounds([]); // Clear text bounds
  }, []);

  // Receive annotation data from other participants
  useEffect(() => {
    if (!conference) {
      return;
    }
    
    const handleMessage = (values: any, participantId: string) => {
      try {
        
        // Jitsi sends the data in the 'value' property
        const dataString = values.value || values.attributes?.value;
        
        if (!dataString) {
          return;
        }
        
        const message = JSON.parse(dataString);
        if (message.type === 'annotation-data') {
          const payload = message.payload;
          
          if (payload.type === "annotate" && canvasRef.current) {
            const action = payload.action;
        
        // CRITICAL: Store remote actions separately to enable concurrent drawing
        // This prevents remote actions from affecting local undo/redo state
        // Check if this action already exists (by ID) and update it, otherwise add it
        setRemoteActions(prev => {
          const existingIndex = prev.findIndex(a => a.id === action.id);
          if (existingIndex !== -1) {
            // Update existing action (for text edits, drags, etc.)
            const updated = [...prev];
            updated[existingIndex] = action;
            return updated;
          } else {
            // Add new action
            return [...prev, action];
          }
        });
        
        // Redraw entire canvas to properly show the updated state
        // Use requestAnimationFrame for smoother rendering
        requestAnimationFrame(() => {
          if (canvasRef.current) {
            redrawCanvas();
          }
        });
      } else if (payload.type === "clearAnnotations") {
        clearCanvas();
        setRemoteActions([]); // Clear remote actions too
      } else if (payload.type === "clearAnnotationsByType") {
        // Handle selective clear from teacher
        const { authorType, teacherIdentity } = payload;

        if (authorType === "all") {
          setHistory([]);
          setHistoryStep(0);
          setRemoteActions([]);
        } else if (authorType === "teacher") {
          // Remove teacher's drawings using updater functions
          setHistory(prev => prev.filter(a => a.author !== teacherIdentity));
          setHistoryStep(prev => {
            // Recalculate history step after filtering
            setHistory(h => {
              const newStep = Math.min(prev, h.length);
              return h;
            });
            return prev; // This will be updated by the setHistory above
          });
          setRemoteActions(prev => prev.filter(a => a.author !== teacherIdentity));
        } else { // "students"
          // Remove students' drawings (keep teacher's) using updater functions
          setHistory(prev => prev.filter(a => a.author === teacherIdentity));
          setHistoryStep(prev => {
            setHistory(h => {
              const newStep = Math.min(prev, h.length);
              return h;
            });
            return prev;
          });
          setRemoteActions(prev => prev.filter(a => a.author === teacherIdentity));
        }
      } else if (payload.type === "syncAnnotations" && viewOnly) {
        // Receive full annotation history from teacher
        setHistory(payload.history || []);
        setHistoryStep(payload.historyStep || 0);
        setRemoteActions([]); // Clear remote actions when syncing
      } else if (payload.type === "deleteAnnotation") {
        // Handle single annotation deletion
        const { id } = payload;
            setHistory(prev => prev.filter(a => a.id !== id));
            setRemoteActions(prev => prev.filter(a => a.id !== id));
            setTextBounds(prev => prev.filter(tb => tb.id !== id));
          }
        }
      } catch (error) {
        console.error("❌ Error processing annotation message:", error);
      }
    };

    conference.addCommandListener('annotation', handleMessage);
    // console.log('✅ Annotation command listener added');
    
    return () => {
      // console.log('🔴 Removing annotation command listener');
      conference.removeCommandListener('annotation', handleMessage);
    };
  }, [conference, viewOnly, redrawCanvas, clearCanvas]);

  const clearAndBroadcast = () => {
    clearCanvas();
    if (conference) {
      try {
        const message = JSON.stringify({
          type: 'annotation-data',
          payload: { type: "clearAnnotations" }
        });
        conference.sendCommand('annotation', { value: message });
      } catch (error) {
        console.error('Failed to broadcast clear:', error);
      }
    }
  };

  // Clear specific types of drawings (teacher only)
  const clearByAuthor = (authorType: "all" | "teacher" | "students") => {
    const canvas = canvasRef.current;
    if (!canvas || !isTutor) return;

    // Determine which authors to keep based on selection
    let filteredHistory: AnnotationAction[];
    let filteredRemote: AnnotationAction[];

    if (authorType === "all") {
      filteredHistory = [];
      filteredRemote = [];
    } else if (authorType === "teacher") {
      // Remove teacher's drawings (keep students')
      const teacherIdentity = room.localParticipant.identity;
      filteredHistory = history.filter(a => a.author !== teacherIdentity);
      filteredRemote = remoteActions.filter(a => a.author !== teacherIdentity);
    } else { // "students"
      // Remove students' drawings (keep teacher's)
      const teacherIdentity = room.localParticipant.identity;
      filteredHistory = history.filter(a => a.author === teacherIdentity);
      filteredRemote = remoteActions.filter(a => a.author === teacherIdentity);
    }

    setHistory(filteredHistory);
    setHistoryStep(filteredHistory.length);
    setRemoteActions(filteredRemote);
    
    // Update text bounds to match filtered actions
    const allRemainingActions = [...filteredHistory, ...filteredRemote];
    const remainingTextIds = allRemainingActions.map(a => a.id).filter(Boolean);
    setTextBounds(prev => prev.filter(tb => remainingTextIds.includes(tb.id)));

    // Broadcast the selective clear
    if (conference) {
      try {
        const message = JSON.stringify({
          type: 'annotation-data',
          payload: { 
            type: "clearAnnotationsByType", 
            authorType,
            teacherIdentity: room.localParticipant.identity 
          }
        });
        conference.sendCommand('annotation', { value: message });
      } catch (error) {
        console.error('Failed to broadcast selective clear:', error);
      }
    }

    setShowClearOptions(false);
  };

  useEffect(() => {
    redrawCanvas();
  }, [historyStep, history, remoteActions]);

  // CRITICAL: Ensure canvas is initialized and ready for immediate drawing
  useEffect(() => {
    if (!canvasRef.current || !screenShareElement || viewOnly) return;
    
    // Small delay to ensure everything is mounted and sized correctly
    const timer = setTimeout(() => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      
      if (ctx && canvas && canvas.width > 0 && canvas.height > 0) {
        console.log('✅ Annotation canvas initialized and ready for drawing:', {
          width: canvas.width,
          height: canvas.height,
          tool,
          color,
          lineWidth,
        });
        
        // Ensure canvas is cleared and in the correct state
        ctx.save();
        ctx.globalCompositeOperation = "source-over";
        ctx.restore();
        
        // Redraw existing annotations if any
        redrawCanvas();
      } else {
        console.warn('⚠️ Canvas dimensions not ready yet');
      }
    }, 100); // Small delay to ensure DOM is settled
    
    return () => clearTimeout(timer);
  }, [screenShareElement, viewOnly]);

  // Don't render anything if screen share element is not found yet (unless we're closing with animation)
  if (!screenShareElement && !isClosing) {
    return null;
  }

  return (
    <>
      {/* Positioned container that matches screen share video */}
      <div 
        ref={containerRef}
        onClick={(e) => console.log('📦 Container clicked!', e)}
        style={{ 
          position: 'fixed',
          zIndex: 9998, // Just below toolbar (9999)
          pointerEvents: 'none',
          border: '2px solid red' // Debug: make container visible
        }}
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
            pointerEvents: viewOnly || tool === 'pointer' ? 'none' : 'auto',
            cursor: viewOnly ? 'default' : tool === 'pointer' ? 'default' : tool === 'text' ? 'text' : 'crosshair'
          }}
        />
      </div>

      {/* Text Control Circles Overlay */}
      {!viewOnly && tool !== 'pointer' && containerRef.current && (
        <div 
          className="fixed z-[35] pointer-events-none"
          style={{
            left: containerRef.current.style.left,
            top: containerRef.current.style.top,
            width: containerRef.current.style.width,
            height: containerRef.current.style.height,
          }}
        >
          {textBounds.map((textBound) => {
            const canEdit = isTutor || textBound.action.author === room.localParticipant.identity;
            if (!canEdit) return null; // Only show controls for editable text
            
            const isExpanded = expandedControlId === textBound.id;
            const controlSize = 16; // Diameter of main control circle
            
            return (
              <div key={textBound.id}>
                {/* Hover detection area - larger invisible area that encompasses all circles */}
                <div
                  className="absolute pointer-events-auto"
                  style={{
                    left: `${textBound.controlCirclePos.x - 60}px`,
                    top: `${textBound.controlCirclePos.y - 60}px`,
                    width: '120px',
                    height: '120px',
                  }}
                  onMouseEnter={() => setExpandedControlId(textBound.id)}
                  onMouseLeave={() => setExpandedControlId(null)}
                  onTouchStart={(e) => {
                    e.stopPropagation();
                    setExpandedControlId(textBound.id);
                  }}
                >
                  {/* Main control circle */}
                  <div
                    className="absolute cursor-pointer transition-all duration-200"
                    style={{
                      left: `${60 - controlSize / 2}px`,
                      top: `${60 - controlSize / 2}px`,
                      width: `${controlSize}px`,
                      height: `${controlSize}px`,
                    }}
                  >
                    <div
                      className="w-full h-full rounded-full bg-blue-500/80 hover:bg-blue-600/90 border-2 border-white/50 shadow-lg backdrop-blur-sm transition-all"
                      style={{
                        transform: isExpanded ? 'scale(1.2)' : 'scale(1)',
                      }}
                    />
                  </div>
                  
                  {/* Expanded menu circles */}
                  {isExpanded && (
                    <>
                      {/* Edit button */}
                      <div
                        className="absolute cursor-pointer group"
                        style={{
                          left: `${60 - 45}px`,
                          top: `${60 - 5}px`,
                          width: '32px',
                          height: '32px',
                          animation: 'slideIn 0.2s ease-out',
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          const clickedText = textBound.action;
                          setTextInputPosition(clickedText.startPoint!);
                          setTextInput(clickedText.text || "");
                          const metrics = metricsRef.current;
                          const effectiveWidth = metrics.contentWidth || metrics.cssWidth || 1;
                          setFontSize(clickedText.fontSize ? clickedText.fontSize * effectiveWidth : 24);
                          setColor(clickedText.color);
                          setIsTextInputVisible(true);
                          setEditingTextId(clickedText.id || null);
                          setExpandedControlId(null);
                        }}
                        title="Edit Text"
                      >
                        <div className="w-full h-full rounded-full bg-green-500/80 hover:bg-green-600/90 border-2 border-white/50 shadow-lg backdrop-blur-sm flex items-center justify-center transition-all group-hover:scale-110">
                          <Edit className="w-4 h-4 text-white" />
                        </div>
                      </div>
                      
                      {/* Delete button */}
                      <div
                        className="absolute cursor-pointer group"
                        style={{
                          left: `${60 + 5}px`,
                          top: `${60 - 45}px`,
                          width: '32px',
                          height: '32px',
                          animation: 'slideIn 0.25s ease-out',
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          // Remove from history or remote actions
                          setHistory(prev => prev.filter(a => a.id !== textBound.id));
                          setRemoteActions(prev => prev.filter(a => a.id !== textBound.id));
                          setTextBounds(prev => prev.filter(tb => tb.id !== textBound.id));
                          setExpandedControlId(null);
                          
                          // Broadcast deletion
                          if (conference) {
                            try {
                              const message = JSON.stringify({
                                type: 'annotation-data',
                                payload: { 
                                  type: "deleteAnnotation", 
                                  id: textBound.id 
                                }
                              });
                              conference.sendCommand('annotation', { value: message });
                            } catch (error) {
                              console.error('Failed to broadcast deletion:', error);
                            }
                          }
                        }}
                        title="Delete Text"
                      >
                        <div className="w-full h-full rounded-full bg-red-500/80 hover:bg-red-600/90 border-2 border-white/50 shadow-lg backdrop-blur-sm flex items-center justify-center transition-all group-hover:scale-110">
                          <Trash2 className="w-4 h-4 text-white" />
                        </div>
                      </div>
                      
                      {/* Drag button */}
                      <div
                        className="absolute cursor-move group"
                        style={{
                          left: `${60 + 15}px`,
                          top: `${60 + 25}px`,
                          width: '32px',
                          height: '32px',
                          animation: 'slideIn 0.3s ease-out',
                        }}
                        onMouseDown={(e) => {
                          e.stopPropagation();
                          setDraggingTextId(textBound.id);
                          const canvas = canvasRef.current;
                          if (canvas) {
                            const rect = canvas.getBoundingClientRect();
                            setDragOffset({
                              x: e.clientX - rect.left - textBound.bounds.x,
                              y: e.clientY - rect.top - textBound.bounds.y,
                            });
                          }
                          setExpandedControlId(null);
                        }}
                        title="Drag Text"
                      >
                        <div className="w-full h-full rounded-full bg-purple-500/80 hover:bg-purple-600/90 border-2 border-white/50 shadow-lg backdrop-blur-sm flex items-center justify-center transition-all group-hover:scale-110">
                          <GripVertical className="w-4 h-4 text-white" />
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Text Input Overlay - Direct on-screen typing */}
      {isTextInputVisible && textInputPosition && !viewOnly && (
        <div 
          className="fixed z-[45]"
          style={{
            left: `${toAbsolute(textInputPosition).x}px`,
            top: `${toAbsolute(textInputPosition).y}px`,
          }}
        >
          <div className="relative">
            {/* Transparent input that appears directly on screen */}
            <textarea
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder="Type here..."
              className="bg-white/90 backdrop-blur-sm border-2 border-blue-400 text-gray-900 placeholder-gray-500 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none shadow-lg"
              style={{
                fontSize: `${fontSize}px`,
                fontFamily: 'Arial, sans-serif',
                minWidth: '200px',
                minHeight: '40px',
              }}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter' && e.ctrlKey) {
                  handleTextSubmit();
                } else if (e.key === 'Escape') {
                  handleTextCancel();
                }
              }}
            />
            
            {/* Small control buttons below the input */}
            <div className="absolute top-full left-0 mt-2 flex items-center gap-2 bg-black/70 backdrop-blur-xl rounded-lg p-2 border border-white/15">
              <input
                type="number"
                min="12"
                max="72"
                value={fontSize}
                onChange={(e) => setFontSize(Number(e.target.value))}
                className="w-14 px-2 py-1 bg-white/90 border border-white/20 rounded text-gray-900 text-sm font-semibold focus:outline-none focus:ring-1 focus:ring-blue-400"
                title="Font Size"
              />
              <Button
                size="sm"
                variant="ghost"
                onClick={handleTextCancel}
                className="h-7 px-2 text-white hover:bg-white/10 border border-white/20"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleTextSubmit}
                disabled={!textInput.trim()}
                className="h-7 px-3 bg-blue-500/80 hover:bg-blue-600/80 text-white disabled:opacity-50 border border-blue-400/30"
              >
                {editingTextId ? "Update" : "Add"}
              </Button>
            </div>
            
            {/* Helper text */}
            <div className="absolute top-full left-0 mt-16 text-xs text-white/80 bg-black/50 backdrop-blur-sm px-2 py-1 rounded whitespace-nowrap">
              Ctrl+Enter to add • Esc to cancel
            </div>
          </div>
        </div>
      )}

      {/* Toolbar - Zoom-inspired Professional Design with Jitsi Styling */}
      {toolbarVisible && (
        <div 
          ref={toolbarRef}
          style={{
            position: 'fixed',
            left: `${toolbarPosition.x}px`,
            top: `${toolbarPosition.y}px`,
            zIndex: 9999,
            pointerEvents: 'auto',
          }}
          onMouseDown={handleToolbarMouseDown}
          onMouseUp={handleToolbarMouseUp}
          onTouchStart={handleToolbarTouchStart}
          onTouchEnd={handleToolbarTouchEnd}
        >
          {/* Drag Hint */}
          {showDragHint && (
            <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 bg-blue-500/90 text-white px-3 py-1.5 rounded-lg text-sm font-semibold whitespace-nowrap animate-pulse shadow-lg z-[70] border border-blue-400/30">
              ✋ Dragging enabled!
            </div>
          )}
          
          {/* Drag Handle */}
          <div 
            className={cn(
              "drag-handle absolute px-3 py-1 bg-gray-900/90 backdrop-blur-xl border border-gray-600/50 flex items-center gap-1.5 transition-all pointer-events-auto rounded-md",
              isDraggingToolbar ? "cursor-grabbing bg-blue-600/30" : "cursor-grab hover:bg-gray-800/95 hover:border-gray-500",
              toolbarOrientation === 'horizontal' 
                ? "-top-5 left-1/2 transform -translate-x-1/2 rounded-t-md border-b-0" 
                : "-left-5 top-1/2 transform -translate-y-1/2 rounded-l-md border-r-0 flex-col"
            )}
          >
            <GripVertical className={cn(
              "h-3.5 w-3.5 text-gray-300",
              toolbarOrientation === 'vertical' && "rotate-90"
            )} />
          </div>

          {/* Main Toolbar - Zoom-style Professional Design */}
          <div 
            className={cn(
              "backdrop-blur-xl bg-gradient-to-br from-[#1a1d24]/98 to-[#14161b]/98 border border-gray-700/60 rounded-2xl shadow-2xl transition-all",
              toolbarOrientation === 'horizontal' && "max-w-[calc(100vw-40px)]",
              toolbarOrientation === 'vertical' && "max-h-[calc(100vh-40px)]"
            )}
            style={{
              boxShadow: '0 10px 40px rgba(0, 0, 0, 0.7), 0 0 0 1px rgba(255, 255, 255, 0.06) inset, 0 2px 8px rgba(59, 130, 246, 0.15)'
            }}
          >
            <div className={cn(
              "flex items-center gap-1.5 p-3",
              toolbarOrientation === 'vertical' && "flex-col"
            )}>
              
              {/* === MOUSE POINTER TOOL === */}
              <button
                onClick={() => setTool("pointer")}
                title="Select & Move (Pointer)"
                className={cn(
                  "h-11 w-11 rounded-xl transition-all active:scale-95 flex items-center justify-center group border shadow-md",
                  tool === "pointer" 
                    ? 'bg-gradient-to-br from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white shadow-lg shadow-blue-500/40 border-blue-400/60 scale-105' 
                    : 'bg-gradient-to-br from-gray-800/60 to-gray-900/60 hover:from-gray-700/70 hover:to-gray-800/70 text-gray-300 hover:text-white border-gray-600/40 hover:border-gray-500/60 hover:shadow-lg'
                )}
              >
                <MousePointer2 className="h-5 w-5 group-hover:scale-110 transition-transform" />
              </button>

              {/* Divider */}
              <div className={cn(
                "bg-gradient-to-br from-gray-600/30 to-gray-700/20",
                toolbarOrientation === 'horizontal' ? "w-px h-10" : "h-px w-10"
              )} />

              {/* === DRAWING TOOLS GROUP === */}
              <div className={cn(
                "flex gap-1.5",
                toolbarOrientation === 'vertical' && "flex-col"
              )}>
                {/* Pencil/Draw Tool */}
                <button
                  onClick={() => setTool("pencil")}
                  title="Draw (Pencil)"
                  className={cn(
                    "h-11 w-11 rounded-xl transition-all active:scale-95 flex items-center justify-center group border shadow-md",
                    tool === "pencil" 
                      ? 'bg-gradient-to-br from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white shadow-lg shadow-blue-500/40 border-blue-400/60 scale-105' 
                      : 'bg-gradient-to-br from-gray-800/60 to-gray-900/60 hover:from-gray-700/70 hover:to-gray-800/70 text-gray-300 hover:text-white border-gray-600/40 hover:border-gray-500/60 hover:shadow-lg'
                  )}
                >
                  <Pencil className="h-5 w-5 group-hover:scale-110 transition-transform" />
                </button>

                {/* Line/Arrow Tool */}
                <button
                  onClick={() => setTool("arrow")}
                  title="Draw Arrow"
                  className={cn(
                    "h-11 w-11 rounded-xl transition-all active:scale-95 flex items-center justify-center group border shadow-md",
                    tool === "arrow" 
                      ? 'bg-gradient-to-br from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white shadow-lg shadow-blue-500/40 border-blue-400/60 scale-105' 
                      : 'bg-gradient-to-br from-gray-800/60 to-gray-900/60 hover:from-gray-700/70 hover:to-gray-800/70 text-gray-300 hover:text-white border-gray-600/40 hover:border-gray-500/60 hover:shadow-lg'
                  )}
                >
                  <ArrowUpRight className="h-5 w-5 group-hover:scale-110 transition-transform" />
                </button>
              </div>

              {/* Divider */}
              <div className={cn(
                "bg-gradient-to-br from-gray-600/30 to-gray-700/20",
                toolbarOrientation === 'horizontal' ? "w-px h-10" : "h-px w-10"
              )} />

              {/* === SHAPES GROUP === */}
              <div className={cn(
                "flex gap-1.5",
                toolbarOrientation === 'vertical' && "flex-col"
              )}>
                {/* Rectangle Tool */}
                <button
                  onClick={() => setTool("rectangle")}
                  title="Draw Rectangle"
                  className={cn(
                    "h-11 w-11 rounded-xl transition-all active:scale-95 flex items-center justify-center group border shadow-md",
                    tool === "rectangle" 
                      ? 'bg-gradient-to-br from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white shadow-lg shadow-blue-500/40 border-blue-400/60 scale-105' 
                      : 'bg-gradient-to-br from-gray-800/60 to-gray-900/60 hover:from-gray-700/70 hover:to-gray-800/70 text-gray-300 hover:text-white border-gray-600/40 hover:border-gray-500/60 hover:shadow-lg'
                  )}
                >
                  <Square className="h-5 w-5 group-hover:scale-110 transition-transform" />
                </button>

                {/* Circle Tool */}
                <button
                  onClick={() => setTool("circle")}
                  title="Draw Circle"
                  className={cn(
                    "h-11 w-11 rounded-xl transition-all active:scale-95 flex items-center justify-center group border shadow-md",
                    tool === "circle" 
                      ? 'bg-gradient-to-br from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white shadow-lg shadow-blue-500/40 border-blue-400/60 scale-105' 
                      : 'bg-gradient-to-br from-gray-800/60 to-gray-900/60 hover:from-gray-700/70 hover:to-gray-800/70 text-gray-300 hover:text-white border-gray-600/40 hover:border-gray-500/60 hover:shadow-lg'
                  )}
                >
                  <Circle className="h-5 w-5 group-hover:scale-110 transition-transform" />
                </button>

                {/* Text Tool */}
                <button
                  onClick={() => setTool("text")}
                  title="Add Text"
                  className={cn(
                    "h-11 w-11 rounded-xl transition-all active:scale-95 flex items-center justify-center group border shadow-md",
                    tool === "text" 
                      ? 'bg-gradient-to-br from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white shadow-lg shadow-blue-500/40 border-blue-400/60 scale-105' 
                      : 'bg-gradient-to-br from-gray-800/60 to-gray-900/60 hover:from-gray-700/70 hover:to-gray-800/70 text-gray-300 hover:text-white border-gray-600/40 hover:border-gray-500/60 hover:shadow-lg'
                  )}
                >
                  <Type className="h-5 w-5 group-hover:scale-110 transition-transform" />
                </button>
              </div>

              {/* Divider */}
              <div className={cn(
                "bg-gradient-to-br from-gray-600/30 to-gray-700/20",
                toolbarOrientation === 'horizontal' ? "w-px h-10" : "h-px w-10"
              )} />

              {/* === ERASER TOOL === */}
              <button
                onClick={() => setTool("eraser")}
                title="Eraser"
                className={cn(
                  "h-11 w-11 rounded-xl transition-all active:scale-95 flex items-center justify-center group border shadow-md",
                  tool === "eraser" 
                    ? 'bg-gradient-to-br from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white shadow-lg shadow-red-500/40 border-red-400/60 scale-105' 
                    : 'bg-gradient-to-br from-gray-800/60 to-gray-900/60 hover:from-gray-700/70 hover:to-gray-800/70 text-gray-300 hover:text-white border-gray-600/40 hover:border-gray-500/60 hover:shadow-lg'
                )}
              >
                <Eraser className="h-5 w-5 group-hover:scale-110 transition-transform" />
              </button>

              {/* Divider */}
              <div className={cn(
                "bg-gradient-to-br from-gray-600/30 to-gray-700/20",
                toolbarOrientation === 'horizontal' ? "w-px h-10" : "h-px w-10"
              )} />

              {/* === STROKE WIDTH CONTROL === */}
              <div className="relative size-picker-container">
                <button
                  className={cn(
                    "h-11 w-11 rounded-xl transition-all active:scale-95 flex flex-col items-center justify-center gap-0.5 group border shadow-md",
                    showSizePicker
                      ? 'bg-gradient-to-br from-blue-600/20 to-blue-700/20 border-blue-500/60'
                      : 'bg-gradient-to-br from-gray-800/60 to-gray-900/60 hover:from-gray-700/70 hover:to-gray-800/70 border-gray-600/40 hover:border-gray-500/60 hover:shadow-lg'
                  )}
                  onClick={() => setShowSizePicker(!showSizePicker)}
                  title={`Line Width: ${lineWidth}px`}
                  aria-label="Choose line width"
                >
                  <Minus className={cn(
                    "transition-colors",
                    showSizePicker ? "text-blue-400" : "text-gray-300 group-hover:text-white"
                  )} 
                  style={{ 
                    width: `${Math.max(12, Math.min(20, lineWidth * 2))}px`,
                    height: `${Math.max(2, Math.min(4, lineWidth))}px`,
                    strokeWidth: lineWidth
                  }} />
                  <ChevronDown className={cn(
                    "h-3 w-3 transition-all",
                    showSizePicker ? "rotate-180 text-blue-400" : "text-gray-400 group-hover:text-gray-300"
                  )} />
                </button>
                
                {showSizePicker && (
                  <div className={cn(
                    "absolute z-[70] bg-gradient-to-br from-[#1a1d24]/98 to-[#14161b]/98 backdrop-blur-xl border border-gray-600/60 rounded-xl p-4 shadow-2xl min-w-[200px]",
                    toolbarOrientation === 'horizontal' ? "top-full mt-2" : "left-full ml-2"
                  )}>
                    <div className="text-xs text-gray-300 font-semibold mb-3 tracking-wide flex items-center justify-between">
                      <span>STROKE WIDTH</span>
                      <span className="text-blue-400 font-bold">{lineWidth}px</span>
                    </div>
                    
                    {/* Width Presets */}
                    <div className="space-y-2.5 mb-4">
                      {[
                        { value: 1, label: 'Thin', icon: '─' },
                        { value: 3, label: 'Medium', icon: '━' },
                        { value: 5, label: 'Thick', icon: '━' },
                        { value: 8, label: 'Extra Thick', icon: '━' }
                      ].map((preset) => (
                        <button
                          key={preset.value}
                          className={cn(
                            "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all border",
                            lineWidth === preset.value
                              ? 'bg-blue-600/30 border-blue-500/60 text-white shadow-lg shadow-blue-500/20'
                              : 'bg-gray-800/40 border-gray-700/50 text-gray-300 hover:bg-gray-700/50 hover:border-gray-600/60'
                          )}
                          onClick={() => {
                            setLineWidth(preset.value);
                            setShowSizePicker(false);
                          }}
                        >
                          <div 
                            className="flex-1 h-0.5 bg-current rounded-full"
                            style={{ height: `${preset.value}px` }}
                          />
                          <span className="text-xs font-medium whitespace-nowrap">{preset.label}</span>
                        </button>
                      ))}
                    </div>

                    {/* Custom Slider */}
                    <div className="pt-2 border-t border-gray-700/50">
                      <label className="text-xs text-gray-400 mb-2 block">Custom</label>
                      <input
                        type="range"
                        min="1"
                        max="12"
                        value={lineWidth}
                        onChange={(e) => setLineWidth(Number(e.target.value))}
                        className="w-full h-2 bg-gray-700/50 rounded-lg appearance-none cursor-pointer
                          [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 
                          [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-blue-500 
                          [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:shadow-lg
                          [&::-webkit-slider-thumb]:hover:bg-blue-400 [&::-webkit-slider-thumb]:transition-colors
                          [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full 
                          [&::-moz-range-thumb]:bg-blue-500 [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:cursor-pointer"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Divider */}
              <div className={cn(
                "bg-gradient-to-br from-gray-600/30 to-gray-700/20",
                toolbarOrientation === 'horizontal' ? "w-px h-10" : "h-px w-10"
              )} />

              {/* === COLOR PICKER === */}
              <div className="relative color-picker-container">
                <button
                  className={cn(
                    "h-11 w-11 rounded-xl transition-all active:scale-95 flex items-center justify-center border-2 shadow-md group relative overflow-hidden",
                    showColorPicker
                      ? 'border-gray-500/80 scale-105'
                      : 'border-gray-600/50 hover:border-gray-500/70 hover:scale-105'
                  )}
                  style={{ 
                    background: `linear-gradient(135deg, ${color} 0%, ${color}dd 100%)`,
                    boxShadow: `0 4px 16px ${color}50, inset 0 1px 2px rgba(255,255,255,0.1)`
                  }}
                  onClick={() => setShowColorPicker(!showColorPicker)}
                  title={`Color: ${availableColors.find(c => c.value === color)?.label || color}`}
                  aria-label="Choose color"
                >
                  <Palette className="h-5 w-5 text-white drop-shadow-md group-hover:scale-110 transition-transform" />
                </button>
                
                {showColorPicker && (
                  <div className={cn(
                    "absolute z-[70] bg-gradient-to-br from-[#1a1d24]/98 to-[#14161b]/98 backdrop-blur-xl border border-gray-600/60 rounded-xl p-4 shadow-2xl",
                    toolbarOrientation === 'horizontal' ? "top-full mt-2" : "left-full ml-2"
                  )}>
                    <div className="text-xs text-gray-300 font-semibold mb-3 tracking-wide flex items-center gap-2">
                      <Palette className="h-3.5 w-3.5 text-blue-400" />
                      <span>COLOR PALETTE</span>
                    </div>
                    <div className="grid grid-cols-5 gap-2">
                      {availableColors.map((c) => (
                        <button
                          key={c.value}
                          className={cn(
                            "w-11 h-11 rounded-lg transition-all border-2 active:scale-95 flex items-center justify-center group relative overflow-hidden",
                            color === c.value 
                              ? 'ring-2 ring-blue-500 ring-offset-2 ring-offset-[#14161b] border-white/40 scale-105 shadow-xl' 
                              : 'border-gray-600/50 hover:border-gray-400/70 hover:scale-110 shadow-md'
                          )}
                          style={{ 
                            background: `linear-gradient(135deg, ${c.value} 0%, ${c.value}dd 100%)`,
                            boxShadow: color === c.value ? `0 4px 20px ${c.value}70, inset 0 1px 2px rgba(255,255,255,0.15)` : `0 2px 8px ${c.value}30`
                          }}
                          onClick={() => {
                            setColor(c.value);
                            setShowColorPicker(false);
                          }}
                          title={c.label}
                          aria-label={c.label}
                        >
                          {color === c.value && (
                            <div className="w-3 h-3 rounded-full bg-white shadow-lg border border-gray-200" />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Divider */}
              <div className={cn(
                "bg-gradient-to-br from-gray-600/30 to-gray-700/20",
                toolbarOrientation === 'horizontal' ? "w-px h-10" : "h-px w-10"
              )} />

              {/* === UNDO/REDO GROUP === */}
              <div className={cn(
                "flex gap-1.5",
                toolbarOrientation === 'vertical' && "flex-col"
              )}>
                {/* Undo Button */}
                <button
                  onClick={undo}
                  disabled={historyStep === 0}
                  title="Undo (Ctrl+Z)"
                  className={cn(
                    "h-11 w-11 rounded-xl transition-all active:scale-95 flex items-center justify-center group border shadow-md",
                    historyStep === 0
                      ? 'bg-gradient-to-br from-gray-800/30 to-gray-900/30 text-gray-600 border-gray-700/30 cursor-not-allowed opacity-50'
                      : 'bg-gradient-to-br from-gray-800/60 to-gray-900/60 hover:from-gray-700/70 hover:to-gray-800/70 text-gray-300 hover:text-white border-gray-600/40 hover:border-gray-500/60 hover:shadow-lg'
                  )}
                >
                  <Undo className="h-5 w-5 group-hover:scale-110 transition-transform" />
                </button>

                {/* Redo Button */}
                <button
                  onClick={redo}
                  disabled={historyStep >= history.length}
                  title="Redo (Ctrl+Y)"
                  className={cn(
                    "h-11 w-11 rounded-xl transition-all active:scale-95 flex items-center justify-center group border shadow-md",
                    historyStep >= history.length
                      ? 'bg-gradient-to-br from-gray-800/30 to-gray-900/30 text-gray-600 border-gray-700/30 cursor-not-allowed opacity-50'
                      : 'bg-gradient-to-br from-gray-800/60 to-gray-900/60 hover:from-gray-700/70 hover:to-gray-800/70 text-gray-300 hover:text-white border-gray-600/40 hover:border-gray-500/60 hover:shadow-lg'
                  )}
                >
                  <Redo className="h-5 w-5 group-hover:scale-110 transition-transform" />
                </button>
              </div>

              {/* Divider */}
              <div className={cn(
                "bg-gradient-to-br from-gray-600/30 to-gray-700/20",
                toolbarOrientation === 'horizontal' ? "w-px h-10" : "h-px w-10"
              )} />

              {/* === CLEAR ALL BUTTON === */}
              <button
                onClick={() => setShowClearOptions(true)}
                title="Clear All Annotations"
                className="h-11 w-11 rounded-xl transition-all active:scale-95 flex items-center justify-center group border shadow-md
                  bg-gradient-to-br from-gray-800/60 to-gray-900/60 hover:from-red-900/40 hover:to-red-800/40 
                  text-gray-300 hover:text-red-400 border-gray-600/40 hover:border-red-500/60 hover:shadow-lg hover:shadow-red-500/20"
              >
                <Trash2 className="h-5 w-5 group-hover:scale-110 transition-transform" />
              </button>

              {/* Divider */}
              <div className={cn(
                "bg-gradient-to-br from-gray-600/30 to-gray-700/20",
                toolbarOrientation === 'horizontal' ? "w-px h-10" : "h-px w-10"
              )} />

              {/* === CLOSE/MINIMIZE BUTTON === */}
              <button
                onClick={() => setToolbarVisible(false)}
                title="Minimize Toolbar"
                className="h-11 w-11 rounded-xl transition-all active:scale-95 flex items-center justify-center group border shadow-md
                  bg-gradient-to-br from-gray-800/60 to-gray-900/60 hover:from-gray-700/70 hover:to-gray-800/70 
                  text-gray-400 hover:text-gray-200 border-gray-600/40 hover:border-gray-500/60 hover:shadow-lg"
                aria-label="Minimize toolbar"
              >
                <Minimize2 className="h-4.5 w-4.5 group-hover:scale-110 transition-transform" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Clear Options Modal - Zoom-style Confirmation Dialog */}
      {showClearOptions && (
        <div 
          className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => setShowClearOptions(false)}
        >
          <div 
            className="clear-options-container bg-gradient-to-br from-[#1a1d24]/98 to-[#14161b]/98 backdrop-blur-xl border border-gray-600/60 rounded-2xl shadow-2xl p-6 max-w-md mx-4"
            onClick={(e) => e.stopPropagation()}
            style={{
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.8), 0 0 0 1px rgba(255, 255, 255, 0.08) inset'
            }}
          >
            {/* Header */}
            <div className="flex items-center gap-3 mb-4">
              <div className="h-12 w-12 rounded-xl bg-red-500/20 border border-red-500/40 flex items-center justify-center">
                <Trash2 className="h-6 w-6 text-red-400" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Clear Annotations</h3>
                <p className="text-sm text-gray-400">This action cannot be undone</p>
              </div>
            </div>

            {/* Description */}
            <p className="text-gray-300 mb-6 leading-relaxed">
              Are you sure you want to clear all annotations? This will remove all drawings, shapes, and text from the screen for all participants.
            </p>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => setShowClearOptions(false)}
                className="flex-1 px-4 py-3 rounded-xl bg-gradient-to-br from-gray-800/60 to-gray-900/60 hover:from-gray-700/70 hover:to-gray-800/70 text-gray-300 hover:text-white border border-gray-600/40 hover:border-gray-500/60 transition-all active:scale-95 font-medium shadow-md"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  clearCanvas();
                  setShowClearOptions(false);
                }}
                className="flex-1 px-4 py-3 rounded-xl bg-gradient-to-br from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white border border-red-500/50 hover:border-red-400/60 transition-all active:scale-95 font-medium shadow-lg shadow-red-500/30"
              >
                Clear All
              </button>
            </div>
          </div>
        </div>
      )}
      </>
    );
}
