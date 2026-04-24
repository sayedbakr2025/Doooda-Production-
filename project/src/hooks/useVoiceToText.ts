import { useState, useRef, useCallback, useEffect } from 'react';
import { resolveCommand } from '../utils/voiceCommands';

export interface DetectedCommand {
  command: string;
  fullMatch: string;
  index: number;
}

function extractCommands(text: string, lang: 'ar-EG' | 'en-US'): DetectedCommand[] {
  const commands: DetectedCommand[] = [];
  const prefixRe = lang === 'ar-EG' ? /[اأ]مر\s+/g : /do command\s+/g;

  let prefixMatch: RegExpExecArray | null;
  while ((prefixMatch = prefixRe.exec(text)) !== null) {
    const startIdx = prefixMatch.index;
    const afterPrefix = text.slice(startIdx + prefixMatch[0].length);

    let matched = false;
    for (let wordCount = 3; wordCount >= 1 && !matched; wordCount--) {
      const wordRe = new RegExp(`^(\\S+(?:\\s+\\S+){0,${wordCount - 1}})`);
      const wordMatch = wordRe.exec(afterPrefix);
      if (!wordMatch) continue;

      const cmd = wordMatch[1].trim();
      if (resolveCommand(cmd, lang) === null) continue;

      let fullMatch = prefixMatch[0] + wordMatch[1];
      let remaining = afterPrefix.slice(wordMatch[0].length);

      if (lang === 'ar-EG') {
        const sufRe = /^\s+(?:ا)?نف[ذد]/;
        const sufMatch = sufRe.exec(remaining);
        if (sufMatch) {
          fullMatch += sufMatch[0];
        }
      } else {
        const sufMatch = /^\s+go/.exec(remaining);
        if (sufMatch) {
          fullMatch += sufMatch[0];
        }
      }

      commands.push({
        command: cmd,
        fullMatch,
        index: startIdx,
      });
      matched = true;
    }
  }

  return commands;
}

interface UseVoiceToTextOptions {
  lang?: 'ar-EG' | 'en-US';
  onFinalTranscript?: (text: string) => void;
  onInterimTranscript?: (text: string) => void;
  onCommandDetected?: (command: DetectedCommand) => void;
}

interface UseVoiceToTextReturn {
  isListening: boolean;
  interimTranscript: string;
  finalTranscript: string;
  detectedCommands: DetectedCommand[];
  startListening: () => void;
  stopListening: () => void;
  toggleListening: () => void;
  isSupported: boolean;
  lang: 'ar-EG' | 'en-US';
  setLang: (lang: 'ar-EG' | 'en-US') => void;
}

type SpeechRecognitionInstance = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: (event: any) => void;
  onerror: (event: any) => void;
  onend: () => void;
  start: () => void;
  stop: () => void;
  abort: () => void;
};

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognitionInstance;
    webkitSpeechRecognition: new () => SpeechRecognitionInstance;
  }
}

export default function useVoiceToText(options?: UseVoiceToTextOptions): UseVoiceToTextReturn {
  const [isListening, setIsListening] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState('');
  const [finalTranscript, setFinalTranscript] = useState('');
  const [detectedCommands, setDetectedCommands] = useState<DetectedCommand[]>([]);
  const [lang, setLang] = useState<'ar-EG' | 'en-US'>(options?.lang || 'ar-EG');
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const isStoppingRef = useRef(false);

  const isSupported = !!(window.SpeechRecognition || window.webkitSpeechRecognition);

  const createRecognition = useCallback(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return null;

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = lang;

    recognition.onresult = (event: any) => {
      let interim = '';
      let final = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          final += result[0].transcript;
        } else {
          interim += result[0].transcript;
        }
      }

      if (interim) {
        setInterimTranscript(interim);
        options?.onInterimTranscript?.(interim);
      }

      if (final) {
        const commands = extractCommands(final, lang);
        if (commands.length > 0) {
          setDetectedCommands(prev => [...prev, ...commands]);
          commands.forEach(cmd => options?.onCommandDetected?.(cmd));
        }

        setFinalTranscript(prev => prev + final);
        setInterimTranscript('');
        options?.onFinalTranscript?.(final);
      }
    };

    recognition.onerror = () => {
      setIsListening(false);
    };

    recognition.onend = () => {
      if (!isStoppingRef.current) {
        try {
          recognition.start();
        } catch {
          setIsListening(false);
        }
      } else {
        setIsListening(false);
      }
    };

    return recognition;
  }, [lang, options]);

  const startListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.abort();
    }

    isStoppingRef.current = false;
    const recognition = createRecognition();
    if (!recognition) return;

    recognitionRef.current = recognition;

    try {
      recognition.start();
      setIsListening(true);
    } catch {
      setIsListening(false);
    }
  }, [createRecognition]);

  const stopListening = useCallback(() => {
    isStoppingRef.current = true;
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsListening(false);
    setInterimTranscript('');
  }, []);

  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      setFinalTranscript('');
      setDetectedCommands([]);
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  useEffect(() => {
    return () => {
      isStoppingRef.current = true;
      recognitionRef.current?.abort();
    };
  }, []);

  return {
    isListening,
    interimTranscript,
    finalTranscript,
    detectedCommands,
    startListening,
    stopListening,
    toggleListening,
    isSupported,
    lang,
    setLang,
  };
}
