import { useState, useCallback, useRef } from "react";

interface VoiceInputState {
  isRecording: boolean;
  isProcessing: boolean;
  transcript: string | null;
  error: string | null;
}

interface UseVoiceInputOptions {
  onTranscript?: (transcript: string) => void;
  onError?: (error: string) => void;
  maxDuration?: number; // in milliseconds
}

export function useVoiceInput(options: UseVoiceInputOptions = {}) {
  const { onTranscript, onError, maxDuration = 30000 } = options;

  const [state, setState] = useState<VoiceInputState>({
    isRecording: false,
    isProcessing: false,
    transcript: null,
    error: null,
  });

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const isSupported = typeof window !== "undefined" &&
    "mediaDevices" in navigator &&
    "getUserMedia" in navigator.mediaDevices;

  // Check for Web Speech API support (for real-time transcription)
  const hasSpeechRecognition = typeof window !== "undefined" &&
    ("webkitSpeechRecognition" in window || "SpeechRecognition" in window);

  const startRecording = useCallback(async () => {
    if (!isSupported) {
      const error = "Voice input not supported in this browser";
      setState(prev => ({ ...prev, error }));
      onError?.(error);
      return;
    }

    try {
      setState(prev => ({
        ...prev,
        isRecording: true,
        error: null,
        transcript: null,
      }));

      // Try Web Speech API first for real-time transcription
      if (hasSpeechRecognition) {
        const SpeechRecognition = (window as any).webkitSpeechRecognition ||
          (window as any).SpeechRecognition;
        const recognition = new SpeechRecognition();

        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = "en-GB";

        recognition.onresult = (event: any) => {
          const transcript = event.results[0][0].transcript;
          setState(prev => ({
            ...prev,
            isRecording: false,
            transcript,
          }));
          onTranscript?.(transcript);
        };

        recognition.onerror = (event: any) => {
          const error = `Speech recognition error: ${event.error}`;
          setState(prev => ({
            ...prev,
            isRecording: false,
            error,
          }));
          onError?.(error);
        };

        recognition.onend = () => {
          setState(prev => ({ ...prev, isRecording: false }));
        };

        // Store reference for stopping
        mediaRecorderRef.current = recognition as any;
        recognition.start();

        // Auto-stop after max duration
        timeoutRef.current = setTimeout(() => {
          recognition.stop();
        }, maxDuration);

        return;
      }

      // Fallback to MediaRecorder for audio capture
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported("audio/webm")
          ? "audio/webm"
          : "audio/mp4",
      });

      audioChunksRef.current = [];
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());

        if (audioChunksRef.current.length === 0) {
          setState(prev => ({ ...prev, isRecording: false }));
          return;
        }

        setState(prev => ({ ...prev, isRecording: false, isProcessing: true }));

        try {
          // Create audio blob
          const audioBlob = new Blob(audioChunksRef.current, {
            type: mediaRecorder.mimeType,
          });

          // Here you would send to a transcription service
          // For now, we'll just set a placeholder
          const transcript = "[Audio recorded - transcription service needed]";

          setState(prev => ({
            ...prev,
            isProcessing: false,
            transcript,
          }));
          onTranscript?.(transcript);
        } catch (err) {
          const error = "Failed to process audio";
          setState(prev => ({
            ...prev,
            isProcessing: false,
            error,
          }));
          onError?.(error);
        }
      };

      mediaRecorder.start();

      // Auto-stop after max duration
      timeoutRef.current = setTimeout(() => {
        stopRecording();
      }, maxDuration);

    } catch (err) {
      const error = err instanceof Error ? err.message : "Failed to start recording";
      setState(prev => ({
        ...prev,
        isRecording: false,
        error,
      }));
      onError?.(error);
    }
  }, [isSupported, hasSpeechRecognition, maxDuration, onTranscript, onError]);

  const stopRecording = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    const recorder = mediaRecorderRef.current;
    if (!recorder) return;

    // Check if it's a SpeechRecognition instance
    if ("stop" in recorder && typeof recorder.stop === "function") {
      recorder.stop();
    }

    mediaRecorderRef.current = null;
  }, []);

  const reset = useCallback(() => {
    stopRecording();
    setState({
      isRecording: false,
      isProcessing: false,
      transcript: null,
      error: null,
    });
    audioChunksRef.current = [];
  }, [stopRecording]);

  return {
    ...state,
    isSupported,
    hasSpeechRecognition,
    startRecording,
    stopRecording,
    reset,
  };
}
