"use client";

import { Tldraw } from 'tldraw';
import 'tldraw/tldraw.css';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useEffect } from 'react';

interface TldrawWhiteboardProps {
  roomId: string;
  onClose: () => void;
}

export default function TldrawWhiteboard({ roomId, onClose }: TldrawWhiteboardProps) {
  // Prevent body scroll when whiteboard is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  return (
    <div 
      className="fixed inset-0 z-50 bg-white flex flex-col"
      style={{ 
        touchAction: 'none', // Prevent default touch behaviors
        WebkitTouchCallout: 'none', // Prevent iOS callout
        userSelect: 'none'
      }}
    >
      {/* Header with close button */}
      <div className="flex-shrink-0 h-14 bg-white border-b border-gray-200 flex items-center justify-between px-4 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-800">
          Collaborative Whiteboard
        </h2>
        <Button
          onClick={onClose}
          variant="ghost"
          size="icon"
          className="hover:bg-gray-100"
        >
          <X className="w-5 h-5" />
        </Button>
      </div>

      {/* tldraw canvas - flex-1 takes remaining space */}
      <div 
        className="flex-1 overflow-hidden relative"
        style={{
          touchAction: 'none', // Allow tldraw to handle all touch events
        }}
      >
        <Tldraw
          persistenceKey={`rv2class-${roomId}`}
          autoFocus
          // Force toolbar to be visible
          inferDarkMode={false}
        />
      </div>
      
      {/* Add custom CSS to ensure toolbar is always visible */}
      <style jsx global>{`
        .tldraw {
          --color-background: white !important;
        }
        
        /* Ensure toolbar is always visible and touchable */
        .tlui-toolbar,
        .tlui-toolbar__tools,
        .tlui-button {
          pointer-events: auto !important;
          touch-action: manipulation !important;
        }
        
        /* Increase touch target size for mobile */
        .tlui-button {
          min-width: 44px !important;
          min-height: 44px !important;
        }
        
        /* Prevent tools from disappearing */
        .tlui-toolbar__tools > * {
          opacity: 1 !important;
          visibility: visible !important;
          display: flex !important;
        }
        
        /* Make sure the toolbar container is visible */
        .tlui-toolbar {
          opacity: 1 !important;
          visibility: visible !important;
          display: flex !important;
          z-index: 1000 !important;
        }
        
        /* Ensure the main canvas allows interactions */
        .tl-canvas {
          touch-action: none !important;
        }
      `}</style>
    </div>
  );
}
