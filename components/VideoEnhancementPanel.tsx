"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { X, Sparkles, Sun, CloudSun, Briefcase, Palette } from "lucide-react";
import { EnhancementPreset } from "@/lib/videoEnhancement";

interface VideoEnhancementPanelProps {
  onClose: () => void;
  onPresetChange: (preset: EnhancementPreset) => void;
  currentPreset: EnhancementPreset;
  isClosing?: boolean;
}

const PRESETS = [
  {
    name: EnhancementPreset.OFF,
    label: "Off",
    icon: X,
    description: "No enhancement",
    color: "bg-gray-500 hover:bg-gray-600",
    activeColor: "bg-gray-600 ring-2 ring-gray-400",
  },
  {
    name: EnhancementPreset.LOW_LIGHT,
    label: "Low Light",
    icon: Sparkles,
    description: "Brighten dark rooms",
    color: "bg-amber-500 hover:bg-amber-600",
    activeColor: "bg-amber-600 ring-2 ring-amber-400",
  },
  {
    name: EnhancementPreset.OUTDOOR_BRIGHT,
    label: "Outdoor",
    icon: Sun,
    description: "Balance bright scenes",
    color: "bg-orange-500 hover:bg-orange-600",
    activeColor: "bg-orange-600 ring-2 ring-orange-400",
  },
  {
    name: EnhancementPreset.WARM_INDOOR,
    label: "Warm Indoor",
    icon: CloudSun,
    description: "Cozy warm tones",
    color: "bg-rose-500 hover:bg-rose-600",
    activeColor: "bg-rose-600 ring-2 ring-rose-400",
  },
  {
    name: EnhancementPreset.COOL_PROFESSIONAL,
    label: "Professional",
    icon: Briefcase,
    description: "Clean, sharp look",
    color: "bg-blue-500 hover:bg-blue-600",
    activeColor: "bg-blue-600 ring-2 ring-blue-400",
  },
  {
    name: EnhancementPreset.VIBRANT,
    label: "Vibrant",
    icon: Palette,
    description: "Pop of color",
    color: "bg-purple-500 hover:bg-purple-600",
    activeColor: "bg-purple-600 ring-2 ring-purple-400",
  },
] as const;

export default function VideoEnhancementPanel({
  onClose,
  onPresetChange,
  currentPreset,
  isClosing = false,
}: VideoEnhancementPanelProps) {
  const handlePresetClick = (preset: EnhancementPreset) => {
    onPresetChange(preset);
  };

  return (
    <div
      className={`fixed top-20 right-6 z-50 transition-all duration-300 ${
        isClosing
          ? "opacity-0 translate-x-4"
          : "opacity-100 translate-x-0"
      }`}
    >
      <Card className="backdrop-blur-xl bg-black/40 border-white/10 shadow-2xl p-3 w-[280px]">
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-blue-400" />
            <h3 className="text-white font-semibold text-sm">Video Enhancement</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-white/10 transition-colors"
            title="Close"
          >
            <X className="w-4 h-4 text-white/80" />
          </button>
        </div>

        {/* Preset Buttons Grid - Compact 2-column layout */}
        <div className="grid grid-cols-2 gap-2">
          {PRESETS.map((preset) => {
            const Icon = preset.icon;
            const isActive = currentPreset === preset.name;
            const colorClass = isActive ? preset.activeColor : preset.color;

            return (
              <button
                key={preset.name}
                onClick={() => handlePresetClick(preset.name)}
                className={`${colorClass} text-white rounded-lg p-2 transition-all duration-200 hover:scale-105 active:scale-95 flex flex-col items-center gap-1 shadow-lg`}
                title={preset.description}
              >
                <Icon className="w-4 h-4" />
                <span className="font-medium text-xs">{preset.label}</span>
              </button>
            );
          })}
        </div>

        {/* Performance Info */}
        <div className="mt-2 pt-2 border-t border-white/10">
          <p className="text-white/50 text-[10px] text-center">
            GPU-accelerated • Low latency
          </p>
        </div>
      </Card>
    </div>
  );
}
