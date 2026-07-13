import React, { useState, useEffect, useMemo, useRef } from "react";
import { 
  BookOpen, 
  Search, 
  Minus, 
  Plus, 
  Sun, 
  Moon, 
  ChevronLeft, 
  ChevronRight, 
  Volume2, 
  VolumeX, 
  X,
  Info,
  CheckCircle,
  Book,
  Menu,
  ChevronDown,
  User,
  Phone,
  Mail,
  MapPin,
  Home,
  Layers,
  Award,
  Bookmark,
  BookmarkCheck,
  Bug,
  Shield
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { allSurahs, SurahMeta } from "./data/all_surahs";
import { quranData, QuranVerse } from "./data/pmd_converted_content";
import { volume2Data } from "./data/volume2";

const allQuranData: Record<string, QuranVerse> = { ...quranData, ...volume2Data };

interface SanityChapterContent {
  _id?: string;
  title?: string;
  titleMal?: string;
  titleEng?: string;
  summary?: string;
  body?: string;
  content?: string;
  chapterNumber?: number;
  surahNumber?: number;
  versesCount?: number;
  revelation?: string;
  revelationMal?: string;
  _updatedAt?: string;
}

interface EReaderSection {
  id: string; // "intro_amukham" | "intro_vayanakar" | "intro_moksham" | "intro_grendha" | "surah_1" | "surah_114" ...
  title: string;
  titleEng: string;
  type: "intro" | "surah";
  key?: string; // for intro
  surahId?: number; // for surahs
  arabicName?: string;
  revelation?: string;
  versesCount?: number;
  description?: string;
}

interface Volume {
  id: number;
  titleMal: string;
  titleEng: string;
  description: string;
  chapterRange: string;
}

interface LineBookmark {
  sectionId: string;
  anchorId: string;
  sectionTitle: string;
  preview: string;
  savedAt: number;
}

interface HardcopyDemandStatus {
  floatLevel: number;
  demandStage: "collecting" | "building" | "almost_ready" | "ready_to_print";
  targetReached: boolean;
  hasVoted: boolean;
  notifyEligible: boolean;
}

interface BetaReportDraft {
  chapterId: string;
  sectionId: string;
  sectionTitle: string;
  anchorId: string;
  originalText: string;
}

interface BetaReportItem extends BetaReportDraft {
  id: string;
  suggestedText: string;
  issueType: string;
  note?: string;
  reporterName?: string;
  reporterContact?: string;
  status: "new" | "reviewing" | "fixed" | "rejected";
  resolutionNote?: string;
  createdAt: string;
  updatedAt: string;
}

const volumes: Volume[] = [
  {
    id: 1,
    titleMal: "വാല്യം 1: പ്രാരംഭവും ആരംഭവും",
    titleEng: "Volume 1: Introduction & Prologue",
    description: "ഗ്രന്ഥകർത്താവിന്റെ പഠന രൂപരേഖയും, അൽ-ഫാത്തിഹ ഉൾക്കൊള്ളുന്ന പ്രാരംഭ അധ്യായവും.",
    chapterRange: "ആമുഖം - സൂറത്ത് 1"
  },
  {
    id: 2,
    titleMal: "വാല്യം 2: വചന ക്രമം (114 - 41)",
    titleEng: "Volume 2: Chapters 114 - 41",
    description: "സൃഷ്ടിപ്പ്, അന്ത്യദിന ചിന്തകൾ, ആത്മീയ ഗുണപാഠങ്ങൾ എന്നിവ ഉൾക്കൊള്ളുന്ന വചനങ്ങൾ.",
    chapterRange: "സൂറത്ത് 114 - 41"
  },
  {
    id: 3,
    titleMal: "വാല്യം 3: വചന ക്രമം (40 - 20)",
    titleEng: "Volume 3: Chapters 40 - 20",
    description: "പ്രകൃതിയിലെ അദ്ഭുതങ്ങൾ, ചരിത്രപരമായ പാഠങ്ങൾ, പരലോക രക്ഷ എന്നിവ വിവരിക്കുന്ന ഭാഗം.",
    chapterRange: "സൂറത്ത് 40 - 20"
  },
  {
    id: 4,
    titleMal: "വാല്യം 4: വചന ക്രമം (19 - 7)",
    titleEng: "Volume 4: Chapters 19 - 7",
    description: "ധാർമ്മിക ഉപദേശങ്ങൾ, ഏകദൈവ വിശ്വാസം, സന്മാർഗ രേഖകൾ എന്നിവയുടെ പ്രതിപാദനം.",
    chapterRange: "സൂറത്ത് 19 - 7"
  },
  {
    id: 5,
    titleMal: "വാല്യം 5: വചന ക്രമം (6 - 2)",
    titleEng: "Volume 5: Chapters 6 - 2",
    description: "സാമൂഹിക നിയമങ്ങൾ, കുടുംബജീവിതം, പ്രവാചക ചരിത്രങ്ങൾ എന്നിവ ഉൾക്കൊള്ളുന്ന വലിയ അധ്യായങ്ങൾ.",
    chapterRange: "സൂറത്ത് 6 - 2"
  }
];

const getVolumeForSection = (item: EReaderSection): number => {
  if (item.type === "intro" || item.surahId === 1) {
    return 1;
  }
  const sId = item.surahId;
  if (sId) {
    if (sId >= 41 && sId <= 114) return 2;
    if (sId >= 20 && sId <= 40) return 3;
    if (sId >= 7 && sId <= 19) return 4;
    if (sId >= 2 && sId <= 6) return 5;
  }
  return 5; // Fallback
};

export default function App() {
  const mainScrollRef = useRef<HTMLElement>(null);

  // Theme and UI States
  const [theme, setTheme] = useState<"midnight" | "white">(() => {
    const saved = localStorage.getItem("quran_theme");
    return (saved === "midnight" || saved === "white") ? (saved as "midnight" | "white") : "midnight";
  });
  const [fontDelta, setFontDelta] = useState<number>(() => {
    const saved = localStorage.getItem("quran_font_delta");
    return saved ? parseInt(saved, 10) : 0;
  });
  
  // Dashboard & Volume states
  const [viewMode, setViewMode] = useState<"dashboard" | "reader">("dashboard");
  const [selectedVolumeId, setSelectedVolumeId] = useState<number | null>(null);
  const [expandedVolumes, setExpandedVolumes] = useState<Record<number, boolean>>({
    1: true,
    2: false,
    3: false,
    4: false,
    5: false,
  });

  // Navigation States
  const [activeSectionId, setActiveSectionId] = useState<string>("intro_amukham");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showAuthorModal, setShowAuthorModal] = useState(false);
  const [showHardcopyModal, setShowHardcopyModal] = useState(false);
  const [hardcopyForm, setHardcopyForm] = useState({ name: "", phone: "", address: "", email: "" });
  const [hardcopySubmitState, setHardcopySubmitState] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [hardcopyMessage, setHardcopyMessage] = useState("");
  const [hardcopyStatus, setHardcopyStatus] = useState<HardcopyDemandStatus>({
    floatLevel: 0,
    demandStage: "collecting",
    targetReached: false,
    hasVoted: false,
    notifyEligible: false,
  });
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportDraft, setReportDraft] = useState<BetaReportDraft | null>(null);
  const [reportForm, setReportForm] = useState({
    issueType: "unicode",
    suggestedText: "",
    note: "",
    reporterName: "",
    reporterContact: "",
  });
  const [reportSubmitState, setReportSubmitState] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [reportMessage, setReportMessage] = useState("");
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [adminUserId, setAdminUserId] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [adminLoggedIn, setAdminLoggedIn] = useState(false);
  const [adminReports, setAdminReports] = useState<BetaReportItem[]>([]);
  const [adminStatusMessage, setAdminStatusMessage] = useState("");
  const [adminLoading, setAdminLoading] = useState(false);

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  
  // Audio Speech state
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speakingKey, setSpeakingKey] = useState<string | null>(null);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [playbackRate, setPlaybackRate] = useState<number>(1);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Read progress tracker
  const [readSections, setReadSections] = useState<string[]>(() => {
    const saved = localStorage.getItem("quran_read_sections");
    return saved ? JSON.parse(saved) : [];
  });
  const [lineBookmark, setLineBookmark] = useState<LineBookmark | null>(() => {
    const saved = localStorage.getItem("quran_line_bookmark");
    if (!saved) return null;
    try {
      return JSON.parse(saved) as LineBookmark;
    } catch {
      return null;
    }
  });
  const [highlightedLineId, setHighlightedLineId] = useState<string | null>(null);

  // Highlighted search item scroll reference
  const [highlightedVerseKey, setHighlightedVerseKey] = useState<string | null>(null);
  const [sanityChapterContent, setSanityChapterContent] = useState<SanityChapterContent | null>(null);
  const [sanityChapterLoadState, setSanityChapterLoadState] = useState<"idle" | "loading" | "ready" | "empty" | "error">("idle");
  const [isSectionLoading, setIsSectionLoading] = useState(false);
  const sanityChapterCacheRef = useRef<Record<number, SanityChapterContent | null>>({});
  const historySyncBlockedRef = useRef(false);
  const historyBootstrappedRef = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

    const syncVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      setAvailableVoices(voices);
    };

    syncVoices();
    window.speechSynthesis.onvoiceschanged = syncVoices;

    return () => {
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, []);

  const parseJsonSafe = async (response: Response) => {
    const raw = await response.text();
    if (!raw) return {} as any;

    try {
      return JSON.parse(raw);
    } catch {
      return {
        status: response.ok ? "success" : "error",
        message: raw || `HTTP ${response.status}`,
      };
    }
  };

  const normalizeMalayalamSpacing = (text: string) => {
    return text
      .replace(/\u00A0/g, " ")
      .replace(/[ \t]{2,}/g, " ")
      .replace(/\s+([,.;:!?])/g, "$1")
      .replace(/\(\s+/g, "(")
      .replace(/\s+\)/g, ")")
      .trim();
  };

  const loadHardcopyStatus = async () => {
    try {
      const voteId = localStorage.getItem("quran_hardcopy_vote_id") || "";
      const url = voteId ? `/api/hardcopy-vote/status?voteId=${encodeURIComponent(voteId)}` : "/api/hardcopy-vote/status";
      const response = await fetch(url);
      const payload = await parseJsonSafe(response);

      if (payload?.status === "success") {
        setHardcopyStatus({
          floatLevel: Number(payload.floatLevel || 0),
          demandStage: payload.demandStage || "collecting",
          targetReached: Boolean(payload.targetReached),
          hasVoted: Boolean(payload.hasVoted),
          notifyEligible: Boolean(payload.notifyEligible),
        });
      }
    } catch (error) {
      console.error("Failed to load hard copy status:", error);
    }
  };

  useEffect(() => {
    loadHardcopyStatus();
  }, []);

  const handleSubmitHardcopyVote = async (e: React.FormEvent) => {
    e.preventDefault();
    setHardcopySubmitState("submitting");
    setHardcopyMessage("");

    try {
      const response = await fetch("/api/hardcopy-vote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(hardcopyForm),
      });
      const payload = await parseJsonSafe(response);

      if (!response.ok || payload?.status !== "success") {
        throw new Error(payload?.message || "Submission failed");
      }

      if (payload.voteId) {
        localStorage.setItem("quran_hardcopy_vote_id", payload.voteId);
      }

      setHardcopySubmitState("success");
      setHardcopyMessage(
        payload.targetReached
          ? "ഹാർഡ് കോപ്പി പ്രിന്റിംഗിനായി തയ്യാറാണ്! ഉടൻ ബന്ധപ്പെടുന്നതാണ്."
          : "താങ്കളുടെ ഹാർഡ് കോപ്പി വോട്ട് സ്വീകരിച്ചു. പ്രിന്റിംഗ് ഘട്ടം എത്തിയാൽ അറിയിപ്പ് ലഭിക്കും."
      );
      await loadHardcopyStatus();
    } catch (error: any) {
      setHardcopySubmitState("error");
      setHardcopyMessage(error?.message || "വോട്ട് സമർപ്പിക്കാൻ കഴിഞ്ഞില്ല.");
    }
  };

  const openReportModal = (draft: BetaReportDraft) => {
    setReportDraft(draft);
    setReportForm({
      issueType: "unicode",
      suggestedText: "",
      note: "",
      reporterName: "",
      reporterContact: "",
    });
    setReportSubmitState("idle");
    setReportMessage("");
    setShowReportModal(true);
  };

  const handleSubmitBetaReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportDraft) return;

    setReportSubmitState("submitting");
    setReportMessage("");

    try {
      const response = await fetch("/api/beta-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...reportDraft, ...reportForm }),
      });
      const payload = await parseJsonSafe(response);

      if (!response.ok || payload?.status !== "success") {
        throw new Error(payload?.message || "Report submit failed");
      }

      setReportSubmitState("success");
      setReportMessage("റിപ്പോർട്ട് സ്വീകരിച്ചു. നന്ദി — ടീം പരിശോധിച്ച് തിരുത്തും.");
      setTimeout(() => setShowReportModal(false), 900);
    } catch (error: any) {
      setReportSubmitState("error");
      setReportMessage(error?.message || "റിപ്പോർട്ട് സമർപ്പിക്കാൻ കഴിഞ്ഞില്ല.");
    }
  };

  const loadAdminReports = async (credentials?: { userId: string; password: string }) => {
    const userId = credentials?.userId ?? adminUserId;
    const password = credentials?.password ?? adminPassword;

    if (!userId.trim() || !password.trim()) {
      setAdminStatusMessage("ആദ്യം login ചെയ്യുക.");
      return;
    }

    setAdminLoading(true);
    setAdminStatusMessage("");

    try {
      const response = await fetch("/api/admin/beta-reports", {
        headers: {
          "x-admin-user-id": userId,
          "x-admin-password": password,
        },
      });
      const payload = await parseJsonSafe(response);

      if (!response.ok || payload?.status !== "success") {
        throw new Error(payload?.message || "Unauthorized");
      }

      setAdminReports(payload.reports || []);
      setAdminStatusMessage("Reports loaded.");
    } catch (error: any) {
      setAdminStatusMessage(error?.message || "Failed to load reports");
    } finally {
      setAdminLoading(false);
    }
  };

  const handleAdminLogin = async () => {
    if (!adminUserId.trim() || !adminPassword.trim()) {
      setAdminStatusMessage("User IDയും Passwordയും നൽകുക.");
      return;
    }

    setAdminLoading(true);
    setAdminStatusMessage("");
    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: adminUserId, password: adminPassword }),
      });
      const payload = await parseJsonSafe(response);

      if (!response.ok || payload?.status !== "success") {
        throw new Error(payload?.message || "Invalid admin credentials");
      }

      setAdminLoggedIn(true);
      setAdminStatusMessage("Login success.");
      await loadAdminReports({ userId: adminUserId, password: adminPassword });
    } catch (error: any) {
      setAdminLoggedIn(false);
      setAdminStatusMessage(error?.message || "Login failed");
    } finally {
      setAdminLoading(false);
    }
  };

  const updateReportStatus = async (id: string, status: BetaReportItem["status"]) => {
    if (!adminLoggedIn) {
      setAdminStatusMessage("Admin login required.");
      return;
    }

    try {
      const response = await fetch(`/api/admin/beta-reports/${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-admin-user-id": adminUserId,
          "x-admin-password": adminPassword,
        },
        body: JSON.stringify({ status }),
      });
      const payload = await parseJsonSafe(response);
      if (!response.ok || payload?.status !== "success") {
        throw new Error(payload?.message || "Update failed");
      }

      setAdminReports(prev => prev.map(r => (r.id === id ? { ...r, status } : r)));
      setAdminStatusMessage("Updated.");
    } catch (error: any) {
      setAdminStatusMessage(error?.message || "Update failed");
    }
  };

  useEffect(() => {
    if (showAdminPanel) {
      setAdminLoggedIn(false);
      setAdminReports([]);
      setAdminStatusMessage("");
    }
  }, [showAdminPanel]);

  useEffect(() => {
    if (viewMode === "reader") {
      setIsSectionLoading(true);
    }
  }, [activeSectionId, viewMode]);

  // Apply Theme CSS variables to root element
  useEffect(() => {
    const root = document.documentElement;
    const currentThemeVars = theme === "midnight" ? {
      "--bg-app": "#090a0b",
      "--bg-header": "#0f1112",
      "--bg-sidebar": "#0c0d0e",
      "--bg-card": "#141618",
      "--bg-subcard": "#0d0e10",
      "--border-main": "#222428",
      "--text-title": "#f5f5f0",
      "--text-body": "#d1d1ca",
      "--text-muted": "#96968d",
      "--text-submuted": "#6b6b64",
      "--color-accent": "#d4af37",
      "--color-accent-light": "#ffebaa",
    } : {
      "--bg-app": "#faf8f5",
      "--bg-header": "#ffffff",
      "--bg-sidebar": "#f5f3ef",
      "--bg-card": "#ffffff",
      "--bg-subcard": "#edeae4",
      "--border-main": "#e6e3dd",
      "--text-title": "#1c1a17",
      "--text-body": "#3c3833",
      "--text-muted": "#66615b",
      "--text-submuted": "#8c867e",
      "--color-accent": "#b58c24",
      "--color-accent-light": "#785600",
    };

    Object.entries(currentThemeVars).forEach(([key, value]) => {
      root.style.setProperty(key, value);
    });
    localStorage.setItem("quran_theme", theme);
  }, [theme]);

  // Persist Font scale
  useEffect(() => {
    localStorage.setItem("quran_font_delta", fontDelta.toString());
  }, [fontDelta]);

  // Persist line bookmark
  useEffect(() => {
    if (lineBookmark) {
      localStorage.setItem("quran_line_bookmark", JSON.stringify(lineBookmark));
    } else {
      localStorage.removeItem("quran_line_bookmark");
    }
  }, [lineBookmark]);

  // Save read chapters to localStorage
  const markAsRead = (id: string) => {
    if (!readSections.includes(id)) {
      const updated = [...readSections, id];
      setReadSections(updated);
      localStorage.setItem("quran_read_sections", JSON.stringify(updated));
    }
  };

  const toggleReadStatus = (id: string) => {
    const updated = readSections.includes(id) 
      ? readSections.filter(x => x !== id)
      : [...readSections, id];
    setReadSections(updated);
    localStorage.setItem("quran_read_sections", JSON.stringify(updated));
  };

  // Build sequential data structures
  const sequence: EReaderSection[] = useMemo(() => {
    const list: EReaderSection[] = [
      {
        id: "intro_amukham",
        title: "ആമുഖം",
        titleEng: "Amukham",
        type: "intro",
        key: "6:154",
        description: "ഗ്രന്ഥകർത്താവായ Er. എ. കെ. മുഹമ്മദലിയുടെ ആമുഖ പഠനവും രൂപരേഖയും"
      },
      {
        id: "intro_vayanakar",
        title: "വായനക്കാരുടെ ശ്രദ്ധയ്ക്ക്",
        titleEng: "Vayanakarude Sredhekke",
        type: "intro",
        key: "52:2",
        description: "ഗ്രന്ഥപാരായണത്തിന് മുന്നോടിയായി വായനക്കാർ ശ്രദ്ധിക്കേണ്ട കാര്യങ്ങൾ"
      },
      {
        id: "intro_moksham",
        title: "മോക്ഷം",
        titleEng: "Moksham",
        type: "intro",
        key: "29:48",
        description: "മോക്ഷപ്രാപ്തിയെക്കുറിച്ചും വേദഗ്രന്ഥങ്ങളിലെ മൗലിക സത്യങ്ങളെക്കുറിച്ചുമുള്ള പ്രതിപാദനം"
      },
      {
        id: "intro_grendha",
        title: "ഗ്രന്ഥപരിശോധകന്റെ പ്രസ്താവന",
        titleEng: "Grendha Parikshothakante Presthavana",
        type: "intro",
        key: "2:61",
        description: "ഗ്രന്ഥപരിശോധകൻ സമർപ്പിക്കുന്ന പ്രസ്താവനയും വിവരണങ്ങളും"
      }
    ];

    // Second: Surah 1 (Al-Fatihah)
    const s1 = allSurahs.find(s => s.id === 1);
    if (s1) {
      list.push({
        id: "surah_1",
        title: "അൽ-ഫാത്തിഹ",
        titleEng: "Al-Fatihah",
        type: "surah",
        surahId: 1,
        arabicName: s1.arabicName,
        revelation: s1.revelation,
        versesCount: s1.versesCount,
        description: s1.description
      });
    }

    // Third: Proceed in strictly descending order from Surah 114 down to Surah 2
    const otherSurahs = allSurahs.filter(s => s.id >= 2 && s.id <= 114);
    otherSurahs.sort((a, b) => b.id - a.id);

    otherSurahs.forEach(s => {
      list.push({
        id: `surah_${s.id}`,
        title: s.nameMal || s.name,
        titleEng: s.name,
        type: "surah",
        surahId: s.id,
        arabicName: s.arabicName,
        revelation: s.revelation,
        versesCount: s.versesCount,
        description: s.description
      });
    });

    return list;
  }, []);

  // Compute active index
  const activeIndex = useMemo(() => {
    return sequence.findIndex(item => item.id === activeSectionId);
  }, [activeSectionId, sequence]);

  const activeSection = sequence[activeIndex] || sequence[0];

  // Helper to get reading progress per volume
  const getVolumeProgress = (volId: number) => {
    const volSections = sequence.filter(s => getVolumeForSection(s) === volId);
    const total = volSections.length;
    const completed = volSections.filter(s => readSections.includes(s.id)).length;
    const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { total, completed, percent };
  };

  const quranSections = useMemo(() => sequence.filter((s) => s.type === "surah"), [sequence]);
  const totalQuranChapters = quranSections.length;
  const readQuranChapters = quranSections.filter((s) => readSections.includes(s.id)).length;
  const quranProgressPercent = totalQuranChapters > 0 ? Math.round((readQuranChapters / totalQuranChapters) * 100) : 0;

  // Sync expanded volume state on active section change
  useEffect(() => {
    if (activeSection) {
      const volId = getVolumeForSection(activeSection);
      setExpandedVolumes(prev => ({ ...prev, [volId]: true }));
    }
  }, [activeSectionId, activeSection]);

  useEffect(() => {
    if (typeof window === "undefined" || historyBootstrappedRef.current) return;

    window.history.replaceState(
      {
        appViewMode: viewMode,
        appActiveSectionId: activeSectionId,
        appSelectedVolumeId: selectedVolumeId,
      },
      ""
    );

    historyBootstrappedRef.current = true;
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const onPopState = (event: PopStateEvent) => {
      const state = event.state as {
        appViewMode?: "dashboard" | "reader";
        appActiveSectionId?: string;
        appSelectedVolumeId?: number | null;
      } | null;

      if (!state) return;

      historySyncBlockedRef.current = true;
      stopSpeaking();
      setSidebarOpen(false);
      setShowAuthorModal(false);
      setShowHardcopyModal(false);

      if (state.appViewMode === "dashboard" || state.appViewMode === "reader") {
        setViewMode(state.appViewMode);
      }
      if (typeof state.appSelectedVolumeId === "number" || state.appSelectedVolumeId === null) {
        setSelectedVolumeId(state.appSelectedVolumeId);
      }
      if (typeof state.appActiveSectionId === "string") {
        setActiveSectionId(state.appActiveSectionId);
      }

      window.setTimeout(() => {
        historySyncBlockedRef.current = false;
      }, 0);
    };

    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!historyBootstrappedRef.current) return;
    if (historySyncBlockedRef.current) return;

    window.history.pushState(
      {
        appViewMode: viewMode,
        appActiveSectionId: activeSectionId,
        appSelectedVolumeId: selectedVolumeId,
      },
      ""
    );
  }, [viewMode, activeSectionId, selectedVolumeId]);

  useEffect(() => {
    const loadSanityChapter = async () => {
      if (activeSection.type !== "surah" || !activeSection.surahId) {
        setSanityChapterContent(null);
        setSanityChapterLoadState("idle");
        return;
      }

      const chapterNumber = activeSection.surahId;
      if (Object.prototype.hasOwnProperty.call(sanityChapterCacheRef.current, chapterNumber)) {
        const cached = sanityChapterCacheRef.current[chapterNumber];
        setSanityChapterContent(cached);
        setSanityChapterLoadState(cached ? "ready" : "empty");
        return;
      }

      setSanityChapterLoadState("loading");
      try {
        const response = await fetch(`/api/sanity/chapter?chapterNumber=${chapterNumber}`);
        const payload = await parseJsonSafe(response);
        const data = (payload?.chapter ?? payload?.data ?? null) as SanityChapterContent | null;

        sanityChapterCacheRef.current[chapterNumber] = data;
        setSanityChapterContent(data);
        setSanityChapterLoadState(data ? "ready" : "empty");
      } catch (error) {
        console.error("Failed to load Sanity chapter content:", error);
        setSanityChapterContent(null);
        setSanityChapterLoadState("error");
      }
    };

    loadSanityChapter();
  }, [activeSection.id, activeSection.type, activeSection.surahId]);

  useEffect(() => {
    if (activeSection.type !== "surah") return;

    const neighborIds = [
      sequence[activeIndex - 1]?.surahId,
      sequence[activeIndex + 1]?.surahId,
    ].filter((id): id is number => typeof id === "number");

    neighborIds.forEach((chapterNumber) => {
      if (Object.prototype.hasOwnProperty.call(sanityChapterCacheRef.current, chapterNumber)) return;
      fetch(`/api/sanity/chapter?chapterNumber=${chapterNumber}`)
        .then((r) => parseJsonSafe(r))
        .then((payload) => {
          const data = (payload?.chapter ?? payload?.data ?? null) as SanityChapterContent | null;
          sanityChapterCacheRef.current[chapterNumber] = data;
        })
        .catch(() => {
          // ignore prefetch failure
        });
    });
  }, [activeIndex, activeSection.type, sequence]);

  useEffect(() => {
    if (viewMode !== "reader") {
      setIsSectionLoading(false);
      return;
    }

    if (activeSection.type === "surah") {
      if (["ready", "empty", "error"].includes(sanityChapterLoadState)) {
        setIsSectionLoading(false);
      }
      return;
    }

    const timer = setTimeout(() => setIsSectionLoading(false), 200);
    return () => clearTimeout(timer);
  }, [activeSection.type, sanityChapterLoadState, viewMode]);

  // Helper to extract available verses for a Surah
  const getVersesForSurah = (surahId: number) => {
    const filtered: [string, QuranVerse][] = [];
    for (const [key, val] of Object.entries(allQuranData)) {
      // Skip the 4 unique introductory keys to avoid duplicated views
      if (["6:154", "52:2", "29:48", "2:61"].includes(key)) {
        continue;
      }

      let isMatch = false;
      if (surahId === 1) {
        if (val.surah === 1) {
          isMatch = true;
        }
      } else {
        // Match chapter pattern like "അദ്ധ്യായം 1" or "അധ്യായം 1" in context_chapter
        if (val.context_chapter) {
          const cleanContext = val.context_chapter.trim();
          // Only treat as specific chapter if context_chapter is exactly "അധ്യായം N" or "അദ്ധ്യായം N"
          const chapterMatch = cleanContext.match(/^(?:അധ്യായം|അദ്ധ്യായം)\s*(\d+)$/);
          if (chapterMatch) {
            const chapNum = parseInt(chapterMatch[1], 10);
            if (chapNum === surahId) {
              isMatch = true;
            }
          }
        }

        if (val.surah === surahId) {
          isMatch = true;
        }
      }

      if (isMatch) {
        filtered.push([key, val]);
      }
    }

    // Sort logically by surah:ayah
    filtered.sort((a, b) => {
      const [aS, aA] = a[0].split(":").map(Number);
      const [bS, bA] = b[0].split(":").map(Number);
      if (aS !== bS) return aS - bS;
      return aA - bA;
    });

    return filtered;
  };

  // Get active reading view verses
  const currentVerses = useMemo(() => {
    if (activeSection.type === "intro" && activeSection.key) {
      const verse = allQuranData[activeSection.key];
      return verse ? [[activeSection.key, verse] as [string, QuranVerse]] : [];
    } else if (activeSection.surahId) {
      return getVersesForSurah(activeSection.surahId);
    }
    return [];
  }, [activeSection]);

  const sanityChapterParagraphs = useMemo(() => {
    const raw = sanityChapterContent?.content || sanityChapterContent?.body || "";
    if (!raw) return [];

    return raw
      .split(/\r?\n\r?\n|\r?\n/)
      .map((part) => normalizeMalayalamSpacing(part.trim()))
      .filter(Boolean);
  }, [sanityChapterContent]);

  const renderPlaybackSpeedControl = () => (
    <label className="inline-flex items-center gap-1 text-[10px] font-bold text-text-muted">
      <span>Speed</span>
      <select
        value={playbackRate}
        onChange={(e) => {
          const nextRate = Number(e.target.value);
          setPlaybackRate(nextRate);
          if (audioRef.current) {
            try {
              (audioRef.current as HTMLAudioElement).playbackRate = nextRate;
            } catch {
              // no-op for synthetic audioRef wrappers
            }
          }
        }}
        className="bg-bg-subcard border border-border-main rounded-md px-1.5 py-1 text-[10px] text-text-title cursor-pointer"
        aria-label="Audio playback speed"
      >
        <option value={0.75}>0.75x</option>
        <option value={0.9}>0.9x</option>
        <option value={1}>1x</option>
        <option value={1.1}>1.1x</option>
        <option value={1.25}>1.25x</option>
      </select>
    </label>
  );

  // Read Aloud handler
  const handleReadAloud = (key: string, textArray: string[]) => {
    if (isSpeaking && speakingKey === key) {
      stopSpeaking();
      return;
    }

    stopSpeaking();

    setIsSpeaking(true);
    setSpeakingKey(key);

    const fullText = textArray.map(normalizeMalayalamSpacing).join(" ");
    const cleanText = fullText
      .replace(/\(\s*\d+:\s*\d+\s*\)/g, "")
      // Pronunciation normalization for key Arabic-origin terms in Malayalam TTS
      .replace(/അല്ലാഹു/g, "അല്ലാഹൂ")
      .replace(/അല്-ലാഹു|അൽ-ലാഹു|അൽ ലാഹു/g, "അല്ലാഹൂ")
      .replace(/\s+/g, " ")
      .trim();

    const speakWithWebSpeech = () => {
      if (typeof window === "undefined" || !("speechSynthesis" in window)) return false;

      const synth = window.speechSynthesis;
      synth.cancel();

      const voices = availableVoices.length ? availableVoices : synth.getVoices();
      const mlVoice = voices.find(v => v.lang.toLowerCase().startsWith("ml"));

      // Only use browser speech when a real Malayalam voice is present.
      // Otherwise fallback to /api/tts (forced Malayalam via tl=ml).
      if (!mlVoice) return false;

      const splitForSpeech = (text: string, maxLen = 350) => {
        const segments = text.split(/(?<=[.!?।])\s+/);
        const chunks: string[] = [];
        let buffer = "";

        for (const seg of segments) {
          if (!seg) continue;
          if ((buffer + " " + seg).trim().length > maxLen) {
            if (buffer.trim()) chunks.push(buffer.trim());
            buffer = seg;
          } else {
            buffer = `${buffer} ${seg}`.trim();
          }
        }

        if (buffer.trim()) chunks.push(buffer.trim());
        return chunks.length ? chunks : [text];
      };

      const chunks = splitForSpeech(cleanText);
      let idx = 0;

      const speakNext = () => {
        if (idx >= chunks.length) {
          setIsSpeaking(false);
          setSpeakingKey(null);
          return;
        }

        const utterance = new SpeechSynthesisUtterance(chunks[idx]);
        utterance.lang = mlVoice?.lang || "ml-IN";
        if (mlVoice) utterance.voice = mlVoice;
        utterance.rate = playbackRate;
        utterance.pitch = 1;

        utterance.onend = () => {
          idx += 1;
          speakNext();
        };

        utterance.onerror = (e) => {
          console.error("Web Speech synthesis error:", e);
          setIsSpeaking(false);
          setSpeakingKey(null);
        };

        audioRef.current = {
          pause: () => {
            synth.cancel();
          }
        } as any;

        synth.speak(utterance);
      };

      speakNext();
      return true;
    };

    // Prefer instant client-side Malayalam speech first (no network wait)
    const started = speakWithWebSpeech();
    if (started) return;

    // Fallback to server-side Malayalam TTS only if browser Malayalam voice is unavailable
    // Cap URL payload to keep request reliable across browsers/proxies.
    const ttsText = cleanText.substring(0, 1200);
    if (!ttsText) {
      setIsSpeaking(false);
      setSpeakingKey(null);
      return;
    }

    const audioUrl = `/api/tts?text=${encodeURIComponent(ttsText)}`;
    const audio = new Audio(audioUrl);
    audio.preload = "auto";
    audio.playbackRate = playbackRate;
    audioRef.current = audio;

    audio.play().catch(err => {
      console.warn("Audio playback failed:", err);
      setIsSpeaking(false);
      setSpeakingKey(null);
    });

    audio.onended = () => {
      setIsSpeaking(false);
      setSpeakingKey(null);
    };
  };

  const stopSpeaking = () => {
    if (audioRef.current) {
      try {
        audioRef.current.pause();
      } catch (e) {
        console.warn("Could not pause audioRef:", e);
      }
      audioRef.current = null;
    }
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
    setSpeakingKey(null);
  };

  // Local exact search of manuscript text
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];

    const query = searchQuery.toLowerCase().trim();
    const results: {
      key: string;
      verse: QuranVerse;
      section: EReaderSection;
      matchingParagraph: string;
    }[] = [];

    // Search introductory chapters first
    const introSections = sequence.filter(s => s.type === "intro");
    introSections.forEach(sec => {
      if (sec.key && allQuranData[sec.key]) {
        const v = allQuranData[sec.key];
        const normalizedParagraphs = v.text.map(normalizeMalayalamSpacing);
        const matchPar = normalizedParagraphs.find(p => p.toLowerCase().includes(query));
        if (matchPar) {
          results.push({ key: sec.key, verse: v, section: sec, matchingParagraph: matchPar });
        }
      }
    });

    // Search Surah chapters
    const surahSections = sequence.filter(s => s.type === "surah");
    surahSections.forEach(sec => {
      if (sec.surahId) {
        const vList = getVersesForSurah(sec.surahId);
        vList.forEach(([key, verse]) => {
          const normalizedParagraphs = verse.text.map(normalizeMalayalamSpacing);
          const matchPar = normalizedParagraphs.find(p => p.toLowerCase().includes(query));
          if (matchPar) {
            results.push({ key, verse, section: sec, matchingParagraph: matchPar });
          }
        });
      }
    });

    return results;
  }, [searchQuery, sequence]);

  // Navigate to a specific section and scroll to verse key
  const handleSearchResultClick = (sectionId: string, verseKey: string) => {
    setActiveSectionId(sectionId);
    setHighlightedVerseKey(verseKey);
    setSearchQuery("");
    setSidebarOpen(false);

    // Give react render cycle a brief moment, then scroll
    setTimeout(() => {
      const element = document.getElementById(`verse-card-${verseKey}`);
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "center" });
        element.classList.add("ring-2", "ring-amber-500", "transition-all", "duration-500");
        setTimeout(() => {
          element.classList.remove("ring-2", "ring-amber-500");
        }, 3000);
      }
    }, 200);
  };

  const scrollToLineAnchor = (anchorId: string) => {
    const el = document.getElementById(anchorId);
    if (!el) return false;

    el.scrollIntoView({ behavior: "smooth", block: "center" });
    setHighlightedLineId(anchorId);
    setTimeout(() => setHighlightedLineId((prev) => (prev === anchorId ? null : prev)), 2600);
    return true;
  };

  const handleSaveLineBookmark = (anchorId: string, previewText: string) => {
    const preview = normalizeMalayalamSpacing(previewText).slice(0, 90);
    setLineBookmark({
      sectionId: activeSection.id,
      anchorId,
      sectionTitle: activeSection.title,
      preview,
      savedAt: Date.now(),
    });
  };

  const handleGoToBookmark = () => {
    if (!lineBookmark) return;

    stopSpeaking();
    setViewMode("reader");
    if (activeSectionId !== lineBookmark.sectionId) {
      setActiveSectionId(lineBookmark.sectionId);
    }

    const anchorToFind = lineBookmark.anchorId;
    let tries = 0;
    const maxTries = 14;

    const tryScroll = () => {
      const ok = scrollToLineAnchor(anchorToFind);
      if (ok) return;
      tries += 1;
      if (tries < maxTries) {
        setTimeout(tryScroll, 140);
      }
    };

    setTimeout(tryScroll, 120);
  };

  const scrollReaderToTop = () => {
    mainScrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Previous and Next page handlers
  const handleNext = () => {
    if (activeIndex < sequence.length - 1) {
      markAsRead(activeSectionId);
      const nextId = sequence[activeIndex + 1].id;
      setActiveSectionId(nextId);
      scrollReaderToTop();
      stopSpeaking();
    }
  };

  const handlePrev = () => {
    if (activeIndex > 0) {
      const prevId = sequence[activeIndex - 1].id;
      setActiveSectionId(prevId);
      scrollReaderToTop();
      stopSpeaking();
    }
  };

  const renderNavigationButtons = () => (
    <div className="fixed right-3 sm:right-5 top-1/2 -translate-y-1/2 z-30 flex flex-col gap-2">
      <button
        onClick={handlePrev}
        disabled={activeIndex === 0}
        className="min-w-[132px] h-11 px-3 flex items-center justify-center gap-2 border border-border-main rounded-xl text-text-title bg-bg-card hover:bg-bg-subcard disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm cursor-pointer"
        title="Previous Chapter"
      >
        <ChevronLeft className="w-4 h-4" />
        <span className="text-[11px] font-bold">Previous Chapter</span>
      </button>

      <button
        onClick={handleNext}
        disabled={activeIndex === sequence.length - 1}
        className="min-w-[132px] h-11 px-3 flex items-center justify-center gap-2 rounded-xl bg-accent-main text-black hover:bg-opacity-95 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm cursor-pointer"
        title="Next Chapter"
      >
        <span className="text-[11px] font-extrabold">Next Chapter</span>
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );

  useEffect(() => {
    if (viewMode === "reader") {
      scrollReaderToTop();
    }
  }, [activeSectionId, viewMode]);

  return (
    <div className={`min-h-screen flex flex-col font-sans text-text-body bg-bg-app transition-colors duration-300`}>
      
      {/* HEADER */}
      <header className="sticky top-0 z-40 bg-bg-header border-b border-border-main py-3 sm:py-4 px-3 sm:px-6 flex justify-between items-center gap-2 transition-colors duration-300 shadow-sm">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="lg:hidden p-2 hover:bg-bg-subcard rounded-xl text-text-title transition-colors"
            title="തുറക്കുക (Menu)"
          >
            <Menu className="w-5 h-5" />
          </button>
          
          <div className="flex items-center gap-2">
            <Book className="w-5 h-5 text-accent-main" />
            <div>
              <h1 className="text-xs sm:text-base font-bold text-text-title font-serif leading-none">ഖുർആൻ സംക്ഷിപ്ത അവലോകനം</h1>
              <p className="hidden sm:block text-[10px] text-text-muted mt-0.5 font-serif">Malayalam Quran Summary E-Reader</p>
            </div>
          </div>
        </div>

        {/* Accessibility & Settings Controls */}
        <div className="flex items-center gap-1.5 sm:gap-4 max-w-[54vw] sm:max-w-none overflow-x-auto">
          
          {/* Dashboard Button */}
          <button 
            onClick={() => {
              setViewMode("dashboard");
              setSelectedVolumeId(null);
              stopSpeaking();
            }}
            className={`p-2 sm:p-2.5 border rounded-xl flex items-center gap-1.5 text-xs font-bold transition-all cursor-pointer ${
              viewMode === "dashboard"
                ? "bg-accent-main text-black border-accent-main shadow-sm font-extrabold font-serif"
                : "bg-bg-subcard border-border-main text-text-title hover:bg-bg-card font-serif"
            }`}
            title="ഡാഷ്ബോർഡ് (Dashboard)"
          >
            <Home className="w-4 h-4" />
            <span className="hidden sm:inline">ഡാഷ്ബോർഡ്</span>
          </button>

          {/* Font Size Adjusters */}
          <div className="hidden sm:flex items-center border border-border-main rounded-xl bg-bg-subcard p-1">
            <button 
              onClick={() => setFontDelta(prev => Math.max(-4, prev - 2))}
              className="p-1 hover:bg-bg-card rounded-lg text-text-title transition-all"
              title="വലുപ്പം കുറയ്ക്കുക (A-)"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <span className="text-[10px] px-1.5 font-extrabold uppercase text-text-muted tracking-wider select-none font-sans">A</span>
            <button 
              onClick={() => setFontDelta(prev => Math.min(10, prev + 2))}
              className="p-1 hover:bg-bg-card rounded-lg text-text-title transition-all"
              title="വലുപ്പം കൂട്ടുക (A+)"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Theme Toggle */}
          <button 
            onClick={() => setTheme(prev => prev === "midnight" ? "white" : "midnight")}
            className="p-2 sm:p-2.5 bg-bg-subcard hover:bg-bg-card border border-border-main rounded-xl text-text-title transition-all"
            title="പശ്ചാത്തലം മാറ്റുക"
          >
            {theme === "midnight" ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-700" />}
          </button>

          {/* Author Info */}
          <button 
            onClick={() => setShowAuthorModal(true)}
            className="p-2 sm:p-2.5 bg-bg-subcard hover:bg-bg-card border border-border-main rounded-xl text-text-title transition-all flex items-center gap-1.5 text-xs font-semibold"
            title="വിവരങ്ങൾ"
          >
            <Info className="w-4 h-4 text-accent-main" />
            <span className="hidden md:inline">ഗ്രന്ഥകർത്താവ്</span>
          </button>

          {/* Developer Admin Panel */}
          <button
            onClick={() => setShowAdminPanel(true)}
            className="p-2 sm:p-2.5 bg-bg-subcard hover:bg-bg-card border border-border-main rounded-xl text-text-title transition-all"
            title="Developer panel"
          >
            <Shield className="w-4 h-4 text-accent-main" />
          </button>
        </div>
      </header>

      {/* WORKSPACE AREA */}
      <div className="flex-1 flex max-w-7xl w-full mx-auto relative">
        
        {/* SIDEBAR: TABLE OF CONTENTS (Chronological Sequence) */}
        <aside className={`
          fixed lg:sticky top-[64px] sm:top-[73px] bottom-0 left-0 z-30
          w-[86vw] max-w-[320px] lg:w-[340px]
          bg-bg-sidebar border-r border-border-main
          transform lg:transform-none transition-transform duration-300 ease-in-out
          flex flex-col h-[calc(100vh-64px)] sm:h-[calc(100vh-73px)]
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
        `}>
          {/* Local exact-match Search */}
          <div className="p-4 border-b border-border-main">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-submuted" />
              <input 
                type="text"
                placeholder="മലയാളത്തിൽ തിരയുക..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-bg-card text-text-title border border-border-main rounded-xl pl-9 pr-8 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-accent-main placeholder:text-text-submuted transition-all"
              />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-submuted hover:text-text-title"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            {searchQuery && (
              <p className="text-[10px] text-accent-main font-bold mt-1.5">
                {searchResults.length} ഫലങ്ങൾ കണ്ടെത്തി
              </p>
            )}
          </div>

          {/* Chapters List */}
          <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
            {searchQuery ? (
              // Search Results pane
              <div className="space-y-2">
                <p className="text-[10px] font-bold text-text-submuted uppercase tracking-wider px-2">മനൂസ്ക്രിപ്റ്റ് തിരച്ചിൽ ഫലങ്ങൾ</p>
                {searchResults.length === 0 ? (
                  <p className="text-xs text-text-submuted italic px-2 py-3">അനുയോജ്യമായ വിവരങ്ങൾ ഒന്നും കണ്ടെത്തിയില്ല.</p>
                ) : (
                  searchResults.map((res, i) => (
                    <button
                      key={i}
                      onClick={() => handleSearchResultClick(res.section.id, res.key)}
                      className="w-full text-left p-3 rounded-xl bg-bg-card hover:bg-bg-subcard border border-border-main transition-all text-xs space-y-1 cursor-pointer"
                    >
                      <div className="flex justify-between items-center">
                        <span className="font-extrabold text-accent-main">{res.section.titleEng}</span>
                        <span className="text-[10px] opacity-75 font-mono text-text-submuted">{res.key}</span>
                      </div>
                      <p className="text-text-body font-serif line-clamp-2 leading-relaxed">{res.matchingParagraph}</p>
                    </button>
                  ))
                )}
              </div>
            ) : (
              // Standard Table of Contents (Ordered sequence)
              <div className="space-y-3 pb-6">
                {volumes.map((vol) => {
                  const volItems = sequence.filter(s => getVolumeForSection(s) === vol.id);
                  const isExpanded = expandedVolumes[vol.id];
                  const { completed, total } = getVolumeProgress(vol.id);
                  const isAllCompleted = completed === total && total > 0;

                  return (
                    <div key={vol.id} className="border border-border-main/40 rounded-xl overflow-hidden bg-bg-subcard/40">
                      {/* Volume Header Toggle */}
                      <button
                        onClick={() => setExpandedVolumes(prev => ({ ...prev, [vol.id]: !prev[vol.id] }))}
                        className="w-full text-left px-3 py-2.5 bg-bg-subcard hover:bg-bg-card transition-all flex items-center justify-between border-b border-border-main/20 cursor-pointer"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <Layers className="w-3.5 h-3.5 text-accent-main shrink-0" />
                          <div className="truncate">
                            <p className="text-[11px] font-bold text-text-title font-serif leading-none">വാല്യം {vol.id}</p>
                            <p className="text-[9px] text-text-muted font-sans mt-0.5 truncate">{vol.titleEng.split(":")[1] || vol.titleEng}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-full ${isAllCompleted ? "bg-emerald-500/15 text-emerald-500" : "bg-bg-card text-text-submuted"}`}>
                            {completed}/{total}
                          </span>
                          <ChevronDown className={`w-3 h-3 text-text-submuted transition-transform duration-300 ${isExpanded ? "rotate-180" : ""}`} />
                        </div>
                      </button>

                      {/* Volume Chapters List */}
                      {isExpanded && (
                        <div className="p-1 space-y-1 bg-bg-app/10">
                          {volItems.map((item) => {
                            const isCurrent = activeSectionId === item.id && viewMode === "reader";
                            return (
                              <button
                                key={item.id}
                                onClick={() => {
                                  setActiveSectionId(item.id);
                                  setViewMode("reader");
                                  setSidebarOpen(false);
                                  stopSpeaking();
                                }}
                                className={`w-full text-left px-2 py-1.5 rounded-lg flex items-center justify-between transition-all cursor-pointer ${
                                  isCurrent 
                                    ? "bg-accent-main text-black font-extrabold shadow-sm"
                                    : "text-text-muted hover:text-text-title hover:bg-bg-subcard"
                                }`}
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  {item.type === "intro" ? (
                                    <BookOpen className="w-3.5 h-3.5 shrink-0 opacity-80" />
                                  ) : (
                                    <div className={`w-5 h-5 rounded font-bold text-[9px] flex items-center justify-center font-sans shrink-0 ${
                                      isCurrent 
                                        ? "bg-black/15 text-black" 
                                        : "bg-bg-subcard text-accent-main"
                                    }`}>
                                      {item.surahId}
                                    </div>
                                  )}
                                  <div className="truncate">
                                    <p className="text-xs font-serif leading-normal truncate">{item.title}</p>
                                    <p className={`text-[9px] opacity-75 font-sans ${isCurrent ? "text-black/85" : "text-text-submuted"}`}>{item.titleEng}</p>
                                  </div>
                                </div>
                                {readSections.includes(item.id) && (
                                  <CheckCircle className={`w-3 h-3 shrink-0 ${isCurrent ? "text-black" : "text-emerald-500"}`} />
                                )}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="p-3 border-t border-border-main bg-bg-app/40">
            <div className="rounded-xl border border-border-main bg-bg-card/70 p-3 space-y-2">
              <p className="text-[11px] font-bold text-text-title font-serif">ഹാർഡ് കോപ്പി വോട്ട്</p>
              <p className="text-[10px] text-text-muted font-serif leading-relaxed">
                ഡാഷ്ബോർഡിൽ കാണിക്കാതെ ഇവിടെ മാറ്റിയിരിക്കുന്നു. താല്പര്യമുണ്ടെങ്കിൽ വോട്ട് ചെയ്യാം.
              </p>
              <button
                onClick={() => {
                  setShowHardcopyModal(true);
                  setHardcopySubmitState("idle");
                  setHardcopyMessage("");
                  setSidebarOpen(false);
                }}
                className="w-full px-3 py-2 rounded-lg bg-accent-main text-black text-[11px] font-extrabold hover:bg-opacity-90 transition-all cursor-pointer"
              >
                ഹാർഡ് കോപ്പിക്കായി വോട്ട് ചെയ്യുക
              </button>
              {hardcopyStatus.hasVoted && (
                <p className="text-[10px] text-emerald-500 font-bold">വോട്ട് രേഖപ്പെടുത്തിയിട്ടുണ്ട്</p>
              )}
            </div>
          </div>
        </aside>

        {/* MOBILE SIDEBAR BACKGROUND SHADOW */}
        <AnimatePresence>
          {sidebarOpen && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setSidebarOpen(false)}
              className="fixed inset-0 bg-black z-20 lg:hidden"
            />
          )}
        </AnimatePresence>

        {/* MAIN READER WINDOW or DASHBOARD */}
        <main ref={mainScrollRef} className={`flex-1 p-3 sm:p-6 lg:p-8 overflow-y-auto mx-auto space-y-6 sm:space-y-8 pb-28 sm:pb-32 transition-all duration-300 ${viewMode === "dashboard" ? "max-w-5xl w-full" : "max-w-4xl w-full"}`}>
          
          {viewMode === "dashboard" ? (
            <div className="space-y-8">
              {/* STUNNING HERO BANNER */}
              <div className="bg-gradient-to-br from-bg-card to-bg-subcard border border-border-main rounded-2xl p-6 sm:p-8 relative overflow-hidden transition-all shadow-sm">
                <div className="absolute top-0 right-0 w-64 h-64 bg-accent-main/5 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute -bottom-10 -left-10 w-48 h-48 bg-accent-main/5 rounded-full blur-2xl pointer-events-none" />
                
                <div className="max-w-3xl space-y-4">
                  <div className="flex items-center gap-2 text-accent-main text-xs font-bold uppercase tracking-widest">
                    <Award className="w-4 h-4" />
                    <span>ഡിജിറ്റൽ പതിപ്പ് (Digital Edition)</span>
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-extrabold text-text-title font-serif tracking-tight leading-tight">
                    ഖുർആൻ സംക്ഷിപ്ത അവലോകനം
                  </h2>
                  <p className="text-xs sm:text-sm text-text-body leading-relaxed font-serif pt-1">
                    മലയാളഭാഷയിലുള്ള ഖുർആൻ സംക്ഷിപ്ത അവലോകനം കൈയെഴുത്തുപ്രതിയുടെ ആധികാരികമായ ഡിജിറ്റൽ പതിപ്പ്. ഗ്രന്ഥകർത്താവായ Er. എ. കെ. മുഹമ്മദലിയുടെ വിശദമായ ആമുഖപഠനവും 114 അധ്യായങ്ങളുടെയും സമ്പൂർണ്ണ ഉള്ളടക്കവും അഞ്ച് വാല്യങ്ങളായി ഇവിടെ വായിക്കാം.
                  </p>
                  
                  {/* Total progress statistics */}
                  <div className="pt-4 flex flex-wrap items-center gap-3 sm:gap-4">
                    <div className="flex items-center gap-2 bg-bg-app border border-border-main px-3 py-2 rounded-xl">
                      <Layers className="w-4 h-4 text-accent-main" />
                      <div>
                        <p className="text-[9px] text-text-muted font-bold uppercase leading-none font-sans">വാല്യങ്ങൾ</p>
                        <p className="text-xs font-extrabold text-text-title mt-0.5 leading-none">5 Volumes</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 bg-bg-app border border-border-main px-3 py-2 rounded-xl">
                      <BookOpen className="w-4 h-4 text-accent-main" />
                      <div>
                        <p className="text-[9px] text-text-muted font-bold uppercase leading-none font-sans">അധ്യായങ്ങൾ</p>
                        <p className="text-xs font-extrabold text-text-title mt-0.5 leading-none">{totalQuranChapters} Chapters</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 bg-bg-app border border-border-main px-3 py-2 rounded-xl">
                      <CheckCircle className="w-4 h-4 text-emerald-500" />
                      <div>
                        <p className="text-[9px] text-text-muted font-bold uppercase leading-none font-sans">വായിച്ചു തീർത്തവ</p>
                        <p className="text-xs font-extrabold text-text-title mt-0.5 leading-none">
                          {readQuranChapters} / {totalQuranChapters}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* General Progress Bar */}
                  <div className="space-y-1.5 pt-2">
                    <div className="flex justify-between items-center text-[10px] font-bold text-text-muted uppercase font-sans">
                      <span>വായനാ പുരോഗതി (Reading Progress)</span>
                      <span className="text-accent-main">{quranProgressPercent}%</span>
                    </div>
                    <div className="h-2 w-full bg-bg-app border border-border-main rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-accent-main transition-all duration-500"
                        style={{ width: `${Math.min(100, quranProgressPercent)}%` }}
                      />
                    </div>
                  </div>

                </div>
              </div>

              {/* CHOOSE VIEW: VOLUME GRID OR SPECIFIC VOLUME CHAPTERS LIST */}
              {selectedVolumeId === null ? (
                <div className="space-y-6">
                  <div className="flex items-center gap-2">
                    <Layers className="w-5 h-5 text-accent-main" />
                    <h3 className="text-lg font-bold text-text-title font-serif">ഗ്രന്ഥത്തിന്റെ വാല്യങ്ങൾ (Volumes of the Book)</h3>
                  </div>

                  {/* GRID OF 5 VOLUMES */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {volumes.map((vol) => {
                      const { total, completed, percent } = getVolumeProgress(vol.id);
                      return (
                        <div 
                          key={vol.id}
                          onClick={() => setSelectedVolumeId(vol.id)}
                          className="bg-bg-card hover:bg-bg-subcard border border-border-main hover:border-accent-main/40 rounded-2xl p-6 transition-all duration-300 shadow-sm flex flex-col justify-between cursor-pointer group hover:-translate-y-1"
                        >
                          <div className="space-y-4">
                            <div className="flex justify-between items-start">
                              <span className="text-[10px] font-extrabold text-accent-main uppercase tracking-widest bg-accent-main/10 border border-accent-main/20 px-2.5 py-1 rounded-full group-hover:bg-accent-main group-hover:text-black transition-all font-serif">
                                വാല്യം 0{vol.id}
                              </span>
                              <span className="text-[10px] font-mono text-text-submuted">{vol.chapterRange}</span>
                            </div>

                            <div className="space-y-2">
                              <h4 className="text-base font-extrabold text-text-title font-serif group-hover:text-accent-main transition-colors">
                                {vol.titleMal.split(":")[1] || vol.titleMal}
                              </h4>
                              <p className="text-[10px] text-text-muted uppercase font-bold tracking-wider font-sans leading-none">
                                {vol.titleEng}
                              </p>
                              <p className="text-xs text-text-body font-serif leading-relaxed line-clamp-3 pt-2 border-t border-border-main/30">
                                {vol.description}
                              </p>
                            </div>
                          </div>

                          {/* Progress inside this volume */}
                          <div className="mt-6 space-y-2 pt-4 border-t border-border-main/30">
                            <div className="flex justify-between items-center text-[10px] font-bold text-text-submuted font-sans">
                              <span>{total} അധ്യായങ്ങൾ</span>
                              <span>{completed} വായിച്ചു ({percent}%)</span>
                            </div>
                            <div className="h-1.5 w-full bg-bg-app border border-border-main rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-accent-main transition-all duration-300"
                                style={{ width: `${percent}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                // VIEW CHAPTERS OF A SPECIFIC VOLUME
                <div className="space-y-6">
                  {/* HEADER WITH BACK BUTTON */}
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-bg-card p-5 border border-border-main rounded-2xl transition-colors">
                    <div className="space-y-1">
                      <button 
                        onClick={() => setSelectedVolumeId(null)}
                        className="flex items-center gap-1.5 text-xs text-accent-main hover:text-accent-light font-bold transition-all cursor-pointer mb-2 font-serif"
                      >
                        <ChevronLeft className="w-4 h-4" />
                        <span>വാല്യങ്ങളിലേക്ക് മടങ്ങുക (All Volumes)</span>
                      </button>
                      <h3 className="text-lg font-bold text-text-title font-serif">
                        {volumes.find(v => v.id === selectedVolumeId)?.titleMal}
                      </h3>
                      <p className="text-xs text-text-muted font-sans uppercase font-bold tracking-wider leading-none">
                        {volumes.find(v => v.id === selectedVolumeId)?.titleEng}
                      </p>
                    </div>

                    <span className="text-xs font-mono text-text-submuted bg-bg-subcard border border-border-main px-3 py-1.5 rounded-xl font-serif">
                      {sequence.filter(s => getVolumeForSection(s) === selectedVolumeId).length} അധ്യായങ്ങൾ
                    </span>
                  </div>

                  {/* GRID OF CHAPTERS FOR SELECTED VOLUME */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {sequence
                      .filter(s => getVolumeForSection(s) === selectedVolumeId)
                      .map((item) => {
                        const isCompleted = readSections.includes(item.id);
                        return (
                          <div
                            key={item.id}
                            onClick={() => {
                              setActiveSectionId(item.id);
                              setViewMode("reader");
                              stopSpeaking();
                            }}
                            className="bg-bg-card hover:bg-bg-subcard border border-border-main hover:border-accent-main/35 rounded-2xl p-5 transition-all duration-300 cursor-pointer flex flex-col justify-between group hover:-translate-y-0.5"
                          >
                            <div className="space-y-3">
                              <div className="flex justify-between items-center">
                                <span className={`text-[9px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded font-serif ${
                                  item.type === "intro" ? "bg-accent-main/10 text-accent-main border border-accent-main/20" : "bg-bg-subcard text-text-muted border border-border-main/50"
                                }`}>
                                  {item.type === "intro" ? "ആമുഖപഠനം" : `സൂറത്ത് ${item.surahId}`}
                                </span>
                                
                                {isCompleted && (
                                  <div className="flex items-center gap-1 text-[10px] text-emerald-500 font-bold bg-[#2e7d32]/10 border border-emerald-500/20 px-2 py-0.5 rounded-full font-serif">
                                    <CheckCircle className="w-3 h-3" />
                                    <span>വായിച്ചു</span>
                                  </div>
                                )}
                              </div>

                              <div className="space-y-1">
                                <h4 className="text-base font-bold text-text-title font-serif group-hover:text-accent-main transition-colors">
                                  {item.title}
                                </h4>
                                <p className="text-[11px] text-text-muted font-sans">{item.titleEng}</p>
                              </div>

                              {item.description && (
                                <p className="text-xs text-text-body font-serif leading-relaxed line-clamp-2 pt-2 border-t border-border-main/30">
                                  {item.description}
                                </p>
                              )}
                            </div>

                            <div className="mt-4 pt-3 border-t border-border-main/25 flex justify-between items-center text-[10px] font-mono text-text-submuted">
                              {item.arabicName ? (
                                <span className="font-serif text-sm text-text-title/80 opacity-80">{item.arabicName}</span>
                              ) : (
                                <span />
                              )}
                              {item.versesCount && <span className="font-serif">{item.versesCount} വചനങ്ങൾ</span>}
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}
            </div>
          ) : (
            // STANDARD READER VIEW
            <div className="space-y-8">
              {/* Surah Header Card / Metadata */}
              <div className="bg-bg-card rounded-2xl p-6 border border-border-main relative overflow-hidden transition-colors duration-300 shadow-sm">
                <div className="absolute top-0 right-0 w-32 h-32 bg-accent-main/5 rounded-full blur-2xl pointer-events-none" />
                
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-accent-main uppercase tracking-widest bg-accent-main/10 border border-accent-main/20 px-2.5 py-1 rounded-full font-serif">
                      {activeSection.type === "intro" ? "ആമുഖ അധ്യായം" : `സൂറത്ത് ${activeSection.surahId}`}
                    </span>
                    <h2 className="text-2xl font-bold text-text-title font-serif">{activeSection.title}</h2>
                    <p className="text-xs text-text-muted font-sans">{activeSection.titleEng} {activeSection.revelation && `• ${activeSection.revelation} Revelation`}</p>
                  </div>

                  {activeSection.arabicName && (
                    <div className="text-3xl font-serif text-text-title self-end sm:self-auto opacity-90">{activeSection.arabicName}</div>
                  )}
                </div>

                {activeSection.description && (
                  <p className="text-xs sm:text-sm text-text-body mt-4 leading-relaxed font-serif pt-4 border-t border-border-main/50">
                    {activeSection.description}
                  </p>
                )}

                {/* Read status check */}
                <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <button 
                      onClick={() => toggleReadStatus(activeSection.id)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[11px] font-bold transition-all cursor-pointer ${
                        readSections.includes(activeSection.id)
                          ? "bg-[#2e7d32]/10 border-emerald-500/30 text-emerald-500"
                          : "bg-bg-subcard border-border-main text-text-muted hover:bg-bg-card"
                      }`}
                    >
                      <CheckCircle className="w-3.5 h-3.5" />
                      {readSections.includes(activeSection.id) ? "വായിച്ചു തീർത്തു" : "വായിച്ചതായി അടയാളപ്പെടുത്തുക"}
                    </button>

                    <button
                      onClick={() => {
                        stopSpeaking();
                        setViewMode("dashboard");
                        setSelectedVolumeId(getVolumeForSection(activeSection));
                        scrollReaderToTop();
                      }}
                      className="h-9 px-2.5 flex items-center gap-1.5 rounded-xl border border-border-main bg-bg-subcard text-text-title hover:bg-bg-card transition-all cursor-pointer"
                      title="Back to volumes"
                      aria-label="Back to volumes"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      <span className="text-[11px] font-bold">Back to volumes</span>
                    </button>
                  </div>

                  {activeSection.versesCount && (
                    <span className="text-xs font-mono text-text-muted">Total: {activeSection.versesCount} Verses</span>
                  )}
                </div>

                <div className="mt-3 pt-3 border-t border-border-main/40 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div className="text-[11px] text-text-muted font-serif">
                    {lineBookmark ? (
                      <>
                        <span className="font-bold text-text-title">ബുക്ക് മാർക്ക്:</span>{" "}
                        <span>{lineBookmark.sectionTitle} — “{lineBookmark.preview}...”</span>
                      </>
                    ) : (
                      <span>ഇവിടെ നിന്നുള്ള പ്രത്യേക വരി ബുക്ക് മാർക്ക് ചെയ്യാം.</span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleGoToBookmark}
                      disabled={!lineBookmark}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[11px] font-bold bg-bg-subcard border-border-main text-text-title disabled:opacity-40 disabled:cursor-not-allowed hover:bg-bg-card transition-all cursor-pointer"
                      title="ബുക്ക് മാർക്കിലേക്കു പോകുക"
                    >
                      <BookmarkCheck className="w-3.5 h-3.5 text-accent-main" />
                      തുടരാൻ (Resume)
                    </button>

                    {lineBookmark && (
                      <button
                        onClick={() => setLineBookmark(null)}
                        className="px-2.5 py-1.5 rounded-xl border border-border-main text-[11px] font-bold text-text-muted hover:text-text-title hover:bg-bg-subcard transition-all cursor-pointer"
                        title="ബുക്ക് മാർക്ക് നീക്കംചെയ്യുക"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Verbatim Content Listing */}
              <div className="space-y-6">
                {isSectionLoading || (activeSection.type === "surah" && sanityChapterLoadState === "loading") ? (
                  <div className="bg-bg-card rounded-2xl p-8 border border-border-main text-center space-y-4">
                    <div className="book-loader mx-auto" aria-label="Loading book pages">
                      <div className="book-loader-cover" />
                      <div className="book-loader-page page-1" />
                      <div className="book-loader-page page-2" />
                      <div className="book-loader-page page-3" />
                    </div>
                    <p className="text-text-muted font-medium font-serif text-base">അധ്യായം ലോഡ് ചെയ്യുന്നു... (Loading chapter...)</p>
                  </div>
                ) : activeSection.type === "surah" && sanityChapterParagraphs.length > 0 ? (
                  <div 
                    id={`verse-card-sanity-${activeSection.surahId}`}
                    className="bg-bg-card rounded-2xl p-5 sm:p-6 border border-border-main shadow-sm space-y-4 transition-all relative"
                  >
                    <div className="flex justify-between items-center border-b border-border-main/50 pb-3">
                      <span className="text-[10px] font-extrabold text-accent-main uppercase tracking-wider font-sans">
                        {`അദ്ധ്യായം (Chapter) ${activeSection.surahId}`}
                      </span>

                      <div className="flex items-center gap-2">
                        {renderPlaybackSpeedControl()}
                        <button
                          onClick={() => handleReadAloud(`sanity_chapter_${activeSection.surahId}`, sanityChapterParagraphs)}
                          className={`p-2 rounded-xl border transition-all flex items-center gap-1 text-[10px] font-bold cursor-pointer ${
                            isSpeaking && speakingKey === `sanity_chapter_${activeSection.surahId}`
                              ? "bg-accent-main/20 border-accent-main text-accent-light"
                              : "bg-bg-subcard border-border-main text-text-muted hover:text-text-title hover:bg-bg-card"
                          }`}
                          title={isSpeaking && speakingKey === `sanity_chapter_${activeSection.surahId}` ? "ശബ്ദം നിർത്തുക" : "വായിച്ചു കേൾക്കുക"}
                        >
                          {isSpeaking && speakingKey === `sanity_chapter_${activeSection.surahId}` ? <VolumeX className="w-3.5 h-3.5 text-accent-main" /> : <Volume2 className="w-3.5 h-3.5" />}
                          <span>{isSpeaking && speakingKey === `sanity_chapter_${activeSection.surahId}` ? "Stop" : "Read Aloud"}</span>
                        </button>
                      </div>
                    </div>

                    <div className="space-y-3.5">
                      {sanityChapterParagraphs.map((par, index) => {
                        const normalizedPar = normalizeMalayalamSpacing(par);
                        const anchorId = `line-sanity-${activeSection.id}-${index}`;
                        const isLineHighlighted = highlightedLineId === anchorId;
                        return (
                          <div key={`sanity-${index}`} id={anchorId} className={`rounded-xl px-1.5 transition-all ${isLineHighlighted ? "ring-2 ring-accent-main/60 bg-accent-main/10" : ""}`}>
                            <div className="flex justify-end gap-1.5 pb-1">
                              <button
                                onClick={() => handleSaveLineBookmark(anchorId, normalizedPar)}
                                className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-lg border border-border-main text-text-muted hover:text-text-title hover:bg-bg-subcard transition-all cursor-pointer"
                                title="ഈ വരി ബുക്ക് മാർക്ക് ചെയ്യുക"
                              >
                                <Bookmark className="w-3 h-3 text-accent-main" />
                                Bookmark
                              </button>
                              <button
                                onClick={() => openReportModal({
                                  chapterId: String(activeSection.surahId || "intro"),
                                  sectionId: activeSection.id,
                                  sectionTitle: activeSection.title,
                                  anchorId,
                                  originalText: normalizedPar,
                                })}
                                className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-lg border border-border-main text-rose-500 hover:bg-rose-500/10 transition-all cursor-pointer"
                                title="ഈ വരിയിൽ പിശക് റിപ്പോർട്ട് ചെയ്യുക"
                              >
                                <Bug className="w-3 h-3" />
                                Report
                              </button>
                            </div>
                            <p
                              style={{ fontSize: `${17 + fontDelta}px`, lineHeight: "1.85" }}
                              className="text-text-body font-serif leading-relaxed text-left"
                            >
                              {normalizedPar}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : currentVerses.length > 0 ? (
                  currentVerses.map(([key, verse]) => {
                    const isVerseSpeaking = isSpeaking && speakingKey === key;
                    return (
                      <div 
                        key={key}
                        id={`verse-card-${key}`}
                        className="bg-bg-card rounded-2xl p-5 sm:p-6 border border-border-main shadow-sm space-y-4 transition-all relative"
                      >
                        {/* Verse label & TTS Assist */}
                        <div className="flex justify-between items-center border-b border-border-main/50 pb-3">
                          <span className="text-[10px] font-extrabold text-accent-main uppercase tracking-wider font-sans">
                            {activeSection.type === "intro" ? `ഭാഗം (Section) ${key}` : `വചനം (Verse) ${key}`}
                          </span>

                          <div className="flex items-center gap-2">
                            {renderPlaybackSpeedControl()}
                            {/* Verbatim Audio Reader button */}
                            <button
                              onClick={() => handleReadAloud(key, verse.text)}
                              className={`p-2 rounded-xl border transition-all flex items-center gap-1 text-[10px] font-bold cursor-pointer ${
                                isVerseSpeaking
                                  ? "bg-accent-main/20 border-accent-main text-accent-light"
                                  : "bg-bg-subcard border-border-main text-text-muted hover:text-text-title hover:bg-bg-card"
                              }`}
                              title={isVerseSpeaking ? "ശബ്ദം നിർത്തുക" : "വായിച്ചു കേൾക്കുക"}
                            >
                              {isVerseSpeaking ? <VolumeX className="w-3.5 h-3.5 text-accent-main" /> : <Volume2 className="w-3.5 h-3.5" />}
                              <span>{isVerseSpeaking ? "Stop" : "Read Aloud"}</span>
                            </button>
                          </div>
                        </div>

                        {/* Verbatim Malayalam Text paragraphs */}
                        <div className="space-y-3.5">
                          {verse.text.map((par, index) => {
                            const normalizedPar = normalizeMalayalamSpacing(par);
                            const anchorId = `line-verse-${key}-${index}`;
                            const isLineHighlighted = highlightedLineId === anchorId;
                            return (
                              <div key={index} id={anchorId} className={`rounded-xl px-1.5 transition-all ${isLineHighlighted ? "ring-2 ring-accent-main/60 bg-accent-main/10" : ""}`}>
                                <div className="flex justify-end gap-1.5 pb-1">
                                  <button
                                    onClick={() => handleSaveLineBookmark(anchorId, normalizedPar)}
                                    className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-lg border border-border-main text-text-muted hover:text-text-title hover:bg-bg-subcard transition-all cursor-pointer"
                                    title="ഈ വരി ബുക്ക് മാർക്ക് ചെയ്യുക"
                                  >
                                    <Bookmark className="w-3 h-3 text-accent-main" />
                                    Bookmark
                                  </button>
                                  <button
                                    onClick={() => openReportModal({
                                      chapterId: activeSection.type === "surah" ? String(activeSection.surahId || "") : "intro",
                                      sectionId: activeSection.id,
                                      sectionTitle: activeSection.title,
                                      anchorId,
                                      originalText: normalizedPar,
                                    })}
                                    className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-lg border border-border-main text-rose-500 hover:bg-rose-500/10 transition-all cursor-pointer"
                                    title="ഈ വരിയിൽ പിശക് റിപ്പോർട്ട് ചെയ്യുക"
                                  >
                                    <Bug className="w-3 h-3" />
                                    Report
                                  </button>
                                </div>
                                <p 
                                  style={{ fontSize: `${17 + fontDelta}px`, lineHeight: "1.85" }}
                                  className="text-text-body font-serif leading-relaxed text-left"
                                >
                                  {normalizedPar}
                                </p>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  // Pristine placeholder for missing manuscript content
                  <div className="bg-bg-card rounded-2xl p-8 border border-border-main text-center space-y-4">
                    <BookOpen className="w-10 h-10 text-text-submuted mx-auto" />
                    <p className="text-text-muted font-medium font-serif text-base">ഈ അദ്ധ്യായത്തെ സംബന്ധിച്ച കുറിപ്പുകൾ കൈയെഴുത്തുപ്രതിയിൽ ലഭ്യമല്ല.</p>
                    <p className="text-[11px] text-text-submuted max-w-md mx-auto leading-relaxed font-serif">
                      ഗ്രന്ഥത്തിൽ ഈ അധ്യായത്തിന്റെ വ്യാഖ്യാനങ്ങൾ മറ്റു വാല്യങ്ങളിലാണ് ഉൾപ്പെടുത്തിയിരിക്കുന്നത്.
                    </p>
                  </div>
                )}
              </div>

            </div>
          )}

        </main>

        {viewMode === "reader" && renderNavigationButtons()}
      </div>

      {/* AUTHOR DETAILS MODAL (Verbatim Metadata Contact) */}
      <AnimatePresence>
        {showAuthorModal && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAuthorModal(false)}
              className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="fixed inset-0 m-auto max-w-sm h-fit bg-bg-card border border-border-main rounded-2xl shadow-2xl p-6 z-50 overflow-hidden flex flex-col justify-between transition-colors duration-300"
            >
              <div className="space-y-5">
                <div className="flex justify-between items-center border-b border-border-main/50 pb-3">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-accent-main" />
                    <h3 className="text-sm font-bold text-text-title font-serif">ഗ്രന്ഥകർത്താവ് (Author)</h3>
                  </div>
                  <button 
                    onClick={() => setShowAuthorModal(false)}
                    className="p-1 hover:bg-bg-subcard text-text-muted rounded-full transition-colors cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="text-center py-2 space-y-2">
                  <div className="w-14 h-14 rounded-full bg-accent-main/10 border border-accent-main/30 flex items-center justify-center text-accent-main text-2xl font-bold font-serif mx-auto shadow-sm">
                    M
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-text-title font-serif">Er. എ. കെ. മുഹമ്മദലി</h4>
                    <p className="text-[10px] text-accent-main font-semibold mt-0.5 uppercase tracking-wider">ഖുർആൻ സംക്ഷിപ്ത അവലോകനം</p>
                  </div>
                </div>

                <div className="space-y-3 bg-bg-subcard p-4 rounded-xl border border-border-main text-xs transition-colors">
                  <div className="flex items-start gap-2.5">
                    <MapPin className="w-4 h-4 text-accent-main shrink-0 mt-0.5" />
                    <div>
                      <p className="text-[9px] uppercase font-bold text-text-submuted tracking-wider">മേൽവിലാസം (Address)</p>
                      <p className="text-text-body font-serif mt-0.5">ബാങ്ക് ജംഗ്ഷൻ, ആലുവ</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <Phone className="w-4 h-4 text-accent-main shrink-0 mt-0.5" />
                    <div>
                      <p className="text-[9px] uppercase font-bold text-text-submuted tracking-wider">ഫോൺ നമ്പർ (Mobile)</p>
                      <a href="tel:9961170582" className="text-text-title hover:text-accent-main transition-colors mt-0.5 block font-mono font-bold">
                        9961170582
                      </a>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <Mail className="w-4 h-4 text-accent-main shrink-0 mt-0.5" />
                    <div>
                      <p className="text-[9px] uppercase font-bold text-text-submuted tracking-wider">ഇമെയിൽ (Email)</p>
                      <a href="mailto:mohamedaliak78@gmail.com" className="text-text-title hover:text-accent-main transition-colors mt-0.5 block break-all font-mono">
                        mohamedaliak78@gmail.com
                      </a>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-4 border-t border-border-main/50 mt-5">
                <a
                  href="tel:9961170582"
                  className="flex items-center justify-center gap-1.5 py-2.5 bg-bg-subcard border border-border-main hover:bg-bg-card rounded-xl text-xs font-bold text-text-title transition-all text-center"
                >
                  <Phone className="w-3.5 h-3.5 text-accent-main" />
                  <span>Call</span>
                </a>
                <a
                  href="https://wa.me/919961170582?text=Greetings%20Er.%20Muhammedali"
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-center gap-1.5 py-2.5 bg-accent-main hover:bg-opacity-90 rounded-xl text-xs font-bold text-black transition-all text-center shadow-sm"
                >
                  <span>WhatsApp</span>
                </a>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* HARDCOPY VOTE MODAL */}
      <AnimatePresence>
        {showHardcopyModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowHardcopyModal(false)}
              className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 12 }}
              className="fixed inset-0 m-auto max-w-lg w-[92vw] h-fit bg-bg-card border border-border-main rounded-2xl shadow-2xl p-5 z-50"
            >
              <div className="flex justify-between items-center border-b border-border-main/50 pb-3 mb-4">
                <h3 className="text-base font-bold text-text-title font-serif">ഹാർഡ് കോപ്പിക്കായുള്ള താൽപര്യ വോട്ട്</h3>
                <button
                  onClick={() => setShowHardcopyModal(false)}
                  className="p-1 hover:bg-bg-subcard text-text-muted rounded-full transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <p className="text-[12px] text-text-muted font-serif leading-relaxed mb-4">
                അച്ചടി നഷ്ടമില്ലാതെ തുടങ്ങാൻ ആവശ്യകത ശേഖരിക്കുന്നു. കൃത്യമായ എണ്ണം കാണിക്കില്ല; floating-book സൂചകം മുകളിലെത്തുമ്പോൾ ഹാർഡ് കോപ്പി പ്രിന്റ് ആരംഭിക്കുകയും താങ്കളെ അറിയിക്കുകയും ചെയ്യും.
              </p>

              <form onSubmit={handleSubmitHardcopyVote} className="space-y-3">
                <input
                  required
                  value={hardcopyForm.name}
                  onChange={(e) => setHardcopyForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="പേര് (Name)"
                  className="w-full px-3 py-2.5 rounded-xl border border-border-main bg-bg-subcard text-text-title text-sm outline-none focus:border-accent-main"
                />
                <input
                  value={hardcopyForm.phone}
                  onChange={(e) => setHardcopyForm(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="ഫോൺ നമ്പർ (Phone)"
                  className="w-full px-3 py-2.5 rounded-xl border border-border-main bg-bg-subcard text-text-title text-sm outline-none focus:border-accent-main"
                />
                <input
                  value={hardcopyForm.email}
                  onChange={(e) => setHardcopyForm(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="ഇമെയിൽ (Email)"
                  className="w-full px-3 py-2.5 rounded-xl border border-border-main bg-bg-subcard text-text-title text-sm outline-none focus:border-accent-main"
                />
                <textarea
                  value={hardcopyForm.address}
                  onChange={(e) => setHardcopyForm(prev => ({ ...prev, address: e.target.value }))}
                  placeholder="മേൽവിലാസം (Address)"
                  rows={3}
                  className="w-full px-3 py-2.5 rounded-xl border border-border-main bg-bg-subcard text-text-title text-sm outline-none focus:border-accent-main resize-none"
                />

                {hardcopyMessage && (
                  <p className={`text-xs font-bold ${hardcopySubmitState === "error" ? "text-rose-500" : "text-emerald-500"}`}>
                    {hardcopyMessage}
                  </p>
                )}

                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowHardcopyModal(false)}
                    className="px-3 py-2 rounded-xl border border-border-main text-xs font-bold text-text-muted hover:text-text-title hover:bg-bg-subcard transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={hardcopySubmitState === "submitting"}
                    className="px-4 py-2 rounded-xl bg-accent-main text-black text-xs font-extrabold disabled:opacity-50 transition-all"
                  >
                    {hardcopySubmitState === "submitting" ? "Submitting..." : "വോട്ട് സമർപ്പിക്കുക"}
                  </button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* BETA REPORT MODAL */}
      <AnimatePresence>
        {showReportModal && reportDraft && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowReportModal(false)}
              className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 12 }}
              className="fixed inset-0 m-auto max-w-xl w-[92vw] h-fit bg-bg-card border border-border-main rounded-2xl shadow-2xl p-5 z-50"
            >
              <div className="flex items-center justify-between border-b border-border-main/50 pb-3 mb-4">
                <h3 className="text-base font-bold text-text-title font-serif">Unicode/ASCII പിശക് റിപ്പോർട്ട്</h3>
                <button onClick={() => setShowReportModal(false)} className="p-1 rounded-full hover:bg-bg-subcard">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSubmitBetaReport} className="space-y-3">
                <div className="text-[11px] text-text-muted font-serif bg-bg-subcard border border-border-main rounded-xl p-3">
                  <p><span className="font-bold text-text-title">അധ്യായം:</span> {reportDraft.sectionTitle}</p>
                  <p className="mt-1"><span className="font-bold text-text-title">Reported line:</span> {reportDraft.originalText.slice(0, 220)}</p>
                </div>

                <select
                  value={reportForm.issueType}
                  onChange={(e) => setReportForm(prev => ({ ...prev, issueType: e.target.value }))}
                  className="w-full px-3 py-2.5 rounded-xl border border-border-main bg-bg-subcard text-text-title text-sm outline-none focus:border-accent-main"
                >
                  <option value="unicode">Unicode conversion error</option>
                  <option value="typo">Spelling/typo</option>
                  <option value="split">Word split/join error</option>
                  <option value="punctuation">Punctuation error</option>
                  <option value="other">Other</option>
                </select>

                <textarea
                  value={reportForm.suggestedText}
                  onChange={(e) => setReportForm(prev => ({ ...prev, suggestedText: e.target.value }))}
                  placeholder="ശരിയായ വാചകം / ശരിയായ പദം"
                  rows={3}
                  className="w-full px-3 py-2.5 rounded-xl border border-border-main bg-bg-subcard text-text-title text-sm outline-none focus:border-accent-main resize-none"
                />

                <textarea
                  value={reportForm.note}
                  onChange={(e) => setReportForm(prev => ({ ...prev, note: e.target.value }))}
                  placeholder="കൂടുതൽ കുറിപ്പുകൾ (optional)"
                  rows={2}
                  className="w-full px-3 py-2.5 rounded-xl border border-border-main bg-bg-subcard text-text-title text-sm outline-none focus:border-accent-main resize-none"
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    value={reportForm.reporterName}
                    onChange={(e) => setReportForm(prev => ({ ...prev, reporterName: e.target.value }))}
                    placeholder="പേര് (optional)"
                    className="w-full px-3 py-2.5 rounded-xl border border-border-main bg-bg-subcard text-text-title text-sm outline-none focus:border-accent-main"
                  />
                  <input
                    value={reportForm.reporterContact}
                    onChange={(e) => setReportForm(prev => ({ ...prev, reporterContact: e.target.value }))}
                    placeholder="Contact (optional)"
                    className="w-full px-3 py-2.5 rounded-xl border border-border-main bg-bg-subcard text-text-title text-sm outline-none focus:border-accent-main"
                  />
                </div>

                {reportMessage && (
                  <p className={`text-xs font-bold ${reportSubmitState === "error" ? "text-rose-500" : "text-emerald-500"}`}>
                    {reportMessage}
                  </p>
                )}

                <div className="pt-1 flex justify-end gap-2">
                  <button type="button" onClick={() => setShowReportModal(false)} className="px-3 py-2 rounded-xl border border-border-main text-xs font-bold text-text-muted hover:text-text-title hover:bg-bg-subcard transition-all">Cancel</button>
                  <button type="submit" disabled={reportSubmitState === "submitting"} className="px-4 py-2 rounded-xl bg-accent-main text-black text-xs font-extrabold disabled:opacity-50 transition-all">
                    {reportSubmitState === "submitting" ? "Submitting..." : "റിപ്പോർട്ട് സമർപ്പിക്കുക"}
                  </button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* DEVELOPER ADMIN PANEL */}
      <AnimatePresence>
        {showAdminPanel && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAdminPanel(false)}
              className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 12 }}
              className="fixed inset-0 m-auto max-w-5xl w-[96vw] max-h-[88vh] overflow-y-auto bg-bg-card border border-border-main rounded-2xl shadow-2xl p-5 z-50"
            >
              <div className="flex items-center justify-between border-b border-border-main/50 pb-3 mb-4">
                <h3 className="text-base font-bold text-text-title font-serif">Developer Panel — Beta Error Reports</h3>
                <button onClick={() => setShowAdminPanel(false)} className="p-1 rounded-full hover:bg-bg-subcard"><X className="w-4 h-4" /></button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-4">
                <input
                  value={adminUserId}
                  onChange={(e) => setAdminUserId(e.target.value)}
                  placeholder="Admin User ID"
                  className="px-3 py-2.5 rounded-xl border border-border-main bg-bg-subcard text-text-title text-sm outline-none focus:border-accent-main"
                />
                <input
                  type="password"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  placeholder="Password"
                  className="px-3 py-2.5 rounded-xl border border-border-main bg-bg-subcard text-text-title text-sm outline-none focus:border-accent-main"
                />
                <button onClick={handleAdminLogin} className="px-4 py-2.5 rounded-xl bg-accent-main text-black text-xs font-extrabold">
                  {adminLoading ? "Loading..." : adminLoggedIn ? "Re-login" : "Login"}
                </button>
              </div>

              {adminLoggedIn && (
                <div className="mb-4 flex justify-end">
                  <button onClick={() => loadAdminReports()} className="px-4 py-2 rounded-xl border border-border-main text-xs font-bold text-text-title hover:bg-bg-subcard">
                    Refresh Reports
                  </button>
                </div>
              )}

              {adminStatusMessage && <p className="text-xs font-bold text-text-muted mb-3">{adminStatusMessage}</p>}

              <div className="space-y-3">
                {!adminLoggedIn ? (
                  <div className="text-xs text-text-muted border border-border-main rounded-xl p-4">Login ചെയ്താൽ reports കാണിക്കും.</div>
                ) : adminReports.length === 0 ? (
                  <div className="text-xs text-text-muted border border-border-main rounded-xl p-4">No reports yet.</div>
                ) : (
                  adminReports.map((rep) => (
                    <div key={rep.id} className="border border-border-main rounded-xl p-3 bg-bg-subcard/40 space-y-2">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                        <p className="text-xs font-bold text-text-title">{rep.sectionTitle} • {rep.anchorId}</p>
                        <span className="text-[10px] px-2 py-1 rounded-full border border-border-main text-text-muted">{rep.status}</span>
                      </div>
                      <p className="text-[11px] text-text-muted"><span className="font-bold text-text-title">Original:</span> {rep.originalText}</p>
                      <p className="text-[11px] text-emerald-500"><span className="font-bold">Suggested:</span> {rep.suggestedText || "—"}</p>
                      {rep.note && <p className="text-[11px] text-text-muted"><span className="font-bold text-text-title">Note:</span> {rep.note}</p>}
                      <div className="flex flex-wrap gap-2 pt-1">
                        <button onClick={() => updateReportStatus(rep.id, "reviewing")} className="px-2.5 py-1 rounded-lg border border-border-main text-[10px] font-bold">Reviewing</button>
                        <button onClick={() => updateReportStatus(rep.id, "fixed")} className="px-2.5 py-1 rounded-lg border border-emerald-500/50 text-emerald-500 text-[10px] font-bold">Mark Fixed</button>
                        <button onClick={() => updateReportStatus(rep.id, "rejected")} className="px-2.5 py-1 rounded-lg border border-rose-500/50 text-rose-500 text-[10px] font-bold">Reject</button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* FOOTER */}
      <footer className="bg-bg-sidebar border-t border-border-main py-6 px-4 text-center text-[11px] text-text-submuted transition-colors duration-300">
        <div className="max-w-7xl mx-auto space-y-2">
          <p className="font-extrabold text-accent-main uppercase tracking-widest font-sans">ഖുർആൻ സംക്ഷിപ്ത അവലോകനം • Digital Edition</p>
          <p className="font-serif">Er. എ. കെ. മുഹമ്മദലി • ആലുവ</p>
          <p className="opacity-75 max-w-md mx-auto leading-relaxed">This digital manuscript strictly serves to display verbatim content compiled in the original manuscript. No AI-generated summaries, interpretations, or thematic commentary are added.</p>
          <div className="pt-2 text-[9px] opacity-60 tracking-wider">SOURCE: PDM MANUSCRIPT DATABASE V1.4</div>
        </div>
      </footer>
    </div>
  );
}
