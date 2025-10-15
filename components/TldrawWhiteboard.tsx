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
    <div className="fixed inset-0 z-50 bg-white">
      {/* Header with close button */}
      <div className="absolute top-0 left-0 right-0 h-14 bg-white border-b border-gray-200 flex items-center justify-between px-4 z-10">
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

      {/* tldraw canvas */}
      <div className="absolute top-14 left-0 right-0 bottom-0">
        <Tldraw
          persistenceKey={`rv2class-${roomId}`}
          autoFocus
        />
      </div>
    </div>
  );
}
