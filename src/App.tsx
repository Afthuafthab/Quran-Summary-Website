import React, { useState, useEffect, useRef } from "react";
import { 
  Search, 
  BookOpen, 
  Bookmark, 
  Settings, 
  ShoppingCart, 
  ArrowLeft, 
  Sparkles, 
  MessageSquare, 
  Minus, 
  Plus, 
  X, 
  ChevronRight, 
  ExternalLink,
  Info,
  CheckCircle,
  Menu,
  Heart,
  Volume2,
  VolumeX,
  Play,
  Pause,
  Square,
  Loader2,
  User,
  Phone,
  Mail,
  MapPin
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface Surah {
  id: string;
  name: string;
  englishName?: string;
  arabicName: string;
  translation: string;
  versesCount: number;
  revelation: string;
  tags: string[];
  description: string;
  availableKeys: string[];
}

interface VerseData {
  surah: number;
  start_ayah: number;
  end_ayah: number;
  context_chapter: string;
  text: string[];
}

interface KeywordArea {
  label: string;
  desc: string;
  key: string;
}

interface Keyword {
  word: string;
  areas: KeywordArea[];
}

interface QuoteSlide {
  arabic: string;
  malayalam: string;
  ref: string;
  keywords: Keyword[];
}

const INSPIRATIONAL_SLIDES: QuoteSlide[] = [
  {
    arabic: "وَمَن يَتَّقِ اللَّه‌َ يَجْعَل لَّه ‌ُ مَخْرَجًا",
    malayalam: "ആര് അല്ലാഹുവെ സൂക്ഷിക്കുന്നുവോ അവന് അവൻ ഒരു പോംവഴി ഉണ്ടാക്കിക്കൊടുക്കും. അവൻ പ്രതീക്ഷിക്കാത്ത വഴിയിലൂടെ അവന് ഉപജീവനമേകുകയും ചെയ്യും.",
    ref: "സൂറത്തു ത്വലാഖ്: 2",
    keywords: [
      {
        word: "തഖ്‌വ (സൂക്ഷ്മത)",
        areas: [
          { label: "സൂറത്തുൽ അൻആം: 151", desc: "ദൈവിക കല്പനകളും ധർമ്മനിഷ്ഠയും", key: "6:151" },
          { label: "സൂറത്തുൻ നിസാ: 1", desc: "പരസ്പരമുള്ള ബാധ്യതകളും കുടുംബബന്ധങ്ങളും", key: "4:1" }
        ]
      },
      {
        word: "തവക്കുൽ (ദൈവവിശ്വാസം)",
        areas: [
          { label: "സൂറത്തുൽ അൻആം: 154", desc: "ദൈവിക സ്രോതസ്സിലുള്ള അടിയുറച്ച വിശ്വാസം", key: "6:154" },
          { label: "സൂറത്തുൽ ഇഖ്ലാസ്: summary", desc: "ഏകദൈവ വിശ്വാസത്തിന്റെ ആകെത്തുക", key: "summary:112" }
        ]
      }
    ]
  },
  {
    arabic: "لَّيْسَ الْبِرَّ أَن تُوَلُّوا وُجُوهَكُمْ قِبَلَ الْمَشْرِقِ وَالْمَغْرِبِ",
    malayalam: "കിഴക്കോട്ടോ പടിഞ്ഞാറോട്ടോ നിങ്ങളുടെ മുഖങ്ങൾ തിരിക്കുക എന്നതല്ല പുണ്യം. എന്നാൽ ദൈവത്തിലും അന്ത്യദിനത്തിലും മാലാഖമാരിലും വേദഗ്രന്ഥത്തിലും പ്രവാചകന്മാരിലും വിശ്വസിച്ചവനാണ് യഥാർത്ഥ പുണ്യവാൻ.",
    ref: "സൂറത്തുൽ ബഖറ: 177",
    keywords: [
      {
        word: "ബിർറ് (യഥാർത്ഥ പുണ്യം)",
        areas: [
          { label: "സൂറത്തുൽ ബഖറ: 177", desc: "വിശദമായ സുകൃതങ്ങളുടെയും പുണ്യത്തിന്റെയും മാനദണ്ഡം", key: "2:177" },
          { label: "സൂറത്തുൽ അൻആം: 151", desc: "സദാചാര നിഷ്ഠകളും മര്യാദകളും", key: "6:151" }
        ]
      },
      {
        word: "ഈമാൻ (വിശ്വാസം)",
        areas: [
          { label: "സൂറത്തുൽ ബഖറ: 177", desc: "വിശ്വാസത്തിന്റെ അടിസ്ഥാന സ്തംഭങ്ങൾ", key: "2:177" },
          { label: "സൂറത്തുൽ അൻആം: 154", desc: "ദൈവിക വെളിപാടിലുള്ള അടിയുറച്ച വിശ്വാസം", key: "6:154" }
        ]
      },
      {
        word: "സ്വലാത്ത് (പ്രാർത്ഥന)",
        areas: [
          { label: "സൂറത്തുൽ ബഖറ: 238", desc: "പ്രാർത്ഥനകളുടെയും ആരാധനകളുടെയും സംരക്ഷണം", key: "2:238" },
          { label: "സൂറത്തുൽ ബഖറ: 239", desc: "ആശയക്കുഴപ്പത്തിലും ഭയത്തിലും പ്രാർത്ഥിക്കേണ്ട വിധം", key: "2:239" }
        ]
      }
    ]
  },
  {
    arabic: "لاَ إِكْرَاهَ فِي الدِّينِ قَد تَّبَيَّنَ الرُّشْدُ مِنَ الْغَيِّ",
    malayalam: "മതകാര്യത്തിൽ യാതൊരുവിധ ബലപ്രയോഗവുമില്ല. നേർവഴി ദുർമാർഗ്ഗത്തിൽ നിന്ന് വ്യക്തമായി വേർതിരിഞ്ഞു കഴിഞ്ഞിരിക്കുന്നു.",
    ref: "സൂറത്തുൽ ബഖറ: 256",
    keywords: [
      {
        word: "ഹുർരിയ്യത്ത് (സ്വാതന്ത്ര്യം)",
        areas: [
          { label: "സൂറത്തുൽ ബഖറ: 256", desc: "വിശ്വാസം സ്വീകരിക്കാനുള്ള परिപൂർണ്ണ സ്വാതന്ത്ര്യം", key: "2:256" },
          { label: "സൂറത്തുൽ കാഫിറൂൻ: summary", desc: "മതപരമായ സഹിഷ്ണുതയും സ്വാതന്ത്ര്യ പ്രഖ്യാപനവും", key: "summary:109" }
        ]
      },
      {
        word: "രുഷ്ദ് (നേർവഴി)",
        areas: [
          { label: "സൂറത്തുൽ അൻആം: 154", desc: "സന്മാർഗ്ഗവും കാരുണ്യവുമായി ഇറങ്ങിയ വേദഗ്രന്ഥം", key: "6:154" },
          { label: "സൂറത്തുൽ അൻആം: 115", desc: "സത്യത്തിലും നീതിയിലും പരിപൂർണ്ണമായ ദൈവവചനങ്ങൾ", key: "6:115" }
        ]
      }
    ]
  },
  {
    arabic: "وَمَن يَعْمَلْ مِنَ الصَّالِحَاتِ مِن ذَكَرٍ أَوْ أُنثَىٰ وَهُوَ مُؤْمِنٌ",
    malayalam: "ആൺ ആകട്ടെ പെൺ ആകട്ടെ, വിശ്വാസിയായിക്കൊണ്ട് ആര് സൽക്കർമ്മങ്ങൾ പ്രവർത്തിക്കുന്നുവോ അവർ സ്വർഗ്ഗത്തിൽ പ്രവേശിക്കുന്നതാണ്. അവരോട് ഒട്ടും അനീതി കാണിക്കപ്പെടുന്നതല്ല.",
    ref: "സൂറത്തുൻ നിസാ: 124",
    keywords: [
      {
        word: "സൽക്കർമ്മങ്ങൾ (Good Deeds)",
        areas: [
          { label: "സൂറത്തുൻ നിസാ: 124", desc: "സൽക്കർമ്മങ്ങളും അതിന്റെ പരലോക ഫലങ്ങളും", key: "4:124" },
          { label: "സൂറത്തുൽ ബഖറ: 83", desc: "മാതാപിതാക്കൾക്കും ജനങ്ങൾക്കും നന്മ ചെയ്യൽ", key: "2:83" }
        ]
      },
      {
        word: "സമത്വം (Equality)",
        areas: [
          { label: "സൂറത്തുൻ നിസാ: 124", desc: "പ്രതിഫല കാര്യത്തിൽ സ്ത്രീ-പുരുഷ സമത്വം", key: "4:124" },
          { label: "സൂറത്തുൻ നിസാ: 4", desc: "സ്ത്രീകളുടെ അവകാശങ്ങളും സംരക്ഷണവും", key: "4:4" }
        ]
      }
    ]
  }
];

const BookLoader = () => {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 space-y-6">
      <div 
        className="relative w-20 h-14 flex items-center justify-center"
        style={{ perspective: "400px" }}
      >
        {/* Book spine back cover */}
        <div className="absolute inset-0 bg-accent-main/20 rounded-lg border border-accent-main/40 shadow-md" />
        
        {/* Spine line */}
        <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-[3px] bg-accent-main/40 z-30" />
        
        {/* Static Left Page */}
        <div className="absolute left-1.5 right-1/2 top-1 bottom-1 bg-bg-card rounded-l border-y border-l border-border-main/80 shadow-sm" />
        
        {/* Static Right Page */}
        <div className="absolute right-1.5 left-1/2 top-1 bottom-1 bg-bg-card rounded-r border-y border-r border-border-main/80 shadow-sm" />
        
        {/* Animated Flipping Page 1 */}
        <motion.div 
          className="absolute right-1/2 top-1 bottom-1 bg-bg-card border-y border-l border-border-main rounded-l origin-right z-20"
          style={{ transformStyle: "preserve-3d", backfaceVisibility: "hidden" }}
          animate={{
            rotateY: [0, -180],
          }}
          transition={{
            duration: 1.2,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />

        {/* Animated Flipping Page 2 */}
        <motion.div 
          className="absolute right-1/2 top-1 bottom-1 bg-bg-card border-y border-l border-border-main rounded-l origin-right z-10"
          style={{ transformStyle: "preserve-3d", backfaceVisibility: "hidden" }}
          animate={{
            rotateY: [0, -180],
          }}
          transition={{
            duration: 1.2,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 0.4
          }}
        />
      </div>
      
      <div className="text-center space-y-1 animate-pulse">
        <p className="text-sm font-bold text-accent-light tracking-wide font-sans">
          വിവരങ്ങൾ ശേഖരിക്കുന്നു...
        </p>
        <p className="text-[10px] uppercase tracking-[0.25em] text-text-submuted font-semibold font-mono">
          Turning Sanctuary Pages
        </p>
      </div>
    </div>
  );
};

export default function App() {
  // App view state
  const [activeView, setActiveView] = useState<"dashboard" | "surah" | "bookmarks">("dashboard");
  const [selectedSurah, setSelectedSurah] = useState<Surah | null>(null);
  const [surahSummary, setSurahSummary] = useState<any | null>(null);
  const [isLoadingSummary, setIsLoadingSummary] = useState(false);
  const [isLoadingVerses, setIsLoadingVerses] = useState(false);
  const [surahTab, setSurahTab] = useState<"summary" | "manuscript">("summary");
  const [surahs, setSurahs] = useState<Surah[]>([]);
  const [verses, setVerses] = useState<Record<string, VerseData>>({});
  
  // Search & Filter state
  const [searchText, setSearchText] = useState("");
  
  // UI states
  const [fontDelta, setFontDelta] = useState(0); // For font resizing
  const [essenceVisible, setEssenceVisible] = useState(true);
  const [bookmarks, setBookmarks] = useState<string[]>([]);
  const [readVerses, setReadVerses] = useState<string[]>([]);
  const [theme, setTheme] = useState<"midnight" | "white">("midnight");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [semanticResults, setSemanticResults] = useState<Array<{ key: string; chapter: string; preview: string }> | null>(null);
  const [surahSearchMatches, setSurahSearchMatches] = useState<Surah[] | null>(null);
  const [isSearchingSemantically, setIsSearchingSemantically] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [highlightedVerseKey, setHighlightedVerseKey] = useState<string | null>(null);
  
  // Quote Carousel states
  const [activeSlide, setActiveSlide] = useState(0);
  const [selectedKeyword, setSelectedKeyword] = useState<Keyword | null>(null);
  const [isCarouselPaused, setIsCarouselPaused] = useState(false);
  
  // Scholar Chat state
  const [scholarLanguage, setScholarLanguage] = useState<"malayalam" | "english" | null>(() => {
    const saved = localStorage.getItem("scholar_language");
    return (saved === "malayalam" || saved === "english") ? saved : null;
  });

  const [showScholarChat, setShowScholarChat] = useState(false);
  const [showAuthorModal, setShowAuthorModal] = useState(false);
  const [chatHistory, setChatHistory] = useState<Array<{ sender: "user" | "bot"; text: string; wa_link?: string }>>(() => {
    const saved = localStorage.getItem("scholar_language");
    if (saved === "malayalam") {
      return [
        {
          sender: "bot",
          text: "സ്വാഗതം! ഞാൻ ഖുർആൻ സംക്ഷിപ്ത അവലോകന സഹായിയാണ്. വചനങ്ങളെക്കുറിച്ചുള്ള സംശയങ്ങൾ ചോദിക്കാനും ലളിതമായ വ്യാഖ്യാനം നേടാനും താഴെ എഴുതുക.",
        }
      ];
    } else if (saved === "english") {
      return [
        {
          sender: "bot",
          text: "Welcome! I am your Scholar Assistant. Ask any questions or doubts about the Quranic verses or themes to get a simple scholarly explanation in English.",
        }
      ];
    } else {
      return [
        {
          sender: "bot",
          text: "Please select your preferred language / ദയവായി നിങ്ങളുടെ മുൻഗണനാ ഭാഷ തിരഞ്ഞെടുക്കുക:",
        }
      ];
    }
  });
  const [chatInput, setChatInput] = useState("");
  const [isQuerying, setIsQuerying] = useState(false);
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  // TTS State & References
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [readingMode, setReadingMode] = useState<"summary" | "manuscript">("summary");
  const [readingSpeed, setReadingSpeed] = useState<number>(1.0); // Default to normal (1.0x) as requested
  const [audioChunks, setAudioChunks] = useState<string[]>([]);
  const [currentChunkIndex, setCurrentChunkIndex] = useState<number>(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Helper to split text into chunks that Google Translate TTS can safely process (limit ~200 chars)
  const chunkText = (text: string): string[] => {
    const sentences = text.split(/([.,;:!?\n]+)/g);
    const chunks: string[] = [];
    let currentChunk = "";

    for (let i = 0; i < sentences.length; i++) {
      const part = sentences[i];
      if (!part) continue;

      if ((currentChunk + part).length > 160) {
        if (currentChunk.trim()) {
          chunks.push(currentChunk.trim());
        }
        if (part.length > 160) {
          const words = part.split(/\s+/);
          let subChunk = "";
          for (const word of words) {
            if ((subChunk + " " + word).length > 160) {
              if (subChunk.trim()) chunks.push(subChunk.trim());
              subChunk = word;
            } else {
              subChunk = subChunk ? subChunk + " " + word : word;
            }
          }
          currentChunk = subChunk;
        } else {
          currentChunk = part;
        }
      } else {
        currentChunk += part;
      }
    }

    if (currentChunk.trim()) {
      chunks.push(currentChunk.trim());
    }

    return chunks.map(c => c.trim()).filter(c => c.length > 0 && /[\u0D00-\u0D7F\w\d]/.test(c));
  };

  const playChunk = (index: number, chunksList: string[]) => {
    if (index >= chunksList.length) {
      setIsSpeaking(false);
      setIsPaused(false);
      return;
    }

    const chunk = chunksList[index];
    const url = `/api/tts?text=${encodeURIComponent(chunk)}`;
    
    let audio = audioRef.current;
    if (!audio) {
      audio = new Audio();
      audioRef.current = audio;
    } else {
      audio.pause();
    }

    audio.src = url;
    audio.playbackRate = readingSpeed;

    audio.onplay = () => {
      if (audio) {
        audio.playbackRate = readingSpeed;
      }
    };

    audio.onended = () => {
      const nextIndex = index + 1;
      setCurrentChunkIndex(nextIndex);
      playChunk(nextIndex, chunksList);
    };

    audio.onerror = (e) => {
      console.error("Audio playback error, trying next chunk:", e);
      const nextIndex = index + 1;
      setCurrentChunkIndex(nextIndex);
      playChunk(nextIndex, chunksList);
    };

    audio.play().catch((err) => {
      console.error("Failed to start audio playback, trying next chunk:", err);
      // Wait slightly and move to next chunk to prevent stopping playback abruptly
      setTimeout(() => {
        const nextIndex = index + 1;
        setCurrentChunkIndex(nextIndex);
        playChunk(nextIndex, chunksList);
      }, 100);
    });
  };

  // Adjust playback rate when readingSpeed changes during playback
  useEffect(() => {
    if (audioRef.current && isSpeaking && !isPaused) {
      audioRef.current.playbackRate = readingSpeed;
    }
  }, [readingSpeed, isSpeaking, isPaused]);

  // Cleanup speech audio on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, []);

  // Cancel speaking when selectedSurah or reading mode changes
  useEffect(() => {
    stopSpeaking();
  }, [selectedSurah, readingMode]);

  const cleanMalayalamTextForSpeech = (text: string): string => {
    // Strip out Arabic characters to prevent speech synthesis crashes or spelling letters individually
    let cleaned = text.replace(/[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/g, "");
    
    // Replace colons between numbers (e.g. 114:1 or 1:5) with natural Malayalam words so it's not read as time
    cleaned = cleaned.replace(/(\d+)\s*:\s*(\d+)/g, "$1 ലെ വചനം $2");
    
    // Replace hyphenated ranges (e.g. 1-6 or 2-4) with natural Malayalam words (from X to Y)
    cleaned = cleaned.replace(/(\d+)\s*-\s*(\d+)/g, "$1 മുതൽ $2 വരെ");

    // Remove brackets
    cleaned = cleaned.replace(/[\(\)\[\]\{\}]/g, " ");
    // Remove duplicate whitespace
    cleaned = cleaned.replace(/\s+/g, " ");
    return cleaned.trim();
  };

  const startSpeaking = () => {
    if (!selectedSurah) return;

    stopSpeaking();

    let parts: string[] = [];

    if (readingMode === "summary") {
      if (!surahSummary) return;
      parts = [
        `${selectedSurah.name}. അധ്യായ പരിചയം.`,
        surahSummary.introduction || "",
        "പ്രധാന പ്രമേയങ്ങൾ.",
        ...(surahSummary.keyThemes || []).map((t: any) => `${t.theme || ""}. ${t.description || ""}`),
        "പ്രധാന വചനങ്ങൾ.",
        ...(surahSummary.notableVerses || []).map((v: any) => `വചനം ${v.verseRange || ""}. ${v.message || ""}`),
        "നമുക്കുള്ള പ്രായോഗിക പാഠങ്ങൾ.",
        ...(surahSummary.practicalLessons || []),
        "ആത്മീയ ചിന്ത.",
        surahSummary.conclusion || ""
      ];
    } else {
      // Manuscript mode
      parts = [
        `${selectedSurah.name}. കയ്യെഴുത്തുപ്രതി വചനങ്ങൾ.`,
      ];
      selectedSurah.availableKeys.forEach((key) => {
        const verse = verses[key];
        if (verse && verse.text && verse.text.length > 0) {
          const verseNum = key.split(":")[1];
          parts.push(`വചനം ${verseNum}.`);
          verse.text.forEach((line) => {
            parts.push(line);
          });
        }
      });
    }

    const rawText = parts.filter(Boolean).join(" ");
    const cleanText = cleanMalayalamTextForSpeech(rawText);

    if (!cleanText) return;

    const chunks = chunkText(cleanText);
    if (chunks.length === 0) return;

    setAudioChunks(chunks);
    setCurrentChunkIndex(0);
    setIsSpeaking(true);
    setIsPaused(false);

    playChunk(0, chunks);
  };

  const pauseSpeaking = () => {
    if (audioRef.current && isSpeaking && !isPaused) {
      audioRef.current.pause();
      setIsPaused(true);
    }
  };

  const resumeSpeaking = () => {
    if (audioRef.current && isSpeaking && isPaused) {
      audioRef.current.play().catch(err => console.error(err));
      setIsPaused(false);
    }
  };

  const stopSpeaking = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.onplay = null;
      audioRef.current.onended = null;
      audioRef.current.onerror = null;
      audioRef.current = null;
    }
    setIsSpeaking(false);
    setIsPaused(false);
    setAudioChunks([]);
    setCurrentChunkIndex(0);
  };

  // Load initial data
  useEffect(() => {
    // Fetch Surahs
    fetch("/api/surahs")
      .then((res) => res.json())
      .then((data) => {
        if (data.status === "success") {
          setSurahs(data.surahs);
        }
      })
      .catch((err) => console.error("Error loading Surahs:", err));

    // Load Bookmarks from localStorage
    const savedBookmarks = localStorage.getItem("quran_bookmarks");
    if (savedBookmarks) {
      setBookmarks(JSON.parse(savedBookmarks));
    }

    // Load Read Verses from localStorage
    const savedReadVerses = localStorage.getItem("quran_read_verses");
    if (savedReadVerses) {
      setReadVerses(JSON.parse(savedReadVerses));
    }

    // Load Theme from localStorage
    const savedTheme = localStorage.getItem("quran_theme");
    if (savedTheme === "midnight" || savedTheme === "white") {
      setTheme(savedTheme as "midnight" | "white");
    }
  }, []);

  // Fetch Surah verses dynamically when selectedSurah changes
  useEffect(() => {
    if (selectedSurah) {
      setIsLoadingVerses(true);
      fetch(`/api/verses?surahId=${selectedSurah.id}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.status === "success") {
            setVerses((prev) => ({ ...prev, ...data.verses }));
          }
        })
        .catch((err) => console.error("Error loading Surah verses:", err))
        .finally(() => setIsLoadingVerses(false));
    }
  }, [selectedSurah]);

  // Load bookmarked verses dynamically as needed
  useEffect(() => {
    if (bookmarks.length > 0) {
      const missingKeys = bookmarks.filter((key) => !verses[key]);
      if (missingKeys.length > 0) {
        fetch(`/api/verses?keys=${missingKeys.join(",")}`)
          .then((res) => res.json())
          .then((data) => {
            if (data.status === "success") {
              setVerses((prev) => ({ ...prev, ...data.verses }));
            }
          })
          .catch((err) => console.error("Error loading bookmarked verses:", err));
      }
    }
  }, [bookmarks, activeView]);

  // Update root element CSS variables on theme change
  useEffect(() => {
    const root = document.documentElement;
    const currentThemeVars = theme === "midnight" ? {
      "--bg-app": "#090a0b",
      "--bg-header": "#0f1112",
      "--bg-sidebar": "#0c0d0e",
      "--bg-card": "#16181a",
      "--bg-subcard": "#111315",
      "--border-main": "#2a2723",
      "--text-title": "#f2e8cf",
      "--text-body": "#dcd6cc",
      "--text-muted": "#a39482",
      "--text-submuted": "#8c8070",
      "--color-accent": "#b8860b",
      "--color-accent-light": "#ffe088",
    } : {
      "--bg-app": "#f8fafc",
      "--bg-header": "#ffffff",
      "--bg-sidebar": "#f1f5f9",
      "--bg-card": "#ffffff",
      "--bg-subcard": "#f8fafc",
      "--border-main": "#cbd5e1",
      "--text-title": "#0f172a",
      "--text-body": "#1e293b",
      "--text-muted": "#334155",
      "--text-submuted": "#475569",
      "--color-accent": "#c59218",
      "--color-accent-light": "#78350f",
    };

    Object.entries(currentThemeVars).forEach(([key, value]) => {
      root.style.setProperty(key, value);
    });
  }, [theme]);

  // Fetch Surah summary when selectedSurah changes
  useEffect(() => {
    if (selectedSurah) {
      setSurahSummary(null);
      setIsLoadingSummary(true);
      setSurahTab(selectedSurah.availableKeys.length > 0 ? "manuscript" : "summary");
      fetch(`/api/surah-summary/${selectedSurah.id}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.status === "success") {
            setSurahSummary(data.summary);
          }
        })
        .catch((err) => console.error("Error loading Surah summary:", err))
        .finally(() => setIsLoadingSummary(false));
    } else {
      setSurahSummary(null);
    }
  }, [selectedSurah]);

  // Save bookmarks
  const toggleBookmark = (key: string) => {
    let updated: string[];
    if (bookmarks.includes(key)) {
      updated = bookmarks.filter((b) => b !== key);
    } else {
      updated = [...bookmarks, key];
    }
    setBookmarks(updated);
    localStorage.setItem("quran_bookmarks", JSON.stringify(updated));
  };

  // Save read verses
  const toggleReadVerse = (key: string) => {
    let updated: string[];
    if (readVerses.includes(key)) {
      updated = readVerses.filter((v) => v !== key);
    } else {
      updated = [...readVerses, key];
    }
    setReadVerses(updated);
    localStorage.setItem("quran_read_verses", JSON.stringify(updated));
  };

  // Calculate Surah reading progress
  const getSurahProgress = (surah: Surah) => {
    if (!surah.availableKeys || surah.availableKeys.length === 0) {
      return readVerses.includes(`summary:${surah.id}`) ? 100 : 0;
    }
    const total = surah.availableKeys.length;
    const readCount = surah.availableKeys.filter((key) => readVerses.includes(key)).length;
    return Math.round((readCount / total) * 100);
  };

  const handleThemeChange = (newTheme: "midnight" | "white") => {
    setTheme(newTheme);
    localStorage.setItem("quran_theme", newTheme);
  };

  // Scroll chat to bottom
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatHistory, showScholarChat]);

  // Navigate to a specific verse key (e.g., "6:154") from semantic results
  const navigateToVerse = (key: string) => {
    if (key.startsWith("summary:")) {
      const surahId = parseInt(key.split(":")[1], 10);
      const surah = surahs.find((s) => s.id === surahId);
      if (surah) {
        setSelectedSurah(surah);
        setSurahTab("summary");
        setHighlightedVerseKey(null);
        setTimeout(() => {
          window.scrollTo({ top: 0, behavior: "smooth" });
        }, 100);
      }
      return;
    }

    const [surahIdStr] = key.split(":");
    const surahId = parseInt(surahIdStr, 10);
    const surah = surahs.find((s) => s.id === surahId);
    if (surah) {
      setSelectedSurah(surah);
      setSurahTab("manuscript");
      setHighlightedVerseKey(key);
    }
  };

  // Watch for highlightedVerseKey and scroll once its verse is fetched and rendered
  useEffect(() => {
    if (highlightedVerseKey && verses[highlightedVerseKey]) {
      // Give a tiny moment for React to mount the updated verses list
      const timer = setTimeout(() => {
        const element = document.getElementById(`verse-card-${highlightedVerseKey}`);
        if (element) {
          element.scrollIntoView({ behavior: "smooth", block: "center" });
          
          // Flash highlight border
          element.classList.add("ring-4", "ring-accent-main", "ring-offset-2", "transition-all", "duration-500");
          const removeFlashTimer = setTimeout(() => {
            element.classList.remove("ring-4", "ring-accent-main", "ring-offset-2");
          }, 4000);
          return () => clearTimeout(removeFlashTimer);
        }
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [highlightedVerseKey, verses]);

  // Auto-slide effect for Inspiration quote carousel (5 seconds interval)
  useEffect(() => {
    if (isCarouselPaused || selectedKeyword !== null) return;
    const interval = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % INSPIRATIONAL_SLIDES.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [isCarouselPaused, selectedKeyword]);

  // Handle Search submit
  const handleSearchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchText.trim()) return;

    setIsSearchingSemantically(true);
    setSemanticResults(null);
    setSurahSearchMatches(null);
    setSearchError(null);

    try {
      const response = await fetch("/api/semantic-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keyword: searchText }),
      });
      const data = await response.json();
      if (data.status === "success") {
        setSemanticResults(data.matches || []);
        setSurahSearchMatches(data.surahMatches || []);
      } else {
        setSearchError("തിരച്ചിൽ പരാജയപ്പെട്ടു. ദയവായി വീണ്ടും ശ്രമിക്കുക.");
      }
    } catch (err) {
      console.error("Semantic search failed:", err);
      setSearchError("സെർവറുമായി ബന്ധപ്പെടാൻ സാധിച്ചില്ല. ദയവായി നെറ്റ്വർക്ക് പരിശോധിക്കുക.");
    } finally {
      setIsSearchingSemantically(false);
    }
  };

  // Select scholar language and start conversation
  const handleLanguageSelect = (lang: "malayalam" | "english") => {
    setScholarLanguage(lang);
    localStorage.setItem("scholar_language", lang);

    const userMsg = lang === "malayalam" ? "മലയാളം (Malayalam)" : "English";
    const botMsg = lang === "malayalam"
      ? "തീർച്ചയായും! മലയാളത്തിൽ സംശയങ്ങൾ ചോദിക്കാനും ലളിതമായ വ്യാഖ്യാനം നേടാനും താഴെ എഴുതുക."
      : "Sure! Welcome to the Scholar Assistant. Ask any questions about the verses or themes, and I will explain them clearly in English.";

    setChatHistory([
      { sender: "bot", text: "Please select your preferred language / ദയവായി നിങ്ങളുടെ മുൻഗണനാ ഭാഷ തിരഞ്ഞെടുക്കുക:" },
      { sender: "user", text: userMsg },
      { sender: "bot", text: botMsg }
    ]);
  };

  // Run Scholar Query API
  const handleScholarQuery = async (queryText: string) => {
    if (!queryText.trim()) return;
    
    // Add user message
    const userMsg = queryText;
    setChatHistory((prev) => [...prev, { sender: "user", text: userMsg }]);
    setChatInput("");
    setIsQuerying(true);

    const isEng = scholarLanguage === "english";

    try {
      const response = await fetch("/api/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          query: userMsg, 
          requestedCoreEssence: essenceVisible,
          language: scholarLanguage || "malayalam"
        }),
      });
      const data = await response.json();
      
      const fallbackNoInfo = isEng 
        ? "I do not have detailed information on this in the provided manuscript."
        : "ഈ ഭാഗത്തെക്കുറിച്ചുള്ള വിവരങ്ങൾ എന്റെ പക്കലില്ല.";

      setChatHistory((prev) => [
        ...prev,
        {
          sender: "bot",
          text: data.explanation || fallbackNoInfo,
          wa_link: data.wa_link
        }
      ]);
    } catch (err) {
      console.error(err);
      const fallbackError = isEng
        ? "Sorry, failed to connect to the server. Please try again."
        : "ക്ഷമിക്കണം, സെർവറുമായി ബന്ധപ്പെടാൻ സാധിച്ചില്ല. വീണ്ടും ശ്രമിക്കുക.";

      setChatHistory((prev) => [
        ...prev,
        {
          sender: "bot",
          text: fallbackError
        }
      ]);
    } finally {
      setIsQuerying(false);
    }
  };

  // Filtered Surahs based on search text (when not in surah detail)
  const filteredSurahs = surahs.filter((s) => 
    s.name.toLowerCase().includes(searchText.toLowerCase()) ||
    (s.englishName && s.englishName.toLowerCase().includes(searchText.toLowerCase())) ||
    s.translation.toLowerCase().includes(searchText.toLowerCase())
  );

  const themeVars = theme === "midnight" ? {
    "--bg-app": "#090a0b",
    "--bg-header": "#0f1112",
    "--bg-sidebar": "#0c0d0e",
    "--bg-card": "#16181a",
    "--bg-subcard": "#111315",
    "--border-main": "#2a2723",
    "--text-title": "#f2e8cf",
    "--text-body": "#dcd6cc",
    "--text-muted": "#a39482",
    "--text-submuted": "#8c8070",
    "--color-accent": "#b8860b",
    "--color-accent-light": "#ffe088",
  } : {
    "--bg-app": "#f8fafc",
    "--bg-header": "#ffffff",
    "--bg-sidebar": "#f1f5f9",
    "--bg-card": "#ffffff",
    "--bg-subcard": "#f8fafc",
    "--border-main": "#cbd5e1",
    "--text-title": "#0f172a",
    "--text-body": "#1e293b",
    "--text-muted": "#334155",
    "--text-submuted": "#475569",
    "--color-accent": "#c59218",
    "--color-accent-light": "#78350f",
  };

  return (
    <div 
      style={themeVars as React.CSSProperties}
      className="min-h-screen bg-bg-app text-text-body flex flex-col font-sans relative antialiased selection:bg-accent-main/30 selection:text-text-title transition-colors duration-300"
    >
      
      {/* Top Banner/Header */}
      <header className="sticky top-0 z-30 bg-bg-header border-b border-border-main shadow-md py-4 px-4 md:px-8 transition-colors duration-300">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-lg hover:bg-bg-card transition-colors"
            >
              <Menu className="w-6 h-6 text-accent-main" />
            </button>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full border-2 border-accent-main flex items-center justify-center text-accent-main font-serif font-bold text-xl">
                ഖ
              </div>
              <h1 className="text-xl md:text-2xl font-bold text-text-title font-serif tracking-tight">
                ഖുർആൻ സംക്ഷിപ്ത അവലോകനം
              </h1>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Theme Selector */}
            <div className="flex items-center gap-1.5 bg-bg-subcard border border-border-main p-1 rounded-full text-xs">
              <button
                onClick={() => handleThemeChange("midnight")}
                className={`px-3 py-1.5 rounded-full font-bold transition-all cursor-pointer text-[11px] ${
                  theme === "midnight" 
                    ? "bg-accent-main text-black shadow-sm font-extrabold" 
                    : "text-text-muted hover:text-text-title"
                }`}
              >
                Dark
              </button>
              <button
                onClick={() => handleThemeChange("white")}
                className={`px-3 py-1.5 rounded-full font-bold transition-all cursor-pointer text-[11px] ${
                  theme === "white" 
                    ? "bg-accent-main text-black shadow-sm font-extrabold" 
                    : "text-text-muted hover:text-text-title"
                }`}
              >
                White
              </button>
            </div>

            <button 
              onClick={() => setShowScholarChat(true)}
              className="flex items-center gap-2 px-4 py-2 bg-accent-main text-black hover:bg-opacity-90 rounded-full text-xs font-semibold shadow-sm transition-all transform active:scale-95 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Ask Scholar
            </button>
          </div>
        </div>
      </header>

      <div className="flex flex-1 max-w-7xl w-full mx-auto relative">
        
        {/* Sidebar Navigation */}
        <aside className={`fixed inset-y-0 left-0 transform ${mobileMenuOpen ? "translate-x-0" : "-translate-x-full"} md:translate-x-0 transition-transform duration-300 ease-in-out md:sticky md:top-[73px] md:h-[calc(100vh-73px)] md:overflow-y-auto md:flex flex-col w-64 bg-bg-sidebar border-r border-border-main p-6 z-40 md:z-20 transition-colors duration-300`}>
          <div className="mb-8">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold uppercase tracking-wider text-text-submuted">Digital Sanctuary</span>
              <button onClick={() => setMobileMenuOpen(false)} className="md:hidden p-1 rounded-full hover:bg-bg-card text-text-muted">
                <X className="w-4 h-4" />
              </button>
            </div>
            <h2 className="text-lg font-bold text-text-title mt-1 font-serif">കയ്യെഴുത്തുപ്രതി സഹായകം</h2>
          </div>

          <nav className="flex flex-col gap-2 flex-grow">
            <button
              onClick={() => { setActiveView("dashboard"); setSelectedSurah(null); setMobileMenuOpen(false); }}
              className={`flex items-center gap-3 p-3 rounded-xl text-sm font-medium transition-all border ${activeView === "dashboard" ? "bg-bg-card border-accent-main text-text-title" : "text-text-muted border-transparent hover:bg-bg-card hover:text-text-title"}`}
            >
              <BookOpen className="w-4 h-4" />
              പ്രധാന പേജ് (Dashboard)
            </button>
            <button
              onClick={() => { setActiveView("bookmarks"); setMobileMenuOpen(false); }}
              className={`flex items-center gap-3 p-3 rounded-xl text-sm font-medium transition-all border ${activeView === "bookmarks" ? "bg-bg-card border-accent-main text-text-title" : "text-text-muted border-transparent hover:bg-bg-card hover:text-text-title"}`}
            >
              <Bookmark className="w-4 h-4" />
              ബുക്ക്‌മാർക്കുകൾ ({bookmarks.length})
            </button>
            <button
              onClick={() => { setShowAuthorModal(true); setMobileMenuOpen(false); }}
              className={`flex items-center gap-3 p-3 rounded-xl text-sm font-medium transition-all border ${showAuthorModal ? "bg-bg-card border-accent-main text-text-title" : "text-text-muted border-transparent hover:bg-bg-card hover:text-text-title"}`}
            >
              <User className="w-4 h-4" />
              ഗ്രന്ഥകർത്താവ് (Author)
            </button>
          </nav>

          <div className="mt-auto pt-6 border-t border-border-main">
            <a 
              href="https://wa.me/919961170582?text=Hello,%20I%20want%20to%20order%20the%20printed%20Quran%20Summary%20book"
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-center gap-2 w-full py-3 bg-accent-main text-black hover:bg-opacity-90 rounded-xl text-sm font-semibold shadow-sm transition-all"
            >
              <ShoppingCart className="w-4 h-4" />
              Order Printed Book
            </a>
          </div>
        </aside>

        {/* Content Canvas */}
        <main className="flex-1 p-4 md:p-8 overflow-y-auto bg-bg-app transition-colors duration-300">
          
          {/* Dashboard View */}
          {activeView === "dashboard" && !selectedSurah && (
            <motion.div 
              initial={{ opacity: 0, y: 15 }} 
              animate={{ opacity: 1, y: 0 }}
              className="space-y-8"
            >
              {/* Search Section */}
              <div className="relative">
                <form onSubmit={handleSearchSubmit} className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-text-submuted w-5 h-5" />
                  <input
                    type="text"
                    placeholder="വചനം അല്ലെങ്കിൽ സൂറത്ത് തിരയുക... (e.g. 6:154, അൽ-ഫാത്തിഹ)"
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    className="w-full pl-12 pr-12 py-4 bg-bg-card border border-border-main rounded-2xl text-text-title shadow-sm focus:outline-none focus:ring-2 focus:ring-accent-main/30 transition-all placeholder:text-text-muted/60"
                  />
                  {searchText.trim().length > 0 && (
                    <button
                      type="button"
                      onClick={() => setSearchText("")}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-title transition-colors"
                      title="Clear text"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  )}
                </form>

                {/* Instant Surah Recommendations Dropdown as User Types */}
                {searchText.trim().length > 0 && filteredSurahs.length > 0 && (
                  <motion.div 
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="absolute left-0 right-0 top-full mt-2 z-45 bg-bg-card border border-border-main rounded-2xl shadow-xl overflow-hidden max-h-64 overflow-y-auto"
                  >
                    <div className="p-3 bg-bg-subcard text-[11px] font-bold text-text-submuted uppercase tracking-wider border-b border-border-main/50 flex justify-between items-center">
                      <span>ശുപാർശ ചെയ്യുന്ന സൂറത്തുകൾ (Recommended Surahs)</span>
                      <span className="text-[10px] text-accent-main italic font-normal">എന്റർ അമർത്തിയാൽ വചനങ്ങളും തിരയാം</span>
                    </div>
                    <div className="divide-y divide-border-main/50">
                      {filteredSurahs.map((surah) => (
                        <div
                          key={surah.id}
                          onClick={() => {
                            setSelectedSurah(surah);
                            setSearchText("");
                          }}
                          className="p-3.5 hover:bg-accent-main/10 flex justify-between items-center cursor-pointer transition-all group"
                        >
                          <div className="flex items-center gap-3">
                            <span className="w-7 h-7 rounded-full bg-accent-main/10 border border-accent-main/20 text-accent-main font-bold text-xs flex items-center justify-center">
                              {surah.id}
                            </span>
                            <div>
                              <p className="text-sm font-bold text-text-title group-hover:text-accent-main transition-colors">
                                {surah.name} <span className="text-xs text-text-muted font-normal font-serif">({surah.englishName})</span>
                              </p>
                              <p className="text-xs text-text-muted">{surah.translation}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-serif text-text-title font-medium">{surah.arabicName}</span>
                            <ChevronRight className="w-4 h-4 text-accent-main opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </div>

              {/* Search Loading and Results block */}
              {(isSearchingSemantically || semanticResults !== null || surahSearchMatches !== null || searchError) && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-bg-card border border-border-main rounded-[2rem] p-6 md:p-8 shadow-md relative overflow-hidden space-y-6 transition-colors duration-300"
                >
                  <div className="flex justify-between items-center pb-4 border-b border-border-main">
                    <div>
                      <h3 className="text-lg font-bold text-text-title font-serif flex items-center gap-2">
                        <Search className="w-5 h-5 text-accent-main" />
                        തിരച്ചിൽ ഫലങ്ങൾ (Search Results)
                      </h3>
                      <p className="text-xs text-text-muted mt-1">നിങ്ങൾ തിരഞ്ഞ വാക്കോ വചനമോ അടങ്ങുന്ന സൂക്തങ്ങൾ താഴെ കാണാം.</p>
                    </div>
                    <button 
                      onClick={() => {
                        setSemanticResults(null);
                        setSurahSearchMatches(null);
                        setSearchError(null);
                        setSearchText("");
                      }}
                      className="p-2 rounded-full hover:bg-bg-subcard text-text-muted transition-colors cursor-pointer"
                      title="ഫലങ്ങൾ ഒഴിവാക്കുക (Clear Results)"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Loading spinner */}
                  {isSearchingSemantically && (
                    <BookLoader />
                  )}

                  {/* Search Error */}
                  {searchError && (
                    <div className="bg-red-50/50 border border-red-200 rounded-2xl p-4 text-center">
                      <p className="text-sm text-red-600 font-medium">{searchError}</p>
                    </div>
                  )}

                  {/* Results List */}
                  {((semanticResults !== null) || (surahSearchMatches !== null)) && !isSearchingSemantically && (
                    <div className="space-y-6">
                      
                      {/* 1. Surah Matches rendered FIRST */}
                      {surahSearchMatches && surahSearchMatches.length > 0 && (
                        <div className="space-y-3 pb-6 border-b border-border-main/50">
                          <h4 className="text-sm font-bold text-accent-main uppercase tracking-wider flex items-center gap-2">
                            <BookOpen className="w-4 h-4" />
                            സൂറത്തുകൾ (Matching Surahs)
                          </h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                            {surahSearchMatches.map((surah) => {
                              const progress = getSurahProgress(surah);
                              return (
                                <motion.div
                                  whileHover={{ y: -3 }}
                                  key={surah.id}
                                  onClick={() => {
                                    setSelectedSurah(surah);
                                    // Clear search state to focus on selected surah
                                    setSemanticResults(null);
                                    setSurahSearchMatches(null);
                                    setSearchText("");
                                  }}
                                  className="bg-bg-subcard border border-border-main rounded-2xl p-5 hover:border-accent-main/50 transition-all cursor-pointer flex flex-col justify-between"
                                >
                                  <div>
                                    <div className="flex justify-between items-center mb-2">
                                      <span className="text-[10px] font-bold text-accent-main bg-accent-main/10 border border-accent-main/30 px-2 py-0.5 rounded-full">
                                        SURA {surah.id}
                                      </span>
                                      <span className="text-sm font-semibold text-text-title font-serif">{surah.arabicName}</span>
                                    </div>
                                    <h5 className="font-bold text-text-title text-base">{surah.name}</h5>
                                    <p className="text-[11px] text-text-muted mt-0.5">{surah.translation}</p>
                                    <p className="text-xs text-text-body mt-2 line-clamp-2 leading-relaxed">{surah.description}</p>
                                  </div>
                                  
                                  <div className="mt-4 pt-3 border-t border-border-main/40 flex items-center justify-between text-xs font-semibold text-text-submuted">
                                    <span>{surah.versesCount} വചനങ്ങൾ</span>
                                    <span className="text-accent-main flex items-center gap-1 font-bold">
                                      വായിക്കുക <ChevronRight className="w-3.5 h-3.5" />
                                    </span>
                                  </div>
                                </motion.div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* 2. Verse Matches */}
                      {semanticResults && semanticResults.length > 0 && (
                        <div className="space-y-3">
                          <h4 className="text-sm font-bold text-accent-main uppercase tracking-wider flex items-center gap-2">
                            <Search className="w-4 h-4" />
                            ബന്ധപ്പെട്ട വചനങ്ങൾ (Matching Verses)
                          </h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {semanticResults.map((result, idx) => (
                              <motion.div
                                whileHover={{ y: -2 }}
                                key={idx}
                                onClick={() => navigateToVerse(result.key)}
                                className="bg-bg-subcard border border-border-main rounded-2xl p-5 hover:border-accent-main/50 transition-all cursor-pointer flex flex-col justify-between group"
                              >
                                <div className="space-y-2">
                                  <div className="flex justify-between items-center">
                                    <span className="text-xs font-bold text-accent-main bg-accent-main/10 border border-accent-main/30 px-2.5 py-0.5 rounded-full">
                                      Ayah {result.key}
                                    </span>
                                    <span className="text-[11px] text-text-submuted font-semibold">
                                      {result.chapter}
                                    </span>
                                  </div>
                                  <p className="text-sm text-text-body font-serif leading-relaxed line-clamp-3">
                                    {result.preview}
                                  </p>
                                </div>
                                <div className="flex items-center gap-1 text-xs text-accent-main group-hover:underline font-bold mt-4">
                                  വചനത്തിലേക്ക് പോവുക (Read Verse) <ChevronRight className="w-3.5 h-3.5" />
                                </div>
                              </motion.div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* No matches at all */}
                      {(!semanticResults || semanticResults.length === 0) && (!surahSearchMatches || surahSearchMatches.length === 0) && (
                        <div className="text-center py-8 space-y-3">
                          <p className="text-sm text-text-muted font-medium">ഈ വാക്കോ വചനമോ കണ്ടെത്താനായില്ല.</p>
                          <button 
                            type="button"
                            onClick={() => {
                              setShowScholarChat(true);
                              handleScholarQuery(searchText);
                            }}
                            className="px-4 py-2 bg-accent-main text-black hover:bg-opacity-90 rounded-full text-xs font-semibold shadow-sm transition-all"
                          >
                            പണ്ഡിത സഹായിയോട് ചോദിക്കുക (Ask Scholar)
                          </button>
                        </div>
                      )}

                    </div>
                  )}
                </motion.div>
              )}

              {/* Inspiration Bento Card */}
              <div 
                onMouseEnter={() => setIsCarouselPaused(true)}
                onMouseLeave={() => setIsCarouselPaused(false)}
                className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-bg-subcard to-bg-sidebar text-text-body p-8 md:p-10 shadow-lg border border-border-main transition-colors duration-300"
              >
                {/* Background watermark */}
                <div className="absolute right-0 bottom-0 opacity-5 translate-y-8 translate-x-8 pointer-events-none">
                  <BookOpen className="w-80 h-80" />
                </div>

                {/* Slides indicator dots */}
                <div className="absolute top-6 right-8 flex gap-2 z-20">
                  {INSPIRATIONAL_SLIDES.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        setActiveSlide(i);
                        setSelectedKeyword(null);
                      }}
                      className={`w-2.5 h-2.5 rounded-full transition-all duration-300 cursor-pointer ${
                        activeSlide === i ? "bg-accent-main w-6" : "bg-text-submuted/30 hover:bg-text-submuted/60"
                      }`}
                      title={`സ്ലൈഡ് ${i + 1}`}
                    />
                  ))}
                </div>

                <div className="relative z-10 max-w-2xl">
                  <span className="inline-block px-3 py-1 bg-accent-main/10 border border-accent-main/30 rounded-full text-xs font-semibold mb-4 text-accent-light">
                    പ്രചോദന വചനങ്ങൾ (Inspirational Verses)
                  </span>

                  <AnimatePresence mode="wait">
                    <motion.div
                      key={activeSlide}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.4 }}
                      className="space-y-4"
                    >
                      <p className="text-3xl md:text-4xl leading-relaxed text-right font-serif mb-6 text-text-title tracking-wide" dir="rtl">
                        {INSPIRATIONAL_SLIDES[activeSlide].arabic}
                      </p>
                      <p className="text-base md:text-lg font-medium italic opacity-95 mb-4 leading-relaxed text-text-body">
                        &ldquo;{INSPIRATIONAL_SLIDES[activeSlide].malayalam}&rdquo;
                      </p>
                      <div className="flex items-center justify-between text-xs font-bold text-accent-main uppercase tracking-wider border-b border-border-main/50 pb-4">
                        <span>{INSPIRATIONAL_SLIDES[activeSlide].ref}</span>
                        <span className="text-[10px] text-text-submuted italic font-normal">5 സെക്കൻഡിൽ സ്വയം മാറുന്നു (Auto-slides)</span>
                      </div>
                    </motion.div>
                  </AnimatePresence>

                  {/* Keywords Header */}
                  <div className="mt-5 space-y-3">
                    <p className="text-[11px] uppercase tracking-wider font-bold text-text-submuted">
                      പ്രധാന ആശയങ്ങൾ (Main Keywords - Click to Explore Chapters):
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {INSPIRATIONAL_SLIDES[activeSlide].keywords.map((kw, i) => (
                        <button
                          key={i}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedKeyword(selectedKeyword?.word === kw.word ? null : kw);
                          }}
                          className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all border cursor-pointer flex items-center gap-1.5 ${
                            selectedKeyword?.word === kw.word
                              ? "bg-accent-main border-accent-main text-black shadow-md font-extrabold scale-105"
                              : "bg-bg-card/50 border-border-main text-text-muted hover:text-text-title hover:border-accent-main/40"
                          }`}
                        >
                          <Sparkles className="w-3 h-3 opacity-70" />
                          {kw.word}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Dynamic Related Areas List */}
                  <AnimatePresence mode="wait">
                    {selectedKeyword && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.3 }}
                        className="overflow-hidden mt-6"
                      >
                        <div className="p-5 bg-bg-card border border-accent-main/30 rounded-2xl shadow-inner relative z-20 space-y-3">
                          <div className="flex justify-between items-center pb-2 border-b border-border-main/50">
                            <h4 className="text-xs font-bold text-accent-light uppercase tracking-wider flex items-center gap-1.5">
                              <BookOpen className="w-3.5 h-3.5 text-accent-main" />
                              തിരഞ്ഞെടുക്കുക (Select Related Chapter Area):
                            </h4>
                            <button
                              onClick={() => setSelectedKeyword(null)}
                              className="p-1 rounded-full hover:bg-bg-subcard text-text-muted hover:text-text-title transition-colors cursor-pointer"
                              title="Close"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {selectedKeyword.areas.map((area, idx) => (
                              <div
                                key={idx}
                                onClick={() => {
                                  navigateToVerse(area.key);
                                  setSelectedKeyword(null);
                                }}
                                className="p-3 rounded-xl bg-bg-subcard/60 hover:bg-accent-main/10 border border-border-main hover:border-accent-main/35 cursor-pointer transition-all flex flex-col justify-between group"
                              >
                                <div>
                                  <p className="text-xs font-bold text-text-title group-hover:text-accent-main transition-colors">
                                    {area.label}
                                  </p>
                                  <p className="text-[11px] text-text-submuted leading-normal mt-1">
                                    {area.desc}
                                  </p>
                                </div>
                                <div className="flex items-center gap-1 text-[10px] font-bold text-accent-main opacity-0 group-hover:opacity-100 transition-opacity mt-2">
                                  വചനത്തിലേക്ക് പോവുക <ChevronRight className="w-3 h-3" />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* Surahs Section Header */}
              <div>
                <h3 className="text-xl font-bold text-text-title mb-4 flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-accent-main" />
                  ലഭ്യമായ സൂറത്തുകൾ (Surah Directory)
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredSurahs.map((surah) => {
                    const progress = getSurahProgress(surah);
                    return (
                      <motion.div
                        whileHover={{ y: -4 }}
                        key={surah.id}
                        onClick={() => setSelectedSurah(surah)}
                        className="bg-bg-card rounded-2xl p-6 shadow-sm border border-border-main hover:border-accent-main/50 cursor-pointer transition-all flex flex-col justify-between hover:shadow-md"
                      >
                        <div>
                          <div className="flex justify-between items-start mb-4">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-xs font-bold text-accent-main bg-accent-main/10 border border-accent-main/30 px-2.5 py-1 rounded-full">
                                SURA {surah.id}
                              </span>
                              {progress === 100 && (
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                                  theme === "midnight"
                                    ? "text-[#4caf50] bg-[#2e7d32]/20 border border-[#2e7d32]/40"
                                    : "text-green-700 bg-green-50 border border-green-200"
                                }`}>
                                  <CheckCircle className={`w-2.5 h-2.5 ${theme === "midnight" ? "text-[#4caf50]" : "text-green-700"}`} />
                                  വായിച്ചുതീർത്തു
                                </span>
                              )}
                            </div>
                            <span className="text-lg font-semibold text-text-title font-serif">{surah.arabicName}</span>
                          </div>
                          <h4 className="text-xl font-bold text-text-title mb-1">{surah.name}</h4>
                          <p className="text-xs text-text-muted mb-3">{surah.translation} • {surah.revelation}</p>
                          <p className="text-sm text-text-body line-clamp-3 leading-relaxed mb-4">{surah.description}</p>
                        </div>

                        <div>
                          {/* Progress bar */}
                          <div className="mt-2 mb-4 space-y-1">
                            <div className="flex justify-between text-[11px] text-text-muted font-semibold">
                              <span>വായിച്ച പുരോഗതി (Progress)</span>
                              <span className="text-accent-main">{progress}%</span>
                            </div>
                            <div className="w-full bg-bg-subcard h-1.5 rounded-full overflow-hidden border border-border-main/30">
                              <div 
                                className="bg-gradient-to-r from-accent-main/60 to-accent-light h-full rounded-full transition-all duration-500" 
                                style={{ width: `${progress}%` }}
                              />
                            </div>
                          </div>

                          <div className="flex justify-between items-center pt-4 border-t border-border-main">
                            <span className="text-xs font-semibold text-text-submuted">{surah.versesCount} വചനങ്ങൾ</span>
                            <span className="text-accent-main font-medium text-xs flex items-center gap-1 hover:underline">
                              വായിക്കുക <ChevronRight className="w-3.5 h-3.5" />
                            </span>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          )}

          {/* Surah Detail View */}
          {selectedSurah && (
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }}
              className="space-y-8 pb-24"
            >
              {/* Back Button */}
              <button
                onClick={() => setSelectedSurah(null)}
                className="flex items-center gap-2 text-sm font-semibold text-accent-main hover:underline cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" /> പ്രധാന പേജിലേക്ക് മടങ്ങുക
              </button>

              {/* Surah Header Card */}
              <div className="bg-bg-card rounded-3xl p-8 border border-border-main text-center relative overflow-hidden transition-colors duration-300">
                <span className="text-xs font-bold bg-accent-main/10 border border-accent-main/30 text-accent-main px-3 py-1.5 rounded-full uppercase tracking-wider">
                  SURA {selectedSurah.id}
                </span>
                <h2 className="text-3xl font-bold text-text-title mt-3 mb-1 font-serif">{selectedSurah.name}</h2>
                <p className="text-sm text-text-muted mb-4">{selectedSurah.translation} • {selectedSurah.revelation}</p>
                <p className="text-base text-text-body max-w-xl mx-auto leading-relaxed">{selectedSurah.description}</p>
              </div>

              {/* AI Audio Companion (ശബ്ദ വായനാ സഹായി) */}
              <div id="ai-audio-companion" className="bg-bg-card rounded-3xl p-6 md:p-8 border border-border-main relative overflow-hidden shadow-sm space-y-6 transition-colors duration-300">
                <div className="absolute top-0 right-0 w-32 h-32 bg-accent-main/5 rounded-full blur-2xl pointer-events-none" />
                
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-border-main/50">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-accent-main/10 border border-accent-main/20 flex items-center justify-center shrink-0">
                      {isSpeaking && !isPaused ? (
                        <motion.div
                          animate={{ scale: [1, 1.15, 1] }}
                          transition={{ repeat: Infinity, duration: 1.5 }}
                        >
                          <Volume2 className="w-6 h-6 text-accent-main" />
                        </motion.div>
                      ) : (
                        <VolumeX className="w-6 h-6 text-text-submuted" />
                      )}
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-text-title font-serif flex items-center gap-2">
                        ശബ്ദ വായനാ സഹായി (AI Audio Reader)
                        {isSpeaking && !isPaused && (
                          <span className="flex gap-1 items-end h-3.5 px-1.5 pb-0.5">
                            <span className="w-0.5 bg-accent-main rounded-full animate-wave-1 h-3"></span>
                            <span className="w-0.5 bg-accent-main rounded-full animate-wave-2 h-2.5"></span>
                            <span className="w-0.5 bg-accent-main rounded-full animate-wave-3 h-3.5"></span>
                          </span>
                        )}
                      </h3>
                      <p className="text-xs text-text-muted mt-0.5">
                        {isSpeaking 
                          ? (isPaused ? "വായന താൽക്കാലികമായി നിർത്തിവെച്ചിരിക്കുന്നു." : "ശബ്ദരൂപത്തിൽ ഇപ്പോൾ വായിച്ചുകേൾപ്പിക്കുന്നു...") 
                          : "വായിച്ചു കേൾക്കാൻ താഴെയുള്ള വിവരങ്ങൾ സജ്ജമാക്കി പ്ലേ ചെയ്യുക."}
                      </p>
                    </div>
                  </div>
                  
                  {/* Mode Selector */}
                  <div className="flex bg-bg-subcard border border-border-main/80 p-1 rounded-xl self-start md:self-auto shrink-0">
                    <button
                      onClick={() => setReadingMode("summary")}
                      className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        readingMode === "summary"
                          ? "bg-accent-main text-black shadow"
                          : "text-text-muted hover:text-text-title"
                      }`}
                    >
                      അവലോകനം (Summary)
                    </button>
                    <button
                      onClick={() => setReadingMode("manuscript")}
                      className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        readingMode === "manuscript"
                          ? "bg-accent-main text-black shadow"
                          : "text-text-muted hover:text-text-title"
                      }`}
                    >
                      വചനങ്ങൾ (Verses)
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                  {/* Speed Controls */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-text-muted tracking-wide block uppercase">
                      വായന വേഗത (Reading Speed):
                    </label>
                    <div className="flex gap-2">
                      {[
                        { label: "പതുക്കെ (0.8x)", value: 0.8 },
                        { label: "സാധാരണ (1.0x)", value: 1.0 },
                        { label: "വേഗത്തിൽ (1.2x)", value: 1.2 },
                      ].map((item) => (
                        <button
                          key={item.value}
                          onClick={() => setReadingSpeed(item.value)}
                          className={`flex-1 py-2 px-1 text-[11px] font-bold rounded-xl border transition-all cursor-pointer ${
                            readingSpeed === item.value
                              ? "bg-accent-main/10 border-accent-main text-accent-light font-extrabold"
                              : "bg-bg-subcard border-border-main text-text-muted hover:text-text-title"
                          }`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Playback Controls */}
                  <div className="flex items-center gap-3 justify-end pt-2 md:pt-0">
                    {!isSpeaking ? (
                      <button
                        onClick={startSpeaking}
                        className="w-full md:w-auto min-w-[140px] flex items-center justify-center gap-2 px-6 py-3 bg-accent-main hover:bg-opacity-90 text-black font-extrabold text-xs rounded-full shadow-md transition-all active:scale-95 cursor-pointer select-none"
                      >
                        <Play className="w-4 h-4 fill-current" />
                        വായിക്കുക (Play AI)
                      </button>
                    ) : (
                      <div className="flex gap-3 w-full md:w-auto">
                        {isPaused ? (
                          <button
                            onClick={resumeSpeaking}
                            className="flex-1 md:flex-none min-w-[120px] flex items-center justify-center gap-2 px-5 py-3 bg-accent-main text-black font-extrabold text-xs rounded-full shadow-md transition-all active:scale-95 cursor-pointer select-none"
                          >
                            <Play className="w-4 h-4 fill-current" />
                            തുടരുക (Resume)
                          </button>
                        ) : (
                          <button
                            onClick={pauseSpeaking}
                            className="flex-1 md:flex-none min-w-[120px] flex items-center justify-center gap-2 px-5 py-3 bg-bg-subcard border border-border-main hover:bg-bg-card text-text-body font-bold text-xs rounded-full transition-all active:scale-95 cursor-pointer select-none"
                          >
                            <Pause className="w-4 h-4" />
                            നിർത്തുക (Pause)
                          </button>
                        )}
                        <button
                          onClick={stopSpeaking}
                          className={`flex-1 md:flex-none min-w-[100px] flex items-center justify-center gap-2 px-5 py-3 font-bold text-xs rounded-full transition-all active:scale-95 cursor-pointer select-none ${
                            theme === "midnight"
                              ? "bg-red-950/40 border border-red-900/50 hover:bg-red-950/60 text-red-400"
                              : "bg-red-50 border border-red-200 hover:bg-red-100 text-red-600"
                          }`}
                        >
                          <Square className="w-3.5 h-3.5 fill-current" />
                          നിർത്തുക (Stop)
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Tab Selector */}
              <div className="flex gap-2 p-1.5 bg-bg-subcard border border-border-main rounded-2xl max-w-lg mx-auto md:mx-0 transition-colors duration-300">
                <button
                  onClick={() => setSurahTab("summary")}
                  className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
                    surahTab === "summary"
                      ? "bg-accent-main text-black shadow-md font-extrabold"
                      : "text-text-muted hover:text-text-title hover:bg-bg-card"
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  പണ്ഡിത അവലോകനം (Scholarly Summary)
                </button>
                <button
                  onClick={() => setSurahTab("manuscript")}
                  className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
                    surahTab === "manuscript"
                      ? "bg-accent-main text-black shadow-md font-extrabold"
                      : "text-text-muted hover:text-text-title hover:bg-bg-card"
                  }`}
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  കയ്യെഴുത്തുപ്രതി അവലോകനങ്ങൾ ({selectedSurah.availableKeys.length})
                </button>
              </div>

              {/* Tab Content */}
              {surahTab === "summary" ? (
                <div className="space-y-8">
                  {isLoadingSummary ? (
                    <BookLoader />
                  ) : surahSummary ? (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="space-y-8"
                    >
                      {/* Introduction */}
                      <div className="bg-bg-card rounded-3xl p-6 md:p-8 border border-border-main space-y-4 transition-colors duration-300">
                        <h3 className="text-lg font-bold text-text-title flex items-center gap-2 font-serif">
                          <Info className="w-5 h-5 text-accent-main" />
                          അധ്യായ പരിചയം (Introduction)
                        </h3>
                        <p 
                          style={{ fontSize: `${17 + fontDelta}px`, lineHeight: "1.8" }}
                          className="text-text-body font-serif leading-relaxed"
                        >
                          {surahSummary.introduction}
                        </p>
                      </div>

                      {/* Key Themes */}
                      <div className="space-y-4">
                        <h3 className="text-lg font-bold text-text-title flex items-center gap-2 font-serif">
                          <Sparkles className="w-5 h-5 text-accent-main" />
                          പ്രധാന പ്രമേയങ്ങൾ (Key Themes)
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {surahSummary.keyThemes.map((themeObj: any, index: number) => (
                            <div key={index} className="bg-bg-card rounded-2xl p-6 border border-border-main space-y-2 flex flex-col justify-between transition-colors duration-300">
                              <div>
                                <span className="text-[10px] font-bold text-accent-main/80 uppercase tracking-wider">വിഷയം {index + 1}</span>
                                <h4 className="text-base font-bold text-text-title font-serif mt-1 mb-2">{themeObj.theme}</h4>
                                <p className="text-sm text-text-muted leading-relaxed font-serif">{themeObj.description}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Notable Verses */}
                      <div className="space-y-4">
                        <h3 className="text-lg font-bold text-text-title flex items-center gap-2 font-serif">
                          <BookOpen className="w-5 h-5 text-accent-main" />
                          പ്രധാന വചനങ്ങൾ (Notable Ayahs)
                        </h3>
                        <div className="grid grid-cols-1 gap-6">
                          {surahSummary.notableVerses.map((verseObj: any, index: number) => (
                            <div key={index} className="bg-bg-card rounded-2xl p-6 md:p-8 border border-border-main space-y-3 transition-colors duration-300">
                              <div className="flex items-center gap-2">
                                <span className="px-2.5 py-1 rounded bg-accent-main/10 border border-accent-main/20 text-xs font-bold text-accent-main">
                                  സൂറത്ത് {selectedSurah.id}: {verseObj.verseRange}
                                </span>
                              </div>
                              <p 
                                style={{ fontSize: `${16 + fontDelta}px`, lineHeight: "1.8" }}
                                className="text-text-body font-serif leading-relaxed"
                              >
                                {verseObj.message}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Practical Lessons */}
                      <div className="bg-bg-card rounded-3xl p-6 md:p-8 border border-border-main space-y-4 transition-colors duration-300">
                        <h3 className="text-lg font-bold text-text-title flex items-center gap-2 font-serif">
                          <Heart className="w-5 h-5 text-accent-main" />
                          നമുക്കുള്ള പാഠങ്ങൾ (Practical Lessons)
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {surahSummary.practicalLessons.map((lesson: string, index: number) => (
                            <div key={index} className="flex gap-3 items-start text-sm text-text-body bg-bg-subcard p-4 rounded-xl border border-border-main leading-relaxed transition-colors duration-300">
                              <span className="w-6 h-6 rounded-full bg-accent-main/10 border border-accent-main/20 flex items-center justify-center text-xs font-bold text-accent-main shrink-0">
                                {index + 1}
                              </span>
                              <span className="font-serif text-text-body">{lesson}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Conclusion */}
                      <div className="bg-gradient-to-br from-bg-card to-bg-subcard rounded-3xl p-6 md:p-8 border border-border-main text-center space-y-3 transition-colors duration-300">
                        <span className="text-xs uppercase tracking-wider text-accent-main font-bold">ആത്മീയ ചിന്ത (Spiritual Summary)</span>
                        <p 
                          style={{ fontSize: `${17 + fontDelta}px`, lineHeight: "1.8" }}
                          className="text-text-title italic font-serif leading-relaxed max-w-2xl mx-auto"
                        >
                          "{surahSummary.conclusion}"
                        </p>
                      </div>

                      {/* Summary Read Toggle */}
                      <div className="bg-bg-card rounded-3xl p-6 border border-border-main flex flex-col md:flex-row justify-between items-center gap-4 transition-colors duration-300">
                        <div className="space-y-1 text-center md:text-left">
                          <h4 className="text-base font-bold text-text-title font-serif">സംഗ്രഹം വായിച്ചുതീർത്തോ? (Read the summary?)</h4>
                          <p className="text-xs text-text-muted font-serif">സമ്പൂർണ്ണ പണ്ഡിത സംഗ്രഹം വായിച്ചതായി അടയാളപ്പെടുത്തുക. ഇത് നിങ്ങളുടെ പഠന പുരോഗതിയിൽ രേഖപ്പെടുത്തുന്നതാണ്.</p>
                        </div>
                        <button
                          onClick={() => toggleReadVerse(`summary:${selectedSurah.id}`)}
                          className={`flex items-center gap-2 px-5 py-2.5 rounded-full border text-xs font-bold transition-all cursor-pointer select-none ${
                            readVerses.includes(`summary:${selectedSurah.id}`)
                              ? theme === "midnight"
                                ? "bg-[#2e7d32]/20 border-[#2e7d32] text-[#4caf50]"
                                : "bg-green-50 border-green-200 text-green-700"
                              : "bg-accent-main/10 border-accent-main text-accent-light hover:bg-accent-main/20"
                          }`}
                        >
                          <CheckCircle className={`w-4 h-4 ${
                            readVerses.includes(`summary:${selectedSurah.id}`) 
                              ? theme === "midnight" ? "text-[#4caf50]" : "text-green-700" 
                              : "text-accent-main"
                          }`} />
                          {readVerses.includes(`summary:${selectedSurah.id}`) ? "വായിച്ചുതീർത്തു (Completed)" : "വായിച്ചതായി അടയാളപ്പെടുത്തുക (Mark as Read)"}
                        </button>
                      </div>
                    </motion.div>
                  ) : (
                    <div className="bg-bg-card rounded-2xl p-8 border border-border-main text-center">
                      <p className="text-text-muted">വിവരങ്ങൾ ലഭ്യമാക്കാൻ സാധിച്ചില്ല. വീണ്ടും ശ്രമിക്കുക.</p>
                    </div>
                  )}
                </div>
              ) : (
                /* Verses List */
                <div className="space-y-6">
                  {isLoadingVerses ? (
                    <BookLoader />
                  ) : selectedSurah.availableKeys.length > 0 ? (
                    selectedSurah.availableKeys.map((key) => {
                      const verse = verses[key];
                      if (!verse) return null;
                      const isBookmarked = bookmarks.includes(key);

                      const isRead = readVerses.includes(key);

                      return (
                        <div 
                          key={key}
                          id={`verse-card-${key}`}
                          className={`rounded-2xl p-6 md:p-8 border shadow-sm space-y-6 transition-all hover:shadow-md relative ${
                            isRead
                              ? theme === "midnight"
                                ? "bg-green-950/5 border-green-900/30"
                                : "bg-green-50/20 border-green-200/50"
                              : "bg-bg-card border-border-main"
                          }`}
                        >
                          <div className="flex justify-between items-center border-b border-border-main pb-4">
                            <div className="flex items-center gap-3">
                              <span className={`w-8 h-8 rounded-full border font-bold text-xs flex items-center justify-center transition-all ${
                                isRead 
                                  ? "bg-green-500/15 border-green-500 text-green-400" 
                                  : "bg-bg-subcard border-accent-main text-accent-light"
                              }`}>
                                {verse.start_ayah}
                              </span>
                              <span className="text-xs font-bold text-text-muted uppercase tracking-wider flex items-center gap-2">
                                Ayah {key}
                                {isRead && (
                                  <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                    theme === "midnight"
                                      ? "bg-[#2e7d32]/20 border border-[#2e7d32]/30 text-[#4caf50]"
                                      : "bg-green-50 border border-green-200 text-green-700"
                                  }`}>
                                    <CheckCircle className="w-3 h-3 text-green-500" />
                                    വായിച്ചു (Read)
                                  </span>
                                )}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <button 
                                onClick={() => toggleReadVerse(key)}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[11px] font-bold transition-all cursor-pointer select-none ${
                                  readVerses.includes(key)
                                    ? theme === "midnight"
                                      ? "bg-[#2e7d32]/20 border-[#2e7d32] text-[#4caf50]"
                                      : "bg-green-50 border-green-200 text-green-700"
                                    : "bg-bg-subcard border-border-main text-text-submuted hover:bg-bg-card hover:text-text-body"
                                }`}
                              >
                                <CheckCircle className={`w-3.5 h-3.5 ${
                                  readVerses.includes(key)
                                    ? theme === "midnight" ? "text-[#4caf50]" : "text-green-700"
                                    : "text-text-submuted"
                                }`} />
                                {readVerses.includes(key) ? "വായിച്ചു (Read)" : "വായിച്ചതായി അടയാളപ്പെടുത്തുക (Mark as Read)"}
                              </button>

                              <button 
                                onClick={() => toggleBookmark(key)}
                                className={`p-2 rounded-full border transition-colors cursor-pointer ${isBookmarked ? "bg-accent-main/20 border-accent-main text-accent-light" : "bg-bg-subcard border-border-main text-text-submuted hover:bg-bg-card hover:text-text-body"}`}
                              >
                                <Bookmark className="w-4 h-4" />
                              </button>
                            </div>
                          </div>

                          {/* Malayalam content commentary */}
                          <div className="space-y-4">
                            <span className="inline-block text-xs font-semibold text-accent-main uppercase tracking-wider bg-accent-main/10 border border-accent-main/20 px-2.5 py-1.5 rounded">
                              സംക്ഷിപ്ത അവലോകനം (Commentary)
                            </span>
                            <div className="space-y-3">
                              {verse.text.map((paragraph, index) => (
                                <p 
                                  key={index} 
                                  style={{ fontSize: `${18 + fontDelta}px`, lineHeight: "1.8" }}
                                  className="text-text-body font-serif leading-relaxed"
                                >
                                  {paragraph}
                                </p>
                              ))}
                            </div>
                          </div>

                          {/* Core Essence Highlight Box */}
                          {essenceVisible && (
                            <AnimatePresence>
                              <motion.div 
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: "auto" }}
                                exit={{ opacity: 0, height: 0 }}
                                className="bg-bg-subcard border-l-4 border-accent-main border-y border-r border-border-main p-4 rounded-r-xl mt-4"
                              >
                                <h5 className="text-xs font-bold text-accent-main flex items-center gap-1.5 mb-1">
                                  <Sparkles className="w-3.5 h-3.5" />
                                  പ്രധാന ആശയം (Core Essence)
                                </h5>
                                <p className="text-sm text-text-muted italic leading-relaxed">
                                  ഈ ഭാഗം മനുഷ്യജീവിതത്തിന് നൽകുന്ന ജീവസ്സുറ്റ പാഠം അല്ലെങ്കിൽ പ്രായോഗിക സന്ദേശം മുകളിൽ അടയാളപ്പെടുത്തിയിരിക്കുന്നു. വചനത്തിന്റെ അടിസ്ഥാന ആശയത്തിൽ ഉറച്ചുനിൽക്കുക.
                                </p>
                              </motion.div>
                            </AnimatePresence>
                          )}
                        </div>
                      );
                    })
                  ) : (
                    <div className="bg-bg-card rounded-2xl p-8 border border-border-main text-center space-y-4">
                      <BookOpen className="w-12 h-12 text-text-submuted mx-auto animate-bounce" />
                      <p className="text-text-muted font-medium font-serif text-lg">ഈ അധ്യായത്തിൽ നേരിട്ടുള്ള കയ്യെഴുത്തുപ്രതി വിവരങ്ങൾ ലഭ്യമല്ല.</p>
                      <p className="text-xs text-text-submuted max-w-md mx-auto leading-relaxed font-serif">
                        ഡിജിറ്റൽ കയ്യെഴുത്തുപ്രതിയുടെ ഈ വാല്യം പ്രധാന വിഷയങ്ങളെയും തിരഞ്ഞെടുത്ത വചനങ്ങളെയും അടിസ്ഥാനമാക്കിയുള്ളതാണ്. ദയവായി മുകളിലുള്ള <strong>'പണ്ഡിത അവലോകനം' (Scholarly Summary)</strong> ടാബ് തിരഞ്ഞെടുത്ത് ഈ സൂറത്തിന്റെ സമ്പൂർണ്ണ വിവരണം വായിക്കുക.
                      </p>
                      <button
                        onClick={() => setSurahTab("summary")}
                        className="px-5 py-2.5 bg-accent-main text-black hover:bg-opacity-90 rounded-full text-xs font-semibold shadow-md transition-all transform active:scale-95 cursor-pointer mt-2"
                      >
                        പണ്ഡിത അവലോകനം വായിക്കുക
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Bottom Sticky Controls Dock */}
              <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-bg-subcard border border-border-main shadow-xl rounded-2xl px-6 py-3 flex gap-6 items-center z-30">
                <button 
                  onClick={() => setEssenceVisible(!essenceVisible)}
                  className={`flex flex-col items-center gap-0.5 group transition-colors cursor-pointer ${essenceVisible ? "text-accent-main" : "text-text-submuted"}`}
                >
                  <Sparkles className="w-5 h-5 group-hover:scale-110 transition-transform" />
                  <span className="text-[10px] font-bold uppercase tracking-tight">Essence</span>
                </button>

                <div className="w-px h-8 bg-border-main" />

                <div className="flex items-center gap-3">
                  <button 
                     onClick={() => setFontDelta((prev) => Math.max(-4, prev - 2))}
                     className="p-1.5 bg-bg-card border border-border-main hover:bg-bg-subcard active:scale-95 transition-all rounded-lg cursor-pointer"
                  >
                    <Minus className="w-4 h-4 text-accent-main" />
                  </button>
                  <span className="text-xs font-bold text-text-muted uppercase">Size</span>
                  <button 
                     onClick={() => setFontDelta((prev) => Math.min(8, prev + 2))}
                     className="p-1.5 bg-bg-card border border-border-main hover:bg-bg-subcard active:scale-95 transition-all rounded-lg cursor-pointer"
                  >
                    <Plus className="w-4 h-4 text-accent-main" />
                  </button>
                </div>

                <div className="w-px h-8 bg-border-main" />

                <button 
                  onClick={() => setShowScholarChat(true)}
                  className="bg-accent-main text-black hover:bg-opacity-90 px-4 py-2 rounded-xl text-xs font-bold shadow-sm transition-all active:scale-95 cursor-pointer"
                >
                  Ask Scholar
                </button>
              </div>
            </motion.div>
          )}

          {/* Bookmarks View */}
          {activeView === "bookmarks" && (
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }}
              className="space-y-6"
            >
              <h2 className="text-2xl font-bold text-text-title flex items-center gap-2">
                <Bookmark className="w-6 h-6 text-accent-main" />
                നിങ്ങളുടെ ബുക്ക്‌മാർക്കുകൾ (Saved Commentaries)
              </h2>

              {bookmarks.length === 0 ? (
                <div className="bg-bg-card rounded-2xl p-8 border border-border-main text-center space-y-4">
                  <Bookmark className="w-12 h-12 text-text-submuted mx-auto" />
                  <p className="text-text-muted font-medium">ബുക്ക്‌മാർക്കുകൾ ഒന്നും തന്നെ ചേർത്തിട്ടില്ല.</p>
                  <p className="text-xs text-text-submuted">വചനങ്ങൾ വായിക്കുമ്പോൾ മുകളിൽ കാണുന്ന ബുക്ക്‌മാർക്ക് ഐക്കണിൽ ക്ലിക്ക് ചെയ്ത് സൂക്ഷിക്കാവുന്നതാണ്.</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {bookmarks.map((key) => {
                    const verse = verses[key];
                    if (!verse) return null;

                    return (
                      <div 
                        key={key}
                        className="bg-bg-card rounded-2xl p-6 border border-border-main shadow-sm space-y-4 relative transition-colors duration-300"
                      >
                        <div className="flex justify-between items-center border-b border-border-main pb-2">
                          <span className="text-xs font-bold text-text-muted">SURA {verse.surah} • AYAH {key}</span>
                          <button 
                            onClick={() => toggleBookmark(key)}
                            className="text-red-400 hover:text-red-300 hover:underline text-xs font-semibold cursor-pointer"
                          >
                            Remove
                          </button>
                        </div>
                        <div className="space-y-2">
                          {verse.text.map((p, idx) => (
                            <p key={idx} className="text-sm leading-relaxed text-text-body font-serif">{p}</p>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          )}
        </main>
      </div>

      {/* Floating Action / Ask Scholar Sidebar Chat */}
      <AnimatePresence>
        {showAuthorModal && (
          <>
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAuthorModal(false)}
              className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50"
            />

            {/* Author Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 350 }}
              className="fixed inset-0 m-auto max-w-md h-fit bg-bg-app border border-border-main rounded-3xl shadow-2xl p-6 md:p-8 z-50 overflow-hidden flex flex-col justify-between transition-colors duration-300"
            >
              <div className="space-y-6">
                {/* Header */}
                <div className="flex justify-between items-center border-b border-border-main pb-4">
                  <div className="flex items-center gap-2.5">
                    <User className="w-5 h-5 text-accent-main" />
                    <h3 className="text-lg font-bold text-text-title font-serif">ഗ്രന്ഥകർത്താവ് (Author)</h3>
                  </div>
                  <button 
                    onClick={() => setShowAuthorModal(false)}
                    className="p-1.5 rounded-full hover:bg-bg-subcard text-text-muted transition-colors cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Profile Visual */}
                <div className="flex flex-col items-center text-center space-y-3 py-2">
                  <div className="w-16 h-16 rounded-full bg-accent-main/10 border-2 border-accent-main flex items-center justify-center text-accent-main text-3xl font-bold font-serif shadow-sm">
                    M
                  </div>
                  <div>
                    <h4 className="text-xl font-bold text-text-title font-serif">Er. എ. കെ. മുഹമ്മദലി</h4>
                    <p className="text-xs text-accent-main font-semibold mt-0.5">ഖുർആൻ സംക്ഷിപ്ത അവലോകനം</p>
                  </div>
                </div>

                {/* Details list */}
                <div className="space-y-4 bg-bg-subcard p-4 rounded-2xl border border-border-main transition-colors duration-300">
                  <div className="flex items-start gap-3">
                    <MapPin className="w-5 h-5 text-accent-main mt-0.5 shrink-0" />
                    <div>
                      <p className="text-[10px] uppercase font-bold text-text-submuted tracking-wider">മേൽവിലാസം (Address)</p>
                      <p className="text-sm font-medium text-text-body mt-0.5 font-serif">ബാങ്ക് ജംഗ്ഷൻ, ആലുവ</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Phone className="w-5 h-5 text-accent-main mt-0.5 shrink-0" />
                    <div>
                      <p className="text-[10px] uppercase font-bold text-text-submuted tracking-wider">ഫോൺ നമ്പർ (Mobile)</p>
                      <a href="tel:9961170582" className="text-sm font-semibold text-text-title hover:text-accent-main hover:underline transition-all mt-0.5 block">
                        9961170582
                      </a>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Mail className="w-5 h-5 text-accent-main mt-0.5 shrink-0" />
                    <div>
                      <p className="text-[10px] uppercase font-bold text-text-submuted tracking-wider">ഇമെയിൽ (Email)</p>
                      <a href="mailto:mohamedaliak78@gmail.com" className="text-sm font-semibold text-text-title hover:text-accent-main hover:underline transition-all mt-0.5 block break-all">
                        mohamedaliak78@gmail.com
                      </a>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-3 pt-6 border-t border-border-main mt-6">
                <a
                  href="tel:9961170582"
                  className="flex items-center justify-center gap-2 py-3 bg-bg-subcard border border-border-main hover:bg-bg-card rounded-xl text-xs font-bold text-text-title transition-all text-center"
                >
                  <Phone className="w-4 h-4 text-accent-main" />
                  വിളിക്കുക (Call)
                </a>
                <a
                  href="https://wa.me/919961170582?text=Hello%20Er.%20Muhammedali,%20I%20am%20using%20the%20Quran%20Summary%20app"
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-center gap-2 py-3 bg-accent-main hover:bg-opacity-90 rounded-xl text-xs font-bold text-black transition-all text-center shadow-sm"
                >
                  <MessageSquare className="w-4 h-4" />
                  വാട്സാപ്പ് (WhatsApp)
                </a>
              </div>
            </motion.div>
          </>
        )}

        {showScholarChat && (
          <>
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowScholarChat(false)}
              className="fixed inset-0 bg-black z-50"
            />

            {/* Chat Drawer */}
            <motion.div 
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 right-0 max-w-md w-full bg-bg-app shadow-2xl border-l border-border-main z-50 flex flex-col justify-between transition-colors duration-300"
            >
              {/* Chat Header */}
              <div className="p-4 bg-bg-sidebar border-b border-border-main text-text-title flex justify-between items-center transition-colors duration-300">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-accent-main" />
                  <div>
                    <h3 className="font-bold text-sm">സ്കോളർ അസിസ്റ്റന്റ് (Ask Scholar)</h3>
                    <p className="text-[10px] text-text-muted opacity-80">
                      {scholarLanguage === "english" ? "Scholarly insights based on manuscript" : "കയ്യെഴുത്തുപ്രതിയെ അടിസ്ഥാനമാക്കിയുള്ള മറുപടികൾ"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2.5">
                  {scholarLanguage && (
                    <button
                      onClick={() => {
                        setScholarLanguage(null);
                        localStorage.removeItem("scholar_language");
                        setChatHistory([
                          {
                            sender: "bot",
                            text: "Please select your preferred language / ദയവായി നിങ്ങളുടെ മുൻഗണനാ ഭാഷ തിരഞ്ഞെടുക്കുക:",
                          }
                        ]);
                      }}
                      className="text-[10px] bg-bg-card hover:bg-bg-subcard text-accent-main border border-border-main py-1 px-2 rounded-lg font-bold cursor-pointer transition-all active:scale-95 flex items-center gap-1 shadow-sm font-sans"
                    >
                      <span>{scholarLanguage === "english" ? "EN" : "ML"}</span>
                      <span className="opacity-60 text-[8px] font-medium">(Change)</span>
                    </button>
                  )}
                  <button 
                    onClick={() => setShowScholarChat(false)}
                    className="p-1.5 rounded-full hover:bg-white/10 text-text-muted cursor-pointer transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Chat Messages */}
              <div className="flex-1 p-4 overflow-y-auto space-y-4">
                {chatHistory.map((msg, index) => (
                  <div 
                    key={index}
                    className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div className={`max-w-[85%] rounded-2xl p-4 text-sm leading-relaxed shadow-sm ${
                      msg.sender === "user" 
                        ? "bg-accent-main text-black rounded-br-none font-medium" 
                        : "bg-bg-card border border-border-main text-text-body rounded-bl-none transition-colors duration-300"
                    }`}>
                      <p className="font-serif leading-relaxed">{msg.text}</p>
                      
                      {msg.wa_link && (
                        <div className="mt-4 pt-3 border-t border-border-main">
                          <p className="text-xs text-text-muted mb-2 font-sans">
                            {scholarLanguage === "english"
                              ? "Need more clarity or 1-on-1 discussion on this doubt? You can connect directly via WhatsApp:"
                              : "ഈ സംശയത്തിന് കൂടുതൽ വ്യക്തതയോ 1-on-1 ചർച്ചയോ ആവശ്യമുണ്ടോ? നേരിട്ട് വാട്സാപ്പ് വഴി ചോദിക്കാവുന്നതാണ്:"}
                          </p>
                          <a 
                            href={msg.wa_link}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#25D366] hover:bg-[#20ba5a] text-white text-xs font-bold rounded-lg transition-all"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                            {scholarLanguage === "english" ? "Ask 1-on-1 via WhatsApp" : "Ask 1-on-1 via WhatsApp"}
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {scholarLanguage === null && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex justify-start"
                  >
                    <div className="bg-bg-card border border-border-main rounded-2xl rounded-bl-none p-5 w-full max-w-[85%] space-y-4 shadow-sm transition-colors duration-300">
                      <p className="text-xs text-text-title font-sans font-semibold tracking-wide">
                        Choose conversation language / സംഭാഷണ ഭാഷ തിരഞ്ഞെടുക്കുക:
                      </p>
                      <div className="grid grid-cols-2 gap-2.5">
                        <button
                          onClick={() => handleLanguageSelect("malayalam")}
                          className="flex flex-col items-center justify-center py-3 bg-accent-main text-black hover:bg-opacity-95 rounded-xl text-xs font-extrabold transition-all active:scale-95 cursor-pointer shadow-sm"
                        >
                          <span>മലയാളം</span>
                          <span className="text-[9px] font-medium opacity-80 mt-0.5 font-sans">Malayalam</span>
                        </button>
                        <button
                          onClick={() => handleLanguageSelect("english")}
                          className="flex flex-col items-center justify-center py-3 bg-bg-subcard hover:bg-bg-card text-text-title border border-border-main rounded-xl text-xs font-extrabold transition-all active:scale-95 cursor-pointer shadow-sm"
                        >
                          <span>English</span>
                          <span className="text-[9px] font-medium opacity-60 mt-0.5 font-sans">English</span>
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}

                {isQuerying && (
                  <div className="flex justify-start">
                    <div className="bg-bg-card border border-border-main rounded-2xl rounded-bl-none p-4 max-w-[85%] flex items-center gap-2 transition-colors duration-300">
                      <div className="flex space-x-1">
                        <span className="block w-2.5 h-2.5 bg-accent-main rounded-full animate-bounce delay-100" />
                        <span className="block w-2.5 h-2.5 bg-accent-main rounded-full animate-bounce delay-200" />
                        <span className="block w-2.5 h-2.5 bg-accent-main rounded-full animate-bounce delay-300" />
                      </div>
                      <span className="text-xs font-semibold text-text-submuted font-sans">
                        {scholarLanguage === "english" ? "Searching manuscript..." : "പഠനം നടത്തുന്നു..."}
                      </span>
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Chat Input */}
              <div className="p-4 bg-bg-subcard border-t border-border-main flex gap-2 transition-colors duration-300">
                <input
                  type="text"
                  placeholder={
                    scholarLanguage === null 
                      ? "Select language first / ആദ്യം ഭാഷ തിരഞ്ഞെടുക്കുക..."
                      : scholarLanguage === "english"
                        ? "Ask your doubts here... (e.g. 6:154)"
                        : "സംശയങ്ങൾ ഇവിടെ ചോദിക്കുക... (e.g. 6:154)"
                  }
                  value={chatInput}
                  disabled={scholarLanguage === null || isQuerying}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && scholarLanguage) handleScholarQuery(chatInput); }}
                  className="flex-1 bg-bg-card border border-border-main rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent-main/30 text-text-title placeholder:text-text-muted/60 transition-colors duration-300 disabled:opacity-50"
                />
                <button 
                  onClick={() => handleScholarQuery(chatInput)}
                  disabled={isQuerying || scholarLanguage === null || !chatInput.trim()}
                  className="bg-accent-main hover:bg-opacity-90 disabled:opacity-50 text-black px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center justify-center cursor-pointer font-serif"
                >
                  {scholarLanguage === "english" ? "Ask" : "ചോദിക്കുക"}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Footer */}
      <footer className="bg-bg-app border-t border-border-main py-8 px-4 text-center text-xs text-text-submuted mt-auto transition-colors duration-300">
        <div className="max-w-7xl mx-auto space-y-4">
          <p className="font-bold text-accent-main">ഖുർആൻ സംക്ഷിപ്ത അവലോകനം • Digital Sanctuary</p>
          
          <div className="bg-bg-card p-5 rounded-2xl border border-border-main max-w-md mx-auto space-y-2.5 shadow-sm">
            <p className="font-bold text-text-title font-serif text-sm">ഗ്രന്ഥകർത്താവ് (Author)</p>
            <p className="font-serif text-text-body font-medium">Er. എ. കെ. മുഹമ്മദലി</p>
            <p className="text-text-muted font-serif text-[11px]">ബാങ്ക് ജംഗ്ഷൻ, ആലുവ</p>
            <div className="flex items-center justify-center gap-3 text-[11px] pt-1 text-text-muted border-t border-border-main/50 mt-1">
              <span>Mob: <a href="tel:9961170582" className="text-accent-main font-semibold hover:underline">9961170582</a></span>
              <span className="opacity-30">|</span>
              <span>Email: <a href="mailto:mohamedaliak78@gmail.com" className="text-accent-main font-semibold hover:underline">mohamedaliak78@gmail.com</a></span>
            </div>
          </div>

          <p className="mt-4">This Quran Summary platform helps modern readers explore selected manuscripts and obtain scholarly responses.</p>
          <p className="opacity-75">All translation interpretations are derived from the specified pmd manuscript database.</p>
          
          <div className="pt-4 border-t border-border-main flex flex-col sm:flex-row items-center justify-between text-[10px] text-text-submuted/60 uppercase tracking-[0.2em] gap-2">
            <div>Source: PDM Manuscript v1.4</div>
            <div className="flex items-center gap-2 italic">
              <span>Scholarly Assistant is Online</span>
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
