"use client";

import { Tldraw } from 'tldraw';
import 'tldraw/tldraw.css';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface TldrawWhiteboardProps {
  roomId: string;
  onClose: () => void;
}

export default function TldrawWhiteboard({ roomId, onClose }: TldrawWhiteboardProps) {
  return (
    <div className="fixed inset-0 z-50 bg-white flex flex-col">
      {/* Header with close button */}
      <div className="flex-shrink-0 h-14 bg-white border-b border-gray-200 flex items-center justify-between px-4">
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
      <div className="flex-1 overflow-hidden">
        <Tldraw
          persistenceKey={`rv2class-${roomId}`}
          autoFocus
        />
      </div>
    </div>
  );
}
