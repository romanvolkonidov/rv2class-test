"use client";

import { useState, useEffect, useRef } from "react";
import { useLocalParticipant, useRoomContext } from "@livekit/components-react";
import { Track, VideoPresets } from "livekit-client";
import { Mic, MicOff, Video, VideoOff, Monitor, MessageSquare, PhoneOff, Pencil, Square, ChevronDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";

interface CustomControlBarProps {
  isTutor?: boolean;
  showWhiteboard?: boolean;
  showAnnotations?: boolean;
  showChat?: boolean;
  onToggleWhiteboard?: () => void;
  onToggleAnnotations?: () => void;
  onToggleChat?: () => void;
  unreadChatCount?: number;
}

export default function CustomControlBar({ 
  isTutor = false,
  showWhiteboard = false,
  showAnnotations = false,
  showChat = false,
  onToggleWhiteboard,
  onToggleAnnotations,
  onToggleChat,
  unreadChatCount = 0,
}: CustomControlBarProps) {
  const { localParticipant } = useLocalParticipant();
  const room = useRoomContext();
  const router = useRouter();
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [hasScreenShare, setHasScreenShare] = useState(false);
  const [isControlBarVisible, setIsControlBarVisible] = useState(true);
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Device selection state
  const [showCameraMenu, setShowCameraMenu] = useState(false);
  const [showMicMenu, setShowMicMenu] = useState(false);
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
  const [currentCameraId, setCurrentCameraId] = useState<string>("");
  const [currentMicId, setCurrentMicId] = useState<string>("");

  // Sync with actual participant state
  const isMuted = localParticipant ? !localParticipant.isMicrophoneEnabled : true;
  const isCameraOff = localParticipant ? !localParticipant.isCameraEnabled : true;

  // Enumerate media devices
  useEffect(() => {
    const enumerateDevices = async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const cameras = devices.filter(d => d.kind === 'videoinput');
        const mics = devices.filter(d => d.kind === 'audioinput');
        
        setVideoDevices(cameras);
        setAudioDevices(mics);
        
        console.log('📹 Available cameras:', cameras.length, cameras.map(c => c.label));
        console.log('🎤 Available microphones:', mics.length, mics.map(m => m.label));
        
        // Get current devices from room
        if (localParticipant) {
          const cameraTrack = localParticipant.getTrackPublication(Track.Source.Camera);
          const micTrack = localParticipant.getTrackPublication(Track.Source.Microphone);
          
          if (cameraTrack?.track) {
            const settings = (cameraTrack.track as any).mediaStreamTrack?.getSettings();
            if (settings?.deviceId) {
              setCurrentCameraId(settings.deviceId);
              console.log('📹 Current camera:', settings.deviceId);
            }
          }
          
          if (micTrack?.track) {
            const settings = (micTrack.track as any).mediaStreamTrack?.getSettings();
            if (settings?.deviceId) {
              setCurrentMicId(settings.deviceId);
              console.log('🎤 Current microphone:', settings.deviceId);
            }
          }
        }
      } catch (error) {
        console.error('❌ Failed to enumerate devices:', error);
      }
    };

    enumerateDevices();
    
    // Re-enumerate when devices change
    navigator.mediaDevices.addEventListener('devicechange', enumerateDevices);
    
    return () => {
      navigator.mediaDevices.removeEventListener('devicechange', enumerateDevices);
    };
  }, [localParticipant]);

  // Close device menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.device-menu')) {
        setShowCameraMenu(false);
        setShowMicMenu(false);
      }
    };

    if (showCameraMenu || showMicMenu) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [showCameraMenu, showMicMenu]);

  // Check if anyone (local or remote) is screen sharing
  useEffect(() => {
    if (!room || !localParticipant) return;

    const checkForScreenShare = () => {
      // Check local participant - use trackPublications Map directly
      let hasShare = false;
      
      // Check all local tracks including screen share
      const localScreenShare = localParticipant.getTrackPublication(Track.Source.ScreenShare);
      if (localScreenShare) {
        hasShare = true;
        console.log('�️ Found local screen share track!');
      }

      // Also check videoTrackPublications
      if (!hasShare) {
        localParticipant.videoTrackPublications.forEach((pub) => {
          console.log('📹 Local video publication:', { source: pub.source, trackName: pub.trackName });
          if (pub.source === Track.Source.ScreenShare) {
            hasShare = true;
          }
        });
      }

      // Check remote participants
      if (!hasShare) {
        room.remoteParticipants.forEach(participant => {
          const remoteScreenShare = participant.getTrackPublication(Track.Source.ScreenShare);
          if (remoteScreenShare) {
            hasShare = true;
            console.log(`🖥️ Found remote screen share from ${participant.identity}!`);
          }
        });
      }

      console.log('🖥️ Screen share detected:', hasShare);
      setHasScreenShare(hasShare);
      setIsScreenSharing(hasShare && localParticipant.getTrackPublication(Track.Source.ScreenShare) !== undefined);
    };

    // Check immediately
    checkForScreenShare();

    // Check with slight delay to ensure tracks are updated
    const timer = setTimeout(checkForScreenShare, 300);

    // Listen to track events
    const handleTrackPublished = (pub: any) => {
      console.log('🎬 Track published:', { source: pub.source, kind: pub.kind });
      checkForScreenShare();
    };

    const handleTrackUnpublished = (pub: any) => {
      console.log('🎬 Track unpublished:', { source: pub.source, kind: pub.kind });
      checkForScreenShare();
    };

    localParticipant.on('trackPublished', handleTrackPublished);
    localParticipant.on('trackUnpublished', handleTrackUnpublished);
    room.on('trackPublished', handleTrackPublished);
    room.on('trackUnpublished', handleTrackUnpublished);
    room.on('participantConnected', checkForScreenShare);
    room.on('participantDisconnected', checkForScreenShare);

    return () => {
      clearTimeout(timer);
      localParticipant.off('trackPublished', handleTrackPublished);
      localParticipant.off('trackUnpublished', handleTrackUnpublished);
      room.off('trackPublished', handleTrackPublished);
      room.off('trackUnpublished', handleTrackUnpublished);
      room.off('participantConnected', checkForScreenShare);
      room.off('participantDisconnected', checkForScreenShare);
    };
  }, [room, localParticipant]);

  // Debug: Log state changes
  useEffect(() => {
    console.log('🎨 Button states:', { 
      hasScreenShare, 
      showAnnotations, 
      willBeGreen: hasScreenShare && !showAnnotations 
    });
  }, [hasScreenShare, showAnnotations]);

  // Auto-hide control bar after inactivity
  useEffect(() => {
    const showControlBar = () => {
      setIsControlBarVisible(true);
      
      // Clear existing timeout
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
      }
      
      // Hide after 3 seconds of inactivity
      hideTimeoutRef.current = setTimeout(() => {
        setIsControlBarVisible(false);
      }, 3000);
    };

    // Show control bar on mouse move
    const handleMouseMove = (e: MouseEvent) => {
      // Only show if mouse is in bottom 150px of screen
      const windowHeight = window.innerHeight;
      if (e.clientY > windowHeight - 150) {
        showControlBar();
      }
    };

    // Show control bar on any tap/click
    const handleClick = () => {
      showControlBar();
    };

    // Show control bar on touch (mobile)
    const handleTouchStart = () => {
      showControlBar();
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('click', handleClick);
    window.addEventListener('touchstart', handleTouchStart);

    // Initial show
    showControlBar();

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('click', handleClick);
      window.removeEventListener('touchstart', handleTouchStart);
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
      }
    };
  }, []);

  // Removed duplicate useEffect for isScreenSharing - now handled above

  const toggleMicrophone = async () => {
    if (localParticipant) {
      const enabled = localParticipant.isMicrophoneEnabled;
      await localParticipant.setMicrophoneEnabled(!enabled);
    }
  };

  const toggleCamera = async () => {
    if (localParticipant) {
      const enabled = localParticipant.isCameraEnabled;
      await localParticipant.setCameraEnabled(!enabled);
      
      // Update current camera ID after toggling
      setTimeout(async () => {
        const cameraTrack = localParticipant.getTrackPublication(Track.Source.Camera);
        if (cameraTrack?.track) {
          const settings = (cameraTrack.track as any).mediaStreamTrack?.getSettings();
          if (settings?.deviceId) {
            setCurrentCameraId(settings.deviceId);
          }
        }
      }, 500);
    }
  };

  const switchCamera = async (deviceId: string) => {
    if (!localParticipant || !room) return;
    
    try {
      console.log('📹 Switching camera to:', deviceId);
      setShowCameraMenu(false);
      
      // Get new camera stream
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { deviceId: { exact: deviceId } }
      });
      
      const videoTrack = stream.getVideoTracks()[0];
      
      if (videoTrack) {
        // Stop and unpublish old camera track
        const oldCameraTrack = localParticipant.getTrackPublication(Track.Source.Camera);
        if (oldCameraTrack?.track) {
          oldCameraTrack.track.stop();
          await localParticipant.unpublishTrack(oldCameraTrack.track);
        }
        
        // Publish new camera track
        await localParticipant.publishTrack(videoTrack, {
          name: 'camera',
          source: Track.Source.Camera,
        });
        
        setCurrentCameraId(deviceId);
        console.log('✅ Camera switched successfully');
      }
    } catch (error) {
      console.error('❌ Failed to switch camera:', error);
      alert('Не удалось переключить камеру. Пожалуйста, проверьте разрешения.');
    }
  };

  const switchMicrophone = async (deviceId: string) => {
    if (!localParticipant || !room) return;
    
    try {
      console.log('🎤 Switching microphone to:', deviceId);
      setShowMicMenu(false);
      
      // Get new microphone stream
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { deviceId: { exact: deviceId } }
      });
      
      const audioTrack = stream.getAudioTracks()[0];
      
      if (audioTrack) {
        // Stop and unpublish old microphone track
        const oldMicTrack = localParticipant.getTrackPublication(Track.Source.Microphone);
        if (oldMicTrack?.track) {
          oldMicTrack.track.stop();
          await localParticipant.unpublishTrack(oldMicTrack.track);
        }
        
        // Publish new microphone track
        await localParticipant.publishTrack(audioTrack, {
          name: 'microphone',
          source: Track.Source.Microphone,
        });
        
        setCurrentMicId(deviceId);
        console.log('✅ Microphone switched successfully');
      }
    } catch (error) {
      console.error('❌ Failed to switch microphone:', error);
      alert('Не удалось переключить микрофон. Пожалуйста, проверьте разрешения.');
    }
  };

  const toggleScreenShare = async () => {
    if (!localParticipant || !room) return;

    if (isScreenSharing) {
      console.log('🛑 Stopping screen share...');
      
      // Get the screen share track publication
      const screenSharePub = localParticipant.getTrackPublication(Track.Source.ScreenShare);
      const screenAudioPub = localParticipant.getTrackPublication(Track.Source.ScreenShareAudio);
      
      // Stop and unpublish tracks
      if (screenSharePub?.track) {
        screenSharePub.track.stop();
        await localParticipant.unpublishTrack(screenSharePub.track);
        console.log('✅ Screen share video track stopped and unpublished');
      }
      
      if (screenAudioPub?.track) {
        screenAudioPub.track.stop();
        await localParticipant.unpublishTrack(screenAudioPub.track);
        console.log('✅ Screen share audio track stopped and unpublished');
      }
      
      // Update state
      setIsScreenSharing(false);
      setHasScreenShare(false);
      
      // Also call the built-in method as fallback
      await localParticipant.setScreenShareEnabled(false);
    } else {
      try {
        console.log('🖥️ Requesting ULTRA quality screen share (up to 4K @ 60fps with VP9)...');
        
        // Manual high-quality capture with explicit constraints
        const stream = await navigator.mediaDevices.getDisplayMedia({
          video: {
            width: { ideal: 3840, max: 3840 },      // Request 4K
            height: { ideal: 2160, max: 2160 },     // Request 4K height
            frameRate: { ideal: 30, max: 60 },      // Up to 60fps
            // Important: request the full resolution without any restrictions
            aspectRatio: { ideal: 16/9 },           // Prefer widescreen but allow any
          },
          audio: true, // Capture system audio if available
          // Note: preferCurrentTab is removed - let user choose naturally
        } as any);
        
        console.log('✅ Successfully obtained display media stream');

        // Get the video track
        const videoTrack = stream.getVideoTracks()[0];
        const audioTrack = stream.getAudioTracks()[0];

        if (videoTrack) {
          // CRITICAL: Set contentHint to "detail" for text sharpness
          if ('contentHint' in videoTrack) {
            (videoTrack as any).contentHint = 'detail';
            console.log('✅ Set contentHint="detail" for ultra-sharp text');
          }

          // CRITICAL: Apply additional constraints for maximum quality
          try {
            await videoTrack.applyConstraints({
              width: { ideal: 3840, max: 3840 },
              height: { ideal: 2160, max: 2160 },
              frameRate: { ideal: 60, max: 60 },
              // Advanced constraints for quality
              aspectRatio: { ideal: 16/9 },
            });
            console.log('✅ Applied maximum quality constraints to video track');
          } catch (constraintError) {
            console.warn('⚠️ Could not apply all constraints (browser may have limits):', constraintError);
          }

          const settings = videoTrack.getSettings();
          console.log(`✅ Captured screen at: ${settings.width}x${settings.height} @ ${settings.frameRate}fps`);
          console.log('📐 Full track settings:', settings);
          console.log('📺 Track constraints:', videoTrack.getConstraints());

          const displaySurface = (settings as any).displaySurface; // 'monitor', 'window', or 'browser'
          console.log(`📺 Display surface type: ${displaySurface}`);

          // Publish the screen share track manually with LiveKit
          console.log('📤 Publishing screen share track to LiveKit...', {
            trackId: videoTrack.id,
            trackLabel: videoTrack.label,
            readyState: videoTrack.readyState,
            muted: videoTrack.muted,
            enabled: videoTrack.enabled,
          });

          try {
            // ULTRA settings - optimized for maximum quality like Microsoft Teams
            const publishOptions: any = {
              name: 'screen_share',
              source: Track.Source.ScreenShare,
              // CRITICAL: No quality layers - prevents downscaling
              simulcast: false,
              // VP9 provides better quality at lower bitrates than VP8
              videoCodec: 'vp9',
              // CRITICAL: Force VERY HIGH bitrate for maximum quality
              videoEncoding: {
                maxBitrate: 15_000_000,   // 15 Mbps - Microsoft Teams level bitrate
                maxFramerate: 60,         // 60fps for smooth scrolling
                // CRITICAL: Set priority to 'high' for bandwidth allocation
                priority: 'high',
              },
              // Additional options to maximize quality
              dtx: false,                 // Don't use discontinuous transmission
              red: false,                 // Don't use redundancy (saves bandwidth for quality)
              // Stream name for debugging
              stream: 'ultra_quality_screenshare',
            };
            
            // Add scalability mode to prevent quality layers (WebRTC standard)
            if (publishOptions.videoEncoding) {
              publishOptions.videoEncoding.scalabilityMode = 'L1T1'; // Single layer, no temporal scalability
            }
            
            await localParticipant.publishTrack(videoTrack, publishOptions);
            console.log('✅ Screen share track successfully published!');
          } catch (publishError) {
            console.error('❌ Failed to publish screen share track:', publishError);
            // Stop the stream since we couldn't publish it
            stream.getTracks().forEach(track => track.stop());
            throw publishError;
          }

          console.log('✅ Screen share published with ULTRA settings:');
          console.log('   • Resolution:', `${settings.width}x${settings.height}`);
          console.log('   • Frame Rate:', `${settings.frameRate}fps`);
          console.log('   • Bitrate: 15 Mbps (Microsoft Teams level quality)');
          console.log('   • Codec: VP9 (superior compression & quality)');
          console.log('   • Content Hint: DETAIL (optimized for text)');
          console.log('   • Simulcast: DISABLED (no quality drops)');
          console.log('   • Adaptive: DISABLED (constant quality)');
          console.log('   • Priority: HIGH (maximum bandwidth allocation)');
          console.log('   • Scalability: L1T1 (single layer, no degradation)');
          console.log('   • Display Surface:', displaySurface);          
          // CRITICAL: Immediately update state after publishing
          setIsScreenSharing(true);
          setHasScreenShare(true);
        }

        // Publish screen audio if available
        if (audioTrack) {
          // CRITICAL: Configure audio track for maximum quality before publishing
          if ('applyConstraints' in audioTrack) {
            try {
              await (audioTrack as MediaStreamTrack).applyConstraints({
                sampleRate: { ideal: 48000 },
                channelCount: { ideal: 2 },
                echoCancellation: false,  // Don't cancel system audio
                noiseSuppression: false,  // Keep original quality
                autoGainControl: false,   // Maintain original volume
              });
              console.log('✅ Applied high quality constraints to system audio');
            } catch (e) {
              console.warn('⚠️ Could not apply all audio constraints:', e);
            }
          }

          await localParticipant.publishTrack(audioTrack, {
            name: 'screen_share_audio',
            source: Track.Source.ScreenShareAudio,
            // CRITICAL: Enable RED for audio reliability
            red: true,
            // CRITICAL: Disable DTX for constant audio quality
            dtx: false,
          });
          console.log('✅ Screen audio published with high priority settings');
          console.log('🔊 System audio is being shared with maximum quality!');
        } else {
          console.log('⚠️ No audio track captured');
          console.log('💡 To share audio:');
          console.log('   1. Make sure you checked "Share audio" in the browser picker');
          console.log('   2. Use Chrome browser (best audio support)');
          console.log('   3. Different audio options are available for different sharing types:');
          console.log('      - Entire Screen: "Share system audio"');
          console.log('      - Chrome Tab: "Share tab audio"');
        }

        // Handle track ending (user stops sharing via browser UI)
        videoTrack.addEventListener('ended', () => {
          console.log('🛑 Screen share stopped by user');
          setIsScreenSharing(false);
          setHasScreenShare(false);
          localParticipant.setScreenShareEnabled(false);
        });
        
      } catch (error) {
        console.error('❌ Screen share failed:', error);
        
        // Check if user cancelled the picker
        if (error instanceof DOMException && error.name === 'NotAllowedError') {
          console.log('ℹ️ User cancelled screen share picker');
          return; // Silent return, no error message needed
        }
        
        // Check if user dismissed without selecting
        if (error instanceof DOMException && error.name === 'AbortError') {
          console.log('ℹ️ User aborted screen share');
          return; // Silent return, no error message needed
        }
        
        // For other errors, try fallback
        try {
          console.log('⚠️ Falling back to simplified screen share...');
          await localParticipant.setScreenShareEnabled(true, { audio: true });
          console.log('✅ Screen share enabled with fallback method');
          setIsScreenSharing(true);
          setHasScreenShare(true);
        } catch (fallbackError) {
          console.error('❌ All screen share attempts failed:', fallbackError);
          alert(`Screen sharing failed. Please try:
1. Refresh the page
2. Check browser permissions
3. Try a different browser (Chrome works best)`);
        }
      }
    }
  };

  const handleLeave = async () => {
    await room.disconnect();
    router.push('/');
  };

  const GlassButton = ({
    onClick,
    active = false,
    danger = false,
    success = false,
    children,
    title,
  }: {
    onClick: () => void;
    active?: boolean;
    danger?: boolean;
    success?: boolean;
    children: React.ReactNode;
    title: string;
  }) => (
    <button
      onClick={onClick}
      title={title}
      className={cn(
        "group relative p-4 rounded-xl transition-all duration-200",
        "bg-white/10 backdrop-blur-md border border-white/20",
        "hover:bg-white/20 hover:border-white/30 hover:-translate-y-0.5 hover:scale-110",
        "active:translate-y-0 active:scale-95",  // Better touch feedback
        // Larger touch target for mobile
        "min-w-[48px] min-h-[48px] flex items-center justify-center",
        // Touch-friendly spacing
        "touch-manipulation select-none",
        danger && "bg-red-500/20 border-red-400/30 hover:bg-red-500/30",
        success && "bg-green-500/50 border-green-400/60 hover:bg-green-500/60 shadow-lg shadow-green-500/30",
        active && !success && "bg-white/25 border-white/40"
      )}
    >
      <div className={cn("text-white transition-transform")}>
        {children}
      </div>
    </button>
  );

  return (
    <div 
      className={cn(
        "fixed bottom-4 left-1/2 -translate-x-1/2 transition-all duration-300",
        // Increase z-index when annotations are active to stay above canvas (z-50) and toolbar (z-60)
        showAnnotations ? "z-[61]" : "z-20",
        // Mobile: full width with padding, Desktop: auto width
        "w-full max-w-[95vw] md:max-w-none md:w-auto px-2 md:px-0",
        isControlBarVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-16 pointer-events-none"
      )}
    >
      <div className={cn(
        "flex items-center gap-2 md:gap-3 px-4 md:px-6 py-3 md:py-4",
        "rounded-2xl bg-black/20 backdrop-blur-xl border border-white/10 shadow-2xl",
        // Make it scrollable on very small screens
        "overflow-x-auto overflow-y-hidden scrollbar-hide",
        // Smooth scrolling on mobile
        "snap-x snap-mandatory"
      )}>
        {/* Basic controls - always visible */}
        <div className="relative flex items-center gap-1 device-menu">
          <GlassButton
            onClick={toggleMicrophone}
            active={!isMuted}
            title={isMuted ? "Unmute" : "Mute"}
          >
            {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </GlassButton>
          
          {/* Microphone device selector */}
          {audioDevices.length > 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowMicMenu(!showMicMenu);
                setShowCameraMenu(false);
              }}
              className={cn(
                "w-8 h-12 flex items-center justify-center rounded-lg",
                "bg-white/10 backdrop-blur-md border border-white/20",
                "hover:bg-white/20 hover:border-white/30",
                "transition-all duration-200",
                "touch-manipulation select-none",
                showMicMenu && "bg-white/25 border-white/40"
              )}
              title="Select Microphone"
            >
              <ChevronDown className="w-4 h-4 text-white" />
            </button>
          )}
          
          {/* Microphone menu dropdown */}
          {showMicMenu && audioDevices.length > 1 && (
            <div className="absolute bottom-full left-0 mb-2 w-64 max-h-60 overflow-y-auto bg-black/90 backdrop-blur-xl border border-white/20 rounded-xl shadow-2xl z-50">
              <div className="p-2 border-b border-white/10">
                <p className="text-xs font-semibold text-white/70 uppercase tracking-wide px-2">Select Microphone</p>
              </div>
              {audioDevices.map((device) => (
                <button
                  key={device.deviceId}
                  onClick={() => switchMicrophone(device.deviceId)}
                  className={cn(
                    "w-full px-3 py-2 text-left text-sm text-white hover:bg-white/10 transition-colors flex items-center justify-between gap-2",
                    device.deviceId === currentMicId && "bg-blue-500/20"
                  )}
                >
                  <span className="truncate">{device.label || `Microphone ${audioDevices.indexOf(device) + 1}`}</span>
                  {device.deviceId === currentMicId && (
                    <Check className="w-4 h-4 text-blue-400 flex-shrink-0" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="relative flex items-center gap-1 device-menu">
          <GlassButton
            onClick={toggleCamera}
            active={!isCameraOff}
            title={isCameraOff ? "Turn Camera On" : "Turn Camera Off"}
          >
            {isCameraOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
          </GlassButton>
          
          {/* Camera device selector */}
          {videoDevices.length > 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowCameraMenu(!showCameraMenu);
                setShowMicMenu(false);
              }}
              className={cn(
                "w-8 h-12 flex items-center justify-center rounded-lg",
                "bg-white/10 backdrop-blur-md border border-white/20",
                "hover:bg-white/20 hover:border-white/30",
                "transition-all duration-200",
                "touch-manipulation select-none",
                showCameraMenu && "bg-white/25 border-white/40"
              )}
              title="Select Camera"
            >
              <ChevronDown className="w-4 h-4 text-white" />
            </button>
          )}
          
          {/* Camera menu dropdown */}
          {showCameraMenu && videoDevices.length > 1 && (
            <div className="absolute bottom-full left-0 mb-2 w-64 max-h-60 overflow-y-auto bg-black/90 backdrop-blur-xl border border-white/20 rounded-xl shadow-2xl z-50">
              <div className="p-2 border-b border-white/10">
                <p className="text-xs font-semibold text-white/70 uppercase tracking-wide px-2">Select Camera</p>
              </div>
              {videoDevices.map((device) => (
                <button
                  key={device.deviceId}
                  onClick={() => switchCamera(device.deviceId)}
                  className={cn(
                    "w-full px-3 py-2 text-left text-sm text-white hover:bg-white/10 transition-colors flex items-center justify-between gap-2",
                    device.deviceId === currentCameraId && "bg-blue-500/20"
                  )}
                >
                  <span className="truncate">{device.label || `Camera ${videoDevices.indexOf(device) + 1}`}</span>
                  {device.deviceId === currentCameraId && (
                    <Check className="w-4 h-4 text-blue-400 flex-shrink-0" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        <GlassButton
          onClick={toggleScreenShare}
          active={isScreenSharing}
          title={isScreenSharing ? "Stop Sharing Screen" : "Share Screen"}
        >
          <Monitor className="w-5 h-5" />
        </GlassButton>

        <div className="w-px h-10 bg-white/20 mx-2" />

        {/* Chat Button - Available to everyone */}
        {onToggleChat && (
          <div className="relative">
            <GlassButton
              onClick={onToggleChat}
              active={showChat}
              title={showChat ? "Close Chat" : "Open Chat"}
            >
              <MessageSquare className="w-5 h-5" />
            </GlassButton>
            
            {/* Unread message badge */}
            {unreadChatCount > 0 && !showChat && (
              <div className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1.5 bg-red-500 rounded-full flex items-center justify-center border-2 border-black/50 animate-pulse">
                <span className="text-xs font-bold text-white">
                  {unreadChatCount > 9 ? '9+' : unreadChatCount}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Annotation button - Available to tutor always, or to student when they're screen sharing */}
        {(isTutor || isScreenSharing) && !showWhiteboard && onToggleAnnotations && (
          <>
            <div className="w-px h-10 bg-white/20 mx-2" />
            <GlassButton
              onClick={onToggleAnnotations}
              active={showAnnotations}
              success={hasScreenShare}
              title={showAnnotations ? "Hide Annotations" : "Annotate Screen"}
            >
              <Pencil className="w-5 h-5" />
            </GlassButton>
          </>
        )}

        {/* Whiteboard button - Tutor-only */}
        {isTutor && onToggleWhiteboard && (
          <>
            <div className="w-px h-10 bg-white/20 mx-2" />
            <GlassButton
              onClick={onToggleWhiteboard}
              active={showWhiteboard}
              title={showWhiteboard ? "Show Video" : "Open Whiteboard"}
            >
              <Square className="w-5 h-5" />
            </GlassButton>
          </>
        )}

        <div className="w-px h-10 bg-white/20 mx-2" />

        <GlassButton onClick={handleLeave} danger title="Leave Session">
          <PhoneOff className="w-5 h-5" />
        </GlassButton>
      </div>
    </div>
  );
}
