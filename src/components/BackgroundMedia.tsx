import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Volume2, VolumeX, Video, X, Minimize2, Maximize2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

// Helper to detect if URL is YouTube and convert to embed URL
const getYouTubeEmbedUrl = (url: string, showControls: boolean = false): string | null => {
  if (!url) return null;
  
  // Match various YouTube URL formats
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      const controls = showControls ? '1' : '0';
      return `https://www.youtube.com/embed/${match[1]}?autoplay=1&loop=1&playlist=${match[1]}&mute=1&controls=${controls}&showinfo=0&rel=0`;
    }
  }
  
  return null;
};

const isYouTubeUrl = (url: string): boolean => {
  if (!url) return false;
  return url.includes("youtube.com") || url.includes("youtu.be");
};

// Global media manager - completely outside React lifecycle
class MediaManager {
  private static instance: MediaManager;
  private audio: HTMLAudioElement | null = null;
  private listeners: Set<() => void> = new Set();
  
  public isMuted: boolean = false;
  public isPlaying: boolean = false;
  public needsActivation: boolean = false;
  public audioUrl: string = "";
  public videoUrl: string = "";

  private constructor() {}

  static getInstance(): MediaManager {
    if (!MediaManager.instance) {
      MediaManager.instance = new MediaManager();
    }
    return MediaManager.instance;
  }

  subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach(listener => listener());
  }

  async initializeAudio(url: string) {
    if (!url) {
      // Clear audio if URL is empty
      if (this.audio) {
        this.audio.pause();
        this.audio.src = "";
        this.audio = null;
      }
      this.audioUrl = "";
      this.notify();
      return;
    }
    
    // Already playing this URL
    if (this.audio && this.audioUrl === url && !this.audio.paused) {
      return;
    }

    // Same URL but paused (needs activation)
    if (this.audio && this.audioUrl === url) {
      return;
    }

    // New URL - cleanup old audio
    if (this.audio && this.audioUrl !== url) {
      this.audio.pause();
      this.audio.src = "";
      this.audio = null;
    }

    // Create new audio
    this.audioUrl = url;
    this.audio = new Audio(url);
    this.audio.loop = true;
    this.audio.muted = this.isMuted;

    try {
      await this.audio.play();
      this.isPlaying = true;
      this.needsActivation = false;
    } catch {
      this.needsActivation = true;
      this.isPlaying = false;
    }
    this.notify();
  }

  setVideoUrl(url: string) {
    this.videoUrl = url;
    if (url && !this.audioUrl) {
      this.needsActivation = true;
    }
    this.notify();
  }

  async activateAudio() {
    if (this.audio && !this.isPlaying) {
      try {
        await this.audio.play();
        this.isPlaying = true;
        this.needsActivation = false;
        this.notify();
      } catch (e) {
        console.error("Failed to activate audio:", e);
      }
    }
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    if (this.audio) {
      this.audio.muted = this.isMuted;
    }
    this.notify();
  }

  setMuted(muted: boolean) {
    this.isMuted = muted;
    if (this.audio) {
      this.audio.muted = muted;
    }
    this.notify();
  }

  setPlaying(playing: boolean) {
    this.isPlaying = playing;
    this.notify();
  }

  setNeedsActivation(needs: boolean) {
    this.needsActivation = needs;
    this.notify();
  }

  getState() {
    return {
      isMuted: this.isMuted,
      isPlaying: this.isPlaying,
      needsActivation: this.needsActivation,
      audioUrl: this.audioUrl,
      videoUrl: this.videoUrl,
      hasAudio: !!this.audioUrl,
      hasVideo: !!this.videoUrl,
    };
  }
}

// Get singleton instance
const mediaManager = MediaManager.getInstance();

