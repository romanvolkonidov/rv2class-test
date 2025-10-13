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
      className={`fixed bottom-24 left-1/2 -translate-x-1/2 z-50 transition-all duration-300 ${
        isClosing
          ? "opacity-0 translate-y-4"
          : "opacity-100 translate-y-0"
      }`}
    >
      <Card className="backdrop-blur-xl bg-black/40 border-white/10 shadow-2xl p-6 min-w-[500px]">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-blue-400" />
            <h3 className="text-white font-semibold text-lg">Video Enhancement</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
            title="Close"
          >
            <X className="w-5 h-5 text-white/80" />
          </button>
        </div>

        {/* Description */}
        <p className="text-white/60 text-sm mb-4">
          Choose a preset to enhance your video quality
        </p>

        {/* Preset Buttons Grid */}
        <div className="grid grid-cols-3 gap-3">
          {PRESETS.map((preset) => {
            const Icon = preset.icon;
            const isActive = currentPreset === preset.name;
            const colorClass = isActive ? preset.activeColor : preset.color;

            return (
              <button
                key={preset.name}
                onClick={() => handlePresetClick(preset.name)}
                className={`${colorClass} text-white rounded-xl p-4 transition-all duration-200 hover:scale-105 active:scale-95 flex flex-col items-center gap-2 shadow-lg`}
                title={preset.description}
              >
                <Icon className="w-6 h-6" />
                <span className="font-medium text-sm">{preset.label}</span>
                <span className="text-xs opacity-80">{preset.description}</span>
              </button>
            );
          })}
        </div>

        {/* Performance Info */}
        <div className="mt-4 pt-4 border-t border-white/10">
          <p className="text-white/50 text-xs text-center">
            GPU-accelerated • ~10ms latency • No server cost
          </p>
        </div>
      </Card>
    </div>
  );
}
