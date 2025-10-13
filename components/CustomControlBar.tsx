"use client";

import { useState, useEffect, useRef } from "react";
import { useLocalParticipant, useRoomContext } from "@livekit/components-react";
import { Track, VideoPresets } from "livekit-client";
import { Mic, MicOff, Video, VideoOff, Monitor, MessageSquare, PhoneOff, Pencil, Square, ChevronDown, Check, Pin, PinOff, Sun, CloudSun, Briefcase, Palette, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { EnhancementPreset } from "@/lib/videoEnhancement";

// Electron API type declarations
declare global {
  interface Window {
    electronAPI?: {
      isElectron: boolean;
      getScreenSources: () => Promise<Array<{
        id: string;
        name: string;
        thumbnail: string;
        appIcon: string | null;
      }>>;
      getScreenStream: (sourceId: string, includeAudio: boolean) => Promise<any>;
      minimizeAndFocusShared: () => Promise<boolean>;
      showAppWindow: () => Promise<boolean>;
      getWindowState: () => Promise<{ isMinimized: boolean; isVisible: boolean } | null>;
    };
  }
}

interface CustomControlBarProps {
  isTutor?: boolean;
  showWhiteboard?: boolean;
  showAnnotations?: boolean;
  showChat?: boolean;
  onToggleWhiteboard?: () => void;
  onToggleAnnotations?: () => void;
  onToggleChat?: () => void;
  unreadChatCount?: number;
  currentPreset?: EnhancementPreset;
  onPresetChange?: (preset: EnhancementPreset) => void;
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
  currentPreset = EnhancementPreset.OFF,
  onPresetChange,
}: CustomControlBarProps) {
  const { localParticipant } = useLocalParticipant();
  const room = useRoomContext();
  const router = useRouter();
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [hasScreenShare, setHasScreenShare] = useState(false);
  const [isControlBarVisible, setIsControlBarVisible] = useState(true);
  const [isControlBarPinned, setIsControlBarPinned] = useState(false); // Unpinned by default (auto-hide)
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [showLeaveConfirmation, setShowLeaveConfirmation] = useState(false); // Leave meeting confirmation
  
  // Source picker state for Electron only
  const [showSourcePicker, setShowSourcePicker] = useState(false);
  const [availableSources, setAvailableSources] = useState<Array<{
    id: string;
    name: string;
    thumbnail: string;
    appIcon: string | null;
  }>>([]);
  const [includeAudio, setIncludeAudio] = useState(true); // Default to ON
  
  // Floating thumbnail state (Teams-like UX)
  const [showFloatingThumbnail, setShowFloatingThumbnail] = useState(false);
  const [sharedSourceName, setSharedSourceName] = useState<string>('');
  
  const micButtonRef = useRef<HTMLButtonElement>(null);
  const cameraButtonRef = useRef<HTMLButtonElement>(null);
  const enhancementButtonRef = useRef<HTMLButtonElement>(null);
  const micMenuRef = useRef<HTMLDivElement>(null);
  const cameraMenuRef = useRef<HTMLDivElement>(null);
  const enhancementMenuRef = useRef<HTMLDivElement>(null);
  
  // Device selection state
  const [showCameraMenu, setShowCameraMenu] = useState(false);
  const [showMicMenu, setShowMicMenu] = useState(false);
  const [showEnhancementMenu, setShowEnhancementMenu] = useState(false);
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
        console.log('📹 Will show camera menu:', cameras.length > 1);
        console.log('🎤 Will show mic menu:', mics.length > 1);
        
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
      
      // Check if the click is outside the mic button and menu
      if (showMicMenu && micButtonRef.current && !micButtonRef.current.contains(target) && micMenuRef.current && !micMenuRef.current.contains(target)) {
        setShowMicMenu(false);
      }
      
      // Check if the click is outside the camera button and menu
      if (showCameraMenu && cameraButtonRef.current && !cameraButtonRef.current.contains(target) && cameraMenuRef.current && !cameraMenuRef.current.contains(target)) {
        setShowCameraMenu(false);
      }
      
      // Check if the click is outside the enhancement button and menu
      if (showEnhancementMenu && enhancementButtonRef.current && !enhancementButtonRef.current.contains(target) && enhancementMenuRef.current && !enhancementMenuRef.current.contains(target)) {
        setShowEnhancementMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showCameraMenu, showMicMenu, showEnhancementMenu]);

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

  // Auto-hide control bar after inactivity (unless pinned)
  useEffect(() => {
    const showControlBar = () => {
      setIsControlBarVisible(true);
      
      // Clear existing timeout
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
      }
      
      // Only hide if not pinned
      if (!isControlBarPinned) {
        hideTimeoutRef.current = setTimeout(() => {
          setIsControlBarVisible(false);
        }, 3000);
      }
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
  }, [isControlBarPinned]);

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

  // Function to start sharing after source is selected (Electron only)
  const startSharingWithSource = async (sourceId: string, sourceName: string) => {
    if (!localParticipant || !room) return;
    
    try {
      console.log(`✅ Selected source: ${sourceName}, Audio: ${includeAudio ? 'ON' : 'OFF'}`);
      
      // Close the picker modal
      setShowSourcePicker(false);
      
      // Get stream constraints from Electron (includes system audio support!)
      const constraints = await window.electronAPI!.getScreenStream(sourceId, includeAudio);
      
      // Use getUserMedia with Electron's special constraints to get REAL system audio
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      
      console.log('✅ Electron screen share obtained!');
      if (includeAudio) {
        console.log('🎉 System audio capture ENABLED - can share audio from ANY window or application!');
      }
      
      // Get the video track
      const videoTrack = stream.getVideoTracks()[0];
      const audioTrack = stream.getAudioTracks()[0];

      if (videoTrack) {
        // Set contentHint for sharp text
        if ('contentHint' in videoTrack) {
          (videoTrack as any).contentHint = 'detail';
          console.log('✅ Set contentHint="detail" for ultra-sharp text');
        }

        const settings = videoTrack.getSettings();
        console.log(`✅ Captured screen at: ${settings.width}x${settings.height} @ ${settings.frameRate}fps`);

        // Publish video track
        const publishOptions: any = {
          name: 'screen_share',
          source: Track.Source.ScreenShare,
          simulcast: false,
          videoCodec: 'vp9',
          videoEncoding: {
            maxBitrate: 15_000_000,
            maxFramerate: 60,
            priority: 'high',
          },
          dtx: false,
          red: false,
        };
        
        if (publishOptions.videoEncoding) {
          publishOptions.videoEncoding.scalabilityMode = 'L1T1';
        }
        
        await localParticipant.publishTrack(videoTrack, publishOptions);
        console.log('✅ Screen share video track published!');

        // Publish audio track if available
        if (audioTrack && includeAudio) {
          await localParticipant.publishTrack(audioTrack, {
            name: 'screen_share_audio',
            source: Track.Source.ScreenShareAudio,
          });
          console.log('✅ Screen share AUDIO track published! 🎵');
        }

        // Update state
        setIsScreenSharing(true);
        setHasScreenShare(true);
        setSharedSourceName(sourceName);

        // TEAMS-LIKE UX: Minimize window and show floating thumbnail
        console.log('🪟 Minimizing app window and showing floating thumbnail...');
        await window.electronAPI!.minimizeAndFocusShared();
        setShowFloatingThumbnail(true);

        // Handle track ended (user stops sharing)
        videoTrack.onended = async () => {
          console.log('📺 Screen share track ended by user');
          await localParticipant.setScreenShareEnabled(false);
          setIsScreenSharing(false);
          setHasScreenShare(false);
          setShowFloatingThumbnail(false);
          // Restore window
          await window.electronAPI!.showAppWindow();
        };
      }
    } catch (error) {
      console.error('❌ Failed to start Electron screen share:', error);
      alert('Не удалось начать демонстрацию экрана. Пожалуйста, попробуйте еще раз.');
      setShowSourcePicker(false);
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
      setShowFloatingThumbnail(false);
      
      // Restore window if in Electron
      const isElectron = typeof window !== 'undefined' && window.electronAPI?.isElectron;
      if (isElectron) {
        await window.electronAPI!.showAppWindow();
        console.log('🪟 Restored app window');
      }
      
      // Also call the built-in method as fallback
      await localParticipant.setScreenShareEnabled(false);
    } else {
      try {
        let stream: MediaStream;
        
        // Check if running in Electron desktop app
        const isElectron = typeof window !== 'undefined' && window.electronAPI?.isElectron;
        
        if (isElectron) {
          // ELECTRON PATH - Show custom source picker with audio toggle
          console.log('🖥️ Electron detected - loading source picker...');
          
          // Get available screen/window sources from Electron
          const sources = await window.electronAPI!.getScreenSources();
          console.log(`📺 Found ${sources.length} screen sources`);
          
          if (!sources || sources.length === 0) {
            throw new Error('No screen sources available');
          }
          
          // Show custom Electron source picker modal (won't interfere with browser picker)
          setAvailableSources(sources);
          setShowSourcePicker(true);
          
          // Return early - actual sharing will happen when user selects a source
          return;
        } else {
          // BROWSER PATH - Use native browser picker (getDisplayMedia)
          console.log('🖥️ Browser mode - Using native browser picker...');
          console.log('🖥️ Browser mode - Requesting ULTRA quality screen share (up to 4K @ 60fps with VP9)...');
          
          // Manual high-quality capture with explicit constraints
          stream = await navigator.mediaDevices.getDisplayMedia({
            video: {
              width: { ideal: 3840, max: 3840 },      // Request 4K
              height: { ideal: 2160, max: 2160 },     // Request 4K height
              frameRate: { ideal: 30, max: 60 },      // Up to 60fps
              // Important: request the full resolution without any restrictions
              aspectRatio: { ideal: 16/9 },           // Prefer widescreen but allow any
            },
            audio: true, // Capture system audio if available (browser limitation: tab audio only)
            // Note: preferCurrentTab is removed - let user choose naturally
          } as any);
          
          console.log('✅ Browser screen share obtained (note: window audio limited to tabs)');
        }
        
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

  const handleLeave = () => {
    setShowLeaveConfirmation(true);
  };

  const handleConfirmLeave = async () => {
    setShowLeaveConfirmation(false);
    await room.disconnect();
    router.push('/');
  };

  const handleCancelLeave = () => {
    setShowLeaveConfirmation(false);
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
    <>
      <div 
        className={cn(
          "fixed bottom-4 left-1/2 -translate-x-1/2 transition-all duration-300",
          "z-50", // Keep control bar itself on a high z-index
          "w-full max-w-[95vw] md:max-w-none md:w-auto px-2 md:px-0",
          isControlBarVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-16 pointer-events-none"
        )}
      >
        <div className={cn(
          "flex items-center gap-2 md:gap-3 px-4 md:px-6 py-3 md:py-4",
          "rounded-2xl bg-black/20 backdrop-blur-xl border border-white/10 shadow-2xl",
          "overflow-x-auto scrollbar-hide",
          "snap-x snap-mandatory"
        )}>
          {/* Mic Control */}
          <div className="flex items-center gap-1">
            <GlassButton
              onClick={toggleMicrophone}
              active={!isMuted}
              title={isMuted ? "Unmute" : "Mute"}
            >
              {isMuted ? <MicOff className="w-5 h-5" fill="currentColor" /> : <Mic className="w-5 h-5" fill="currentColor" />}
            </GlassButton>
            
            {audioDevices.length > 1 && (
              <button
                ref={micButtonRef}
                onClick={(e) => {
                  e.stopPropagation();
                  setShowMicMenu(!showMicMenu);
                  setShowCameraMenu(false);
                }}
                className={cn(
                  "w-8 h-12 flex items-center justify-center rounded-lg",
                  "bg-white/10 backdrop-blur-md border border-white/20",
                  "hover:bg-white/20 hover:border-white/30",
                  "transition-all duration-200 touch-manipulation select-none",
                  showMicMenu && "bg-white/25 border-white/40"
                )}
                title="Select Microphone"
              >
                <ChevronDown className="w-4 h-4 text-white" />
              </button>
            )}
          </div>

          {/* Camera Control */}
          <div className="flex items-center gap-1">
            <GlassButton
              onClick={toggleCamera}
              active={!isCameraOff}
              title={isCameraOff ? "Turn Camera On" : "Turn Camera Off"}
            >
              {isCameraOff ? <VideoOff className="w-5 h-5" fill="currentColor" /> : <Video className="w-5 h-5" fill="currentColor" />}
            </GlassButton>
            
            {/* Device/Enhancement dropdown button - TEMPORARILY HIDDEN */}
            {/* <button
              ref={enhancementButtonRef}
              onClick={(e) => {
                e.stopPropagation();
                setShowEnhancementMenu(!showEnhancementMenu);
                setShowCameraMenu(false);
                setShowMicMenu(false);
              }}
              className={cn(
                "w-8 h-12 flex items-center justify-center rounded-lg",
                "bg-white/10 backdrop-blur-md border border-white/20",
                "hover:bg-white/20 hover:border-white/30",
                "transition-all duration-200 touch-manipulation select-none",
                showEnhancementMenu && "bg-white/25 border-white/40"
              )}
              title="Video Enhancement"
            >
              <ChevronDown className="w-4 h-4 text-white" />
            </button> */}
          </div>

          <GlassButton
            onClick={toggleScreenShare}
            active={isScreenSharing}
            title={isScreenSharing ? "Stop Sharing Screen" : "Share Screen"}
          >
            <Monitor className="w-5 h-5" fill="currentColor" />
          </GlassButton>

          <div className="w-px h-10 bg-white/20 mx-2" />

          {/* Chat Button */}
          {onToggleChat && (
            <div className="relative">
              <GlassButton
                onClick={onToggleChat}
                active={showChat}
                title={showChat ? "Close Chat" : "Open Chat"}
              >
                <MessageSquare className="w-5 h-5" fill="currentColor" />
              </GlassButton>
              {unreadChatCount > 0 && !showChat && (
                <div className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1.5 bg-red-500 rounded-full flex items-center justify-center border-2 border-black/50 animate-pulse">
                  <span className="text-xs font-bold text-white">
                    {unreadChatCount > 9 ? '9+' : unreadChatCount}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Annotation & Whiteboard Buttons */}
          {(isTutor || isScreenSharing) && !showWhiteboard && onToggleAnnotations && (
            <>
              <div className="w-px h-10 bg-white/20 mx-2" />
              <GlassButton
                onClick={onToggleAnnotations}
                active={showAnnotations}
                success={hasScreenShare}
                title={showAnnotations ? "Hide Annotations" : "Annotate Screen"}
              >
                <Pencil className="w-5 h-5" fill="currentColor" />
              </GlassButton>
            </>
          )}
          {isTutor && onToggleWhiteboard && (
            <>
              <div className="w-px h-10 bg-white/20 mx-2" />
              <GlassButton
                onClick={onToggleWhiteboard}
                active={showWhiteboard}
                title={showWhiteboard ? "Show Video" : "Open Whiteboard"}
              >
                <Square className="w-5 h-5" fill="currentColor" />
              </GlassButton>
            </>
          )}

          <div className="w-px h-10 bg-white/20 mx-2" />

          {/* Pin/Unpin Toggle */}
          <GlassButton 
            onClick={() => setIsControlBarPinned(!isControlBarPinned)} 
            active={isControlBarPinned}
            title={isControlBarPinned ? "Unpin Control Bar (Auto-hide)" : "Pin Control Bar (Always visible)"}
          >
            {isControlBarPinned ? <Pin className="w-5 h-5" fill="currentColor" /> : <PinOff className="w-5 h-5" fill="currentColor" />}
          </GlassButton>

          <div className="w-px h-10 bg-white/20 mx-2" />

          <GlassButton onClick={handleLeave} danger title="Leave Session">
            <PhoneOff className="w-5 h-5" fill="currentColor" />
          </GlassButton>
        </div>
      </div>

      {/* Microphone Menu Dropdown (Portal) */}
      {showMicMenu && audioDevices.length > 1 && micButtonRef.current && (
        <div 
          ref={micMenuRef}
          className="fixed w-64 max-h-60 overflow-y-auto bg-black/90 backdrop-blur-xl border border-white/20 rounded-xl shadow-2xl z-[9999] animate-in fade-in slide-in-from-bottom-2 duration-200"
          style={{
            bottom: `${window.innerHeight - micButtonRef.current.getBoundingClientRect().top + 12}px`,
            left: `${micButtonRef.current.getBoundingClientRect().left}px`,
          }}
        >
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

      {/* Camera Menu Dropdown (Portal) */}
      {showCameraMenu && videoDevices.length > 1 && cameraButtonRef.current && (
        <div 
          ref={cameraMenuRef}
          className="fixed w-64 max-h-60 overflow-y-auto bg-black/90 backdrop-blur-xl border border-white/20 rounded-xl shadow-2xl z-[9999] animate-in fade-in slide-in-from-bottom-2 duration-200"
          style={{
            bottom: `${window.innerHeight - cameraButtonRef.current.getBoundingClientRect().top + 12}px`,
            left: `${cameraButtonRef.current.getBoundingClientRect().left}px`,
          }}
        >
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

      {/* Enhancement Menu Dropdown (Portal) - TEMPORARILY HIDDEN */}
      {false && showEnhancementMenu && enhancementButtonRef.current && onPresetChange && (
        <div 
          ref={enhancementMenuRef}
          className="fixed w-64 bg-black/90 backdrop-blur-xl border border-white/20 rounded-xl shadow-2xl z-[9999] animate-in fade-in slide-in-from-bottom-2 duration-200"
          style={{
            bottom: `${window.innerHeight - enhancementButtonRef.current.getBoundingClientRect().top + 12}px`,
            left: `${enhancementButtonRef.current.getBoundingClientRect().left}px`,
          }}
        >
          <div className="p-2 border-b border-white/10">
            <p className="text-xs font-semibold text-white/70 uppercase tracking-wide px-2">Video Enhancement</p>
          </div>
          <div className="p-2">
            {/* OFF */}
            <button
              onClick={() => {
                onPresetChange(EnhancementPreset.OFF);
                setShowEnhancementMenu(false);
              }}
              className={cn(
                "w-full px-3 py-2 text-left text-sm text-white hover:bg-white/10 transition-colors flex items-center justify-between gap-2 rounded-lg",
                currentPreset === EnhancementPreset.OFF && "bg-gray-500/20"
              )}
            >
              <div className="flex items-center gap-2">
                <X className="w-4 h-4" />
                <span>Off</span>
              </div>
              {currentPreset === EnhancementPreset.OFF && (
                <Check className="w-4 h-4 text-blue-400 flex-shrink-0" />
              )}
            </button>
            
            {/* LOW LIGHT */}
            <button
              onClick={() => {
                onPresetChange(EnhancementPreset.LOW_LIGHT);
                setShowEnhancementMenu(false);
              }}
              className={cn(
                "w-full px-3 py-2 text-left text-sm text-white hover:bg-white/10 transition-colors flex items-center justify-between gap-2 rounded-lg",
                currentPreset === EnhancementPreset.LOW_LIGHT && "bg-amber-500/20"
              )}
            >
              <div className="flex items-center gap-2">
                <Sun className="w-4 h-4 text-amber-400" />
                <div>
                  <div>Low Light</div>
                  <div className="text-xs text-white/50">Brighten dark rooms</div>
                </div>
              </div>
              {currentPreset === EnhancementPreset.LOW_LIGHT && (
                <Check className="w-4 h-4 text-blue-400 flex-shrink-0" />
              )}
            </button>
            
            {/* OUTDOOR BRIGHT */}
            <button
              onClick={() => {
                onPresetChange(EnhancementPreset.OUTDOOR_BRIGHT);
                setShowEnhancementMenu(false);
              }}
              className={cn(
                "w-full px-3 py-2 text-left text-sm text-white hover:bg-white/10 transition-colors flex items-center justify-between gap-2 rounded-lg",
                currentPreset === EnhancementPreset.OUTDOOR_BRIGHT && "bg-orange-500/20"
              )}
            >
              <div className="flex items-center gap-2">
                <Sun className="w-4 h-4 text-orange-400" />
                <div>
                  <div>Outdoor Bright</div>
                  <div className="text-xs text-white/50">Balance bright scenes</div>
                </div>
              </div>
              {currentPreset === EnhancementPreset.OUTDOOR_BRIGHT && (
                <Check className="w-4 h-4 text-blue-400 flex-shrink-0" />
              )}
            </button>
            
            {/* WARM INDOOR */}
            <button
              onClick={() => {
                onPresetChange(EnhancementPreset.WARM_INDOOR);
                setShowEnhancementMenu(false);
              }}
              className={cn(
                "w-full px-3 py-2 text-left text-sm text-white hover:bg-white/10 transition-colors flex items-center justify-between gap-2 rounded-lg",
                currentPreset === EnhancementPreset.WARM_INDOOR && "bg-rose-500/20"
              )}
            >
              <div className="flex items-center gap-2">
                <CloudSun className="w-4 h-4 text-rose-400" />
                <div>
                  <div>Warm Indoor</div>
                  <div className="text-xs text-white/50">Cozy warm tones</div>
                </div>
              </div>
              {currentPreset === EnhancementPreset.WARM_INDOOR && (
                <Check className="w-4 h-4 text-blue-400 flex-shrink-0" />
              )}
            </button>
            
            {/* COOL PROFESSIONAL */}
            <button
              onClick={() => {
                onPresetChange(EnhancementPreset.COOL_PROFESSIONAL);
                setShowEnhancementMenu(false);
              }}
              className={cn(
                "w-full px-3 py-2 text-left text-sm text-white hover:bg-white/10 transition-colors flex items-center justify-between gap-2 rounded-lg",
                currentPreset === EnhancementPreset.COOL_PROFESSIONAL && "bg-blue-500/20"
              )}
            >
              <div className="flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-blue-400" />
                <div>
                  <div>Professional</div>
                  <div className="text-xs text-white/50">Clean, sharp look</div>
                </div>
              </div>
              {currentPreset === EnhancementPreset.COOL_PROFESSIONAL && (
                <Check className="w-4 h-4 text-blue-400 flex-shrink-0" />
              )}
            </button>
            
            {/* VIBRANT */}
            <button
              onClick={() => {
                onPresetChange(EnhancementPreset.VIBRANT);
                setShowEnhancementMenu(false);
              }}
              className={cn(
                "w-full px-3 py-2 text-left text-sm text-white hover:bg-white/10 transition-colors flex items-center justify-between gap-2 rounded-lg",
                currentPreset === EnhancementPreset.VIBRANT && "bg-purple-500/20"
              )}
            >
              <div className="flex items-center gap-2">
                <Palette className="w-4 h-4 text-purple-400" />
                <div>
                  <div>Vibrant</div>
                  <div className="text-xs text-white/50">Pop of color</div>
                </div>
              </div>
              {currentPreset === EnhancementPreset.VIBRANT && (
                <Check className="w-4 h-4 text-blue-400 flex-shrink-0" />
              )}
            </button>
          </div>
        </div>
      )}

      {/* Floating Thumbnail (Teams-like) - Only in Electron during screen share */}
      {showFloatingThumbnail && isScreenSharing && (
        <div 
          className="fixed top-4 right-4 z-[10001] bg-black/90 backdrop-blur-xl border-2 border-blue-500/50 rounded-xl shadow-2xl overflow-hidden animate-in slide-in-from-top-4 fade-in duration-300"
          style={{ width: '280px' }}
        >
          {/* Header */}
          <div className="p-3 bg-gradient-to-r from-blue-600/20 to-purple-600/20 border-b border-white/10">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              <span className="text-white font-medium text-sm">Sharing: {sharedSourceName}</span>
            </div>
          </div>
          
          {/* Video Preview (local participant's screen share) */}
          <div className="aspect-video bg-black relative">
            <video
              autoPlay
              muted
              playsInline
              className="w-full h-full object-contain"
              ref={(video) => {
                if (video && localParticipant) {
                  const screenSharePub = localParticipant.getTrackPublication(Track.Source.ScreenShare);
                  if (screenSharePub?.track) {
                    const mediaStream = new MediaStream([screenSharePub.track.mediaStreamTrack as MediaStreamTrack]);
                    video.srcObject = mediaStream;
                  }
                }
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent pointer-events-none" />
          </div>
          
          {/* Controls */}
          <div className="p-3 flex gap-2">
            <button
              onClick={async () => {
                // Show app window without stopping share
                await window.electronAPI!.showAppWindow();
              }}
              className="flex-1 px-3 py-2 bg-blue-600/80 hover:bg-blue-600 border border-blue-400/30 rounded-lg text-white text-sm font-medium transition-all flex items-center justify-center gap-2"
              title="Show app window"
            >
              <Video className="w-4 h-4" />
              Show App
            </button>
            <button
              onClick={toggleScreenShare}
              className="flex-1 px-3 py-2 bg-red-600/80 hover:bg-red-600 border border-red-400/30 rounded-lg text-white text-sm font-medium transition-all flex items-center justify-center gap-2"
              title="Stop sharing"
            >
              <PhoneOff className="w-4 h-4" />
              Stop
            </button>
          </div>
        </div>
      )}

      {/* Electron Source Picker Modal */}
      {showSourcePicker && availableSources.length > 0 && (
        <div 
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[10000] flex items-center justify-center p-4"
          onClick={() => setShowSourcePicker(false)}
        >
          <div 
            className="bg-gradient-to-br from-gray-900 to-black border border-white/20 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[80vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-6 border-b border-white/10">
              <h2 className="text-2xl font-bold text-white mb-2">Choose what to share</h2>
              <p className="text-sm text-white/60">Select a screen or window to share</p>
              
              {/* Audio Toggle */}
              <div className="mt-4 flex items-center gap-3 p-3 bg-white/5 rounded-lg border border-white/10">
                <input
                  type="checkbox"
                  id="audioToggle"
                  checked={includeAudio}
                  onChange={(e) => setIncludeAudio(e.target.checked)}
                  className="w-5 h-5 rounded border-white/20 bg-white/10 text-blue-500 focus:ring-2 focus:ring-blue-500"
                />
                <label htmlFor="audioToggle" className="text-white font-medium cursor-pointer flex-1">
                  Share system audio
                  <span className="block text-xs text-white/60 mt-0.5">
                    {includeAudio ? '🎵 Audio from this window/screen will be shared' : '🔇 No audio will be shared'}
                  </span>
                </label>
              </div>
            </div>
            
            {/* Source Grid */}
            <div className="p-6 overflow-y-auto max-h-[calc(80vh-200px)]">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {availableSources.map((source) => {
                  const isScreen = source.name.toLowerCase().includes('screen') || 
                                  source.name.toLowerCase().includes('entire') ||
                                  source.name.toLowerCase().includes('desktop');
                  
                  return (
                    <button
                      key={source.id}
                      onClick={() => startSharingWithSource(source.id, source.name)}
                      className="group relative flex flex-col items-center p-4 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-blue-500/50 rounded-xl transition-all duration-200 hover:scale-105"
                    >
                      {/* Thumbnail */}
                      <div className="w-full aspect-video bg-black/50 rounded-lg overflow-hidden mb-3 border border-white/10">
                        <img 
                          src={source.thumbnail} 
                          alt={source.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      
                      {/* Icon and Name */}
                      <div className="flex items-center gap-2 w-full">
                        {source.appIcon && !isScreen && (
                          <img 
                            src={source.appIcon} 
                            alt=""
                            className="w-6 h-6 flex-shrink-0"
                          />
                        )}
                        {isScreen && (
                          <Monitor className="w-6 h-6 text-blue-400 flex-shrink-0" />
                        )}
                        <span className="text-sm text-white font-medium truncate">
                          {source.name}
                        </span>
                      </div>
                      
                      {/* Hover overlay */}
                      <div className="absolute inset-0 bg-blue-500/0 group-hover:bg-blue-500/10 rounded-xl transition-colors pointer-events-none" />
                    </button>
                  );
                })}
              </div>
            </div>
            
            {/* Footer */}
            <div className="p-4 border-t border-white/10 flex justify-end">
              <button
                onClick={() => setShowSourcePicker(false)}
                className="px-6 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg text-white font-medium transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Leave Confirmation Modal */}
      {showLeaveConfirmation && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 p-6 max-w-md w-full mx-4 animate-scale-in">
            <div className="flex items-start gap-4 mb-4">
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                <PhoneOff className="h-6 w-6 text-red-600 dark:text-red-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                  Leave Meeting?
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  Are you sure you want to leave the meeting? You can rejoin using your link.
                </p>
              </div>
            </div>
            <div className="flex gap-3 justify-end">
              <button
                onClick={handleCancelLeave}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg font-medium transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmLeave}
                className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition-all"
              >
                Leave
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