const BackgroundMedia = () => {
  const [state, setState] = useState(mediaManager.getState());
  const [showHint, setShowHint] = useState(true);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showVideo, setShowVideo] = useState(true);
  const [videoClosed, setVideoClosed] = useState(false); // Track if user closed video permanently
  const [videoNeedsActivation, setVideoNeedsActivation] = useState(true);
  const [videoMuted, setVideoMuted] = useState(true); // Separate mute state for video
  const videoRef = useRef<HTMLVideoElement>(null);
  const videoContainerRef = useRef<HTMLDivElement>(null);

  // Subscribe to media manager changes
  useEffect(() => {
    const unsubscribe = mediaManager.subscribe(() => {
      setState(mediaManager.getState());
    });
    return () => { unsubscribe(); };
  }, []);

  // Fetch media URLs and initialize
  useEffect(() => {
    const fetchAndInitialize = async () => {
      const { data } = await supabase
        .from("site_settings")
        .select("key, value")
        .in("key", ["audio_url", "video_url"]);
      
      if (data) {
        data.forEach((setting) => {
          if (setting.key === "audio_url" && typeof setting.value === "string" && setting.value) {
            mediaManager.initializeAudio(setting.value);
          }
          if (setting.key === "video_url" && typeof setting.value === "string" && setting.value) {
            mediaManager.setVideoUrl(setting.value);
          }
        });
      }
    };
    
    fetchAndInitialize();
  }, []);

  // Handle video play
  const handleVideoPlay = useCallback(async () => {
    if (videoRef.current) {
      try {
        videoRef.current.muted = videoMuted;
        await videoRef.current.play();
        setVideoNeedsActivation(false);
      } catch (e) {
        console.error("Failed to play video:", e);
        setVideoNeedsActivation(true);
      }
    }
  }, [videoMuted]);

  // Handle video mute state - separate from audio
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = videoMuted;
    }
  }, [videoMuted]);

  // Toggle video mute (separate from audio)
  const toggleVideoMute = useCallback(() => {
    setVideoMuted(prev => !prev);
  }, []);

  // Handle keyboard shortcut - only for audio now
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (key === "m" || key === "م" || e.code === "KeyM") {
        if (state.needsActivation && state.hasAudio) {
          mediaManager.activateAudio();
        } else if (state.hasAudio) {
          mediaManager.toggleMute();
        }
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [state.needsActivation, state.hasAudio]);

  // Hide hint after 10 seconds
  useEffect(() => {
    const timer = setTimeout(() => setShowHint(false), 10000);
    return () => clearTimeout(timer);
  }, []);

  // Handle audio button click - only controls audio
  const handleAudioClick = () => {
    if (state.needsActivation && state.hasAudio) {
      mediaManager.activateAudio();
    } else {
      mediaManager.toggleMute();
    }
  };

  const handleCloseVideo = () => {
    // First pause and reset video
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
      videoRef.current.src = '';
    }
    setShowVideo(false);
    setVideoClosed(true); // Mark as permanently closed
    setVideoNeedsActivation(true); // Reset activation state
  };

  // Reopen video
  const handleReopenVideo = () => {
    setVideoClosed(false);
    setShowVideo(true);
    setVideoNeedsActivation(true);
  };

  const handleToggleFullscreen = async () => {
    if (!videoContainerRef.current) return;

    try {
      if (!document.fullscreenElement) {
        await videoContainerRef.current.requestFullscreen();
        setIsFullscreen(true);
      } else {
        await document.exitFullscreen();
        setIsFullscreen(false);
      }
    } catch (error) {
      console.error("Fullscreen error:", error);
    }
  };

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const hasAnyMedia = state.hasAudio || state.hasVideo;
  const isYouTube = isYouTubeUrl(state.videoUrl);
  const youtubeEmbedUrl = getYouTubeEmbedUrl(state.videoUrl, isFullscreen);

  if (!hasAnyMedia) {
    return null;
  }

  return (
    <>
      {/* Video Player Box - only show if not permanently closed */}
      <AnimatePresence>
        {state.hasVideo && showVideo && !videoClosed && (
          <motion.div
            ref={videoContainerRef}
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ 
              opacity: 1, 
              scale: 1, 
              y: 0,
              width: isFullscreen ? '100vw' : (isMinimized ? 120 : 280),
              height: isFullscreen ? '100vh' : (isMinimized ? 68 : 158),
            }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            transition={{ type: "spring", damping: 20 }}
            className={`fixed z-40 overflow-hidden shadow-2xl border border-border bg-background ${
              isFullscreen ? 'inset-0 rounded-none' : 'bottom-20 left-4 rounded-xl'
            }`}
          >
            {/* Video Controls Header */}
            <div className={`absolute top-0 left-0 right-0 z-10 flex items-center justify-between bg-gradient-to-b from-black/60 to-transparent ${
              isFullscreen ? 'p-4' : 'p-1.5'
            }`}>
              <div className="flex items-center gap-1">
                {/* Video mute button */}
                <button
                  onClick={toggleVideoMute}
                  className={`rounded hover:bg-white/20 transition-colors ${isFullscreen ? 'p-2' : 'p-1'}`}
                  title={videoMuted ? "تشغيل صوت الفيديو" : "كتم صوت الفيديو"}
                >
                  {videoMuted ? (
                    <VolumeX className={`text-white ${isFullscreen ? 'w-5 h-5' : 'w-3 h-3'}`} />
                  ) : (
                    <Volume2 className={`text-white ${isFullscreen ? 'w-5 h-5' : 'w-3 h-3'}`} />
                  )}
                </button>
                {!isFullscreen && (
                  <button
                    onClick={() => setIsMinimized(!isMinimized)}
                    className="p-1 rounded hover:bg-white/20 transition-colors"
                    title={isMinimized ? "تكبير" : "تصغير"}
                  >
                    {isMinimized ? (
                      <Maximize2 className="w-3 h-3 text-white" />
                    ) : (
                      <Minimize2 className="w-3 h-3 text-white" />
                    )}
                  </button>
                )}
                <button
                  onClick={handleToggleFullscreen}
                  className={`rounded hover:bg-white/20 transition-colors ${isFullscreen ? 'p-2' : 'p-1'}`}
                  title={isFullscreen ? "إنهاء ملء الشاشة" : "ملء الشاشة"}
                >
                  {isFullscreen ? (
                    <Minimize2 className={`text-white ${isFullscreen ? 'w-5 h-5' : 'w-3 h-3'}`} />
                  ) : (
                    <Maximize2 className="w-3 h-3 text-white" />
                  )}
                </button>
                <button
                  onClick={handleCloseVideo}
                  className={`rounded hover:bg-white/20 transition-colors ${isFullscreen ? 'p-2' : 'p-1'}`}
                  title="إغلاق الفيديو"
                >
                  <X className={`text-white ${isFullscreen ? 'w-5 h-5' : 'w-3 h-3'}`} />
                </button>
              </div>
              {!isFullscreen && <Video className="w-3 h-3 text-white/70" />}
            </div>

            {/* Video Element - YouTube iframe or regular video */}
            {isYouTube && youtubeEmbedUrl ? (
              <iframe
                src={youtubeEmbedUrl}
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                style={{ border: 0 }}
              />
            ) : (
              <>
                <video
                  ref={videoRef}
                  src={state.videoUrl}
                  loop
                  playsInline
                  muted={videoMuted}
                  controls={isFullscreen}
                  className={`w-full h-full cursor-pointer ${isFullscreen ? 'object-contain' : 'object-cover'}`}
                  onClick={isFullscreen ? undefined : handleVideoPlay}
                />

                {/* Play overlay when needs activation */}
                {videoNeedsActivation && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="absolute inset-0 flex items-center justify-center bg-black/50 cursor-pointer"
                    onClick={handleVideoPlay}
                  >
                    <motion.div
                      animate={{ scale: [1, 1.1, 1] }}
                      transition={{ repeat: Infinity, duration: 1.5 }}
                      className="bg-primary/90 rounded-full p-3"
                    >
                      <Video className="w-6 h-6 text-primary-foreground" />
                    </motion.div>
                  </motion.div>
                )}
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mute Hint */}
      <AnimatePresence>
        {showHint && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-20 left-1/2 -translate-x-1/2 z-50"
          >
            <div className="flex items-center gap-2 bg-background/90 backdrop-blur-sm border border-border px-4 py-2 rounded-full shadow-lg">
              {state.isMuted ? (
                <VolumeX className="w-4 h-4 text-muted-foreground" />
              ) : (
                <Volume2 className="w-4 h-4 text-primary" />
              )}
              <span className="text-sm text-foreground hidden md:inline">
                اضغط <kbd className="px-2 py-0.5 bg-muted rounded text-primary font-mono mx-1">M</kbd> لتفعيل/إيقاف الصوت
              </span>
              <span className="text-sm text-foreground md:hidden">
                اضغط الزر لتفعيل/إيقاف الصوت
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Audio Control Button - Only shows if audio exists */}
      {state.hasAudio && (
        <motion.button
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          onClick={handleAudioClick}
          className={`fixed bottom-4 left-4 z-40 flex items-center gap-2 backdrop-blur-sm border border-border px-3 py-2 rounded-xl shadow-lg transition-colors ${
            state.needsActivation 
              ? "bg-primary/90 hover:bg-primary animate-pulse" 
              : "bg-background/90 hover:bg-muted"
          }`}
        >
          {state.needsActivation ? (
            <>
              <Volume2 className="w-5 h-5 text-primary-foreground" />
              <span className="text-sm text-primary-foreground font-medium">تشغيل الصوت</span>
            </>
          ) : state.isMuted ? (
            <>
              <VolumeX className="w-5 h-5 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">الصوت مكتوم</span>
            </>
          ) : (
            <>
              <Volume2 className="w-5 h-5 text-primary" />
              <span className="text-sm text-primary">الصوت مفعّل</span>
            </>
          )}
        </motion.button>
      )}

      {/* Show video button if closed */}
      {state.hasVideo && videoClosed && (
        <motion.button
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          onClick={handleReopenVideo}
          className="fixed bottom-4 left-44 z-40 flex items-center gap-2 bg-background/90 backdrop-blur-sm border border-border px-3 py-2 rounded-xl shadow-lg hover:bg-muted transition-colors"
        >
          <Video className="w-5 h-5 text-primary" />
          <span className="text-sm text-primary">إظهار الفيديو</span>
        </motion.button>
      )}
    </>
  );
};

export default BackgroundMedia;
