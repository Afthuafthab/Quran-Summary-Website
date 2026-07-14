import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { promises as fs } from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import { createClient } from "@sanity/client";
import dotenv from "dotenv";

dotenv.config();

// Ensure ESM paths are handled correctly across both ESM and CommonJS
const isESM = typeof import.meta !== "undefined" && typeof import.meta.url !== "undefined";
const resolvedFilename = isESM ? fileURLToPath(import.meta.url) : (typeof __filename !== "undefined" ? __filename : "");
const resolvedDirname = isESM ? path.dirname(resolvedFilename) : (typeof __dirname !== "undefined" ? __dirname : "");

// Initialize Gemini Client
const apiKey = process.env.GEMINI_API_KEY;
const ai = new GoogleGenAI({
  apiKey: apiKey,
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build",
    },
  },
});

// Load Quran Data
import { quranData } from "./src/data/pmd_converted_content.ts";
import { volume2Data } from "./src/data/volume2.ts";
import { allSurahs } from "./src/data/all_surahs.ts";

const sanityClient = createClient({
  projectId: process.env.VITE_SANITY_PROJECT_ID || "lgqos9pf",
  dataset: process.env.VITE_SANITY_DATASET || "production",
  apiVersion: process.env.VITE_SANITY_API_VERSION || "2025-07-01",
  useCdn: false,
});

const allQuranData: Record<string, any> = { ...quranData, ...volume2Data };
const AUTHOR_WHATSAPP = "919961170582";

const isBookTopicQuery = (text: string) => {
  const q = text.toLowerCase();
  return /(സൂറത്ത്|സൂരത്ത്|അധ്യായം|വചനം|ഖുർആൻ|quran|surah|verse|tafsir|തഫ്സീർ|പ്രവാച|allah|islam)/i.test(q);
};

const tokenizeQuery = (text: string) =>
  text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s:.-]/gu, " ")
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 2)
    .slice(0, 8);

const getChatReferences = (query: string) => {
  const tokens = tokenizeQuery(query);
  const refs: Array<{ surahId?: number; verseKey: string; anchorId: string; snippet: string; score: number }> = [];

  if (!tokens.length) return refs;

  for (const [key, verse] of Object.entries(allQuranData)) {
    const textLines = Array.isArray((verse as any)?.text) ? (verse as any).text : [];
    textLines.forEach((line: string, idx: number) => {
      const normalized = String(line || "").trim();
      if (!normalized) return;
      const lower = normalized.toLowerCase();
      const score = tokens.reduce((acc, token) => (lower.includes(token) ? acc + 1 : acc), 0);
      if (score <= 0) return;

      const [surahRaw] = key.split(":");
      const surahId = Number(surahRaw);
      refs.push({
        surahId: Number.isFinite(surahId) ? surahId : undefined,
        verseKey: key,
        anchorId: `line-verse-${key}-${idx}`,
        snippet: normalized.slice(0, 220),
        score,
      });
    });
  }

  refs.sort((a, b) => b.score - a.score);
  return refs.slice(0, 6);
};

async function startServer(options: { serveFrontend?: boolean } = {}) {
  const serveFrontend = options.serveFrontend ?? true;
  const app = express();

  app.use(express.json());

  const hardCopyVotesPath = path.join(resolvedDirname, "data", "hardcopy_votes.json");
  const HARD_COPY_TARGET = Math.max(50, Number(process.env.HARD_COPY_TARGET || 100));

  type HardCopyVote = {
    id: string;
    name: string;
    phone?: string;
    address?: string;
    email?: string;
    createdAt: string;
    updatedAt: string;
  };

  type HardCopyVoteStore = {
    votes: HardCopyVote[];
  };

  const ensureHardCopyStore = async () => {
    await fs.mkdir(path.dirname(hardCopyVotesPath), { recursive: true });
    try {
      await fs.access(hardCopyVotesPath);
    } catch {
      const initial: HardCopyVoteStore = { votes: [] };
      await fs.writeFile(hardCopyVotesPath, JSON.stringify(initial, null, 2), "utf8");
    }
  };

  const readHardCopyStore = async (): Promise<HardCopyVoteStore> => {
    await ensureHardCopyStore();
    const raw = await fs.readFile(hardCopyVotesPath, "utf8");
    const parsed = JSON.parse(raw || "{}") as Partial<HardCopyVoteStore>;
    return {
      votes: Array.isArray(parsed.votes) ? parsed.votes : [],
    };
  };

  const writeHardCopyStore = async (store: HardCopyVoteStore) => {
    await fs.writeFile(hardCopyVotesPath, JSON.stringify(store, null, 2), "utf8");
  };

  const buildDemandVisual = (count: number) => {
    const progress = Math.max(0, Math.min(100, Math.round((count / HARD_COPY_TARGET) * 100)));
    const targetReached = count >= HARD_COPY_TARGET;

    let stage = "collecting";
    if (targetReached) {
      stage = "ready_to_print";
    } else if (progress >= 75) {
      stage = "almost_ready";
    } else if (progress >= 40) {
      stage = "building";
    }

    return { progress, stage, targetReached };
  };

  app.get("/api/hardcopy-vote/status", async (req, res) => {
    try {
      const voteId = (req.query.voteId as string | undefined)?.trim();
      const store = await readHardCopyStore();
      const demand = buildDemandVisual(store.votes.length);
      const hasVoted = Boolean(voteId && store.votes.some(v => v.id === voteId));

      return res.json({
        status: "success",
        hasVoted,
        targetReached: demand.targetReached,
        demandStage: demand.stage,
        floatLevel: demand.progress,
        notifyEligible: hasVoted && demand.targetReached,
      });
    } catch (error) {
      console.error("Hard copy status error:", error);
      return res.status(500).json({ status: "error", message: "Failed to load hard copy status" });
    }
  });

  app.post("/api/hardcopy-vote", async (req, res) => {
    const name = String(req.body?.name || "").trim();
    const phone = String(req.body?.phone || "").trim();
    const address = String(req.body?.address || "").trim();
    const email = String(req.body?.email || "").trim();

    if (!name || name.length < 2) {
      return res.status(400).json({ status: "error", message: "Name is required" });
    }

    if (!phone && !address && !email) {
      return res.status(400).json({ status: "error", message: "Provide phone, address, or email" });
    }

    try {
      const store = await readHardCopyStore();
      const now = new Date().toISOString();

      const normalizedPhone = phone.replace(/\s+/g, "");
      const existing = normalizedPhone
        ? store.votes.find(v => (v.phone || "").replace(/\s+/g, "") === normalizedPhone)
        : undefined;

      let voteId = existing?.id;
      if (existing) {
        existing.name = name;
        existing.phone = phone || existing.phone;
        existing.address = address || existing.address;
        existing.email = email || existing.email;
        existing.updatedAt = now;
      } else {
        voteId = `vote_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        store.votes.push({
          id: voteId,
          name,
          phone: phone || undefined,
          address: address || undefined,
          email: email || undefined,
          createdAt: now,
          updatedAt: now,
        });
      }

      await writeHardCopyStore(store);
      const demand = buildDemandVisual(store.votes.length);

      return res.json({
        status: "success",
        voteId,
        targetReached: demand.targetReached,
        demandStage: demand.stage,
        floatLevel: demand.progress,
      });
    } catch (error) {
      console.error("Hard copy vote submit error:", error);
      return res.status(500).json({ status: "error", message: "Failed to submit vote" });
    }
  });

  const betaReportsPath = path.join(resolvedDirname, "data", "beta_reports.json");
  const ADMIN_USER_ID = process.env.ADMIN_USER_ID || "test";
  const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "test@123";

  type BetaReport = {
    id: string;
    chapterId: string;
    sectionId: string;
    sectionTitle: string;
    anchorId: string;
    originalText: string;
    suggestedText: string;
    issueType: string;
    note?: string;
    reporterName?: string;
    reporterContact?: string;
    status: "new" | "reviewing" | "fixed" | "rejected";
    resolutionNote?: string;
    createdAt: string;
    updatedAt: string;
  };

  type BetaReportStore = {
    reports: BetaReport[];
  };

  const ensureBetaReportStore = async () => {
    await fs.mkdir(path.dirname(betaReportsPath), { recursive: true });
    try {
      await fs.access(betaReportsPath);
    } catch {
      const initial: BetaReportStore = { reports: [] };
      await fs.writeFile(betaReportsPath, JSON.stringify(initial, null, 2), "utf8");
    }
  };

  const readBetaReportStore = async (): Promise<BetaReportStore> => {
    await ensureBetaReportStore();
    const raw = await fs.readFile(betaReportsPath, "utf8");
    const parsed = JSON.parse(raw || "{}") as Partial<BetaReportStore>;
    return {
      reports: Array.isArray(parsed.reports) ? parsed.reports : [],
    };
  };

  const writeBetaReportStore = async (store: BetaReportStore) => {
    await fs.writeFile(betaReportsPath, JSON.stringify(store, null, 2), "utf8");
  };

  const isAdminAllowed = (req: express.Request) => {
    const providedUser = String(req.headers["x-admin-user-id"] || "").trim();
    const providedPass = String(req.headers["x-admin-password"] || "").trim();
    return providedUser === ADMIN_USER_ID && providedPass === ADMIN_PASSWORD;
  };

  app.post("/api/admin/login", (req, res) => {
    const userId = String(req.body?.userId || "").trim();
    const password = String(req.body?.password || "").trim();

    if (userId === ADMIN_USER_ID && password === ADMIN_PASSWORD) {
      return res.json({ status: "success" });
    }

    return res.status(401).json({ status: "error", message: "Invalid admin credentials" });
  });

  app.post("/api/beta-report", async (req, res) => {
    const chapterId = String(req.body?.chapterId || "").trim();
    const sectionId = String(req.body?.sectionId || "").trim();
    const sectionTitle = String(req.body?.sectionTitle || "").trim();
    const anchorId = String(req.body?.anchorId || "").trim();
    const originalText = String(req.body?.originalText || "").trim();
    const suggestedText = String(req.body?.suggestedText || "").trim();
    const issueType = String(req.body?.issueType || "").trim() || "text-error";
    const note = String(req.body?.note || "").trim();
    const reporterName = String(req.body?.reporterName || "").trim();
    const reporterContact = String(req.body?.reporterContact || "").trim();

    if (!sectionId || !anchorId || !originalText) {
      return res.status(400).json({ status: "error", message: "Missing report context" });
    }

    if (!suggestedText && !note) {
      return res.status(400).json({ status: "error", message: "Provide corrected text or note" });
    }

    try {
      const store = await readBetaReportStore();
      const now = new Date().toISOString();
      const reportId = `rep_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

      store.reports.unshift({
        id: reportId,
        chapterId,
        sectionId,
        sectionTitle,
        anchorId,
        originalText,
        suggestedText,
        issueType,
        note: note || undefined,
        reporterName: reporterName || undefined,
        reporterContact: reporterContact || undefined,
        status: "new",
        createdAt: now,
        updatedAt: now,
      });

      await writeBetaReportStore(store);
      return res.json({ status: "success", reportId });
    } catch (error) {
      console.error("Beta report submit error:", error);
      return res.status(500).json({ status: "error", message: "Failed to submit report" });
    }
  });

  app.get("/api/admin/beta-reports", async (req, res) => {
    if (!isAdminAllowed(req)) {
      return res.status(401).json({ status: "error", message: "Unauthorized" });
    }

    try {
      const store = await readBetaReportStore();
      return res.json({ status: "success", reports: store.reports });
    } catch (error) {
      console.error("Beta reports list error:", error);
      return res.status(500).json({ status: "error", message: "Failed to load reports" });
    }
  });

  app.patch("/api/admin/beta-reports/:id", async (req, res) => {
    if (!isAdminAllowed(req)) {
      return res.status(401).json({ status: "error", message: "Unauthorized" });
    }

    const reportId = String(req.params.id || "").trim();
    const nextStatus = String(req.body?.status || "").trim() as BetaReport["status"];
    const resolutionNote = String(req.body?.resolutionNote || "").trim();

    if (!reportId || !["new", "reviewing", "fixed", "rejected"].includes(nextStatus)) {
      return res.status(400).json({ status: "error", message: "Invalid report update" });
    }

    try {
      const store = await readBetaReportStore();
      const report = store.reports.find(r => r.id === reportId);
      if (!report) {
        return res.status(404).json({ status: "error", message: "Report not found" });
      }

      report.status = nextStatus;
      report.resolutionNote = resolutionNote || report.resolutionNote;
      report.updatedAt = new Date().toISOString();
      await writeBetaReportStore(store);
      return res.json({ status: "success" });
    } catch (error) {
      console.error("Beta report update error:", error);
      return res.status(500).json({ status: "error", message: "Failed to update report" });
    }
  });

  app.get("/api/sanity/sample-chapter", async (req, res) => {
    const id = (req.query.id as string | undefined) || "f4b3757b-9100-4b4a-8970-cb4c736f64e0";

    try {
      const data = await sanityClient.fetch(
        `*[_id == $id][0]{_id, _type, titleMal, titleEng, title, name, subtitle, summary, body, content, chapterNumber}`,
        { id }
      );

      res.json({ status: "success", data });
    } catch (error) {
      console.error("Failed to fetch Sanity content:", error);
      res.status(500).json({ status: "error", message: "Failed to fetch Sanity content" });
    }
  });

  app.get("/api/sanity/chapter", async (req, res) => {
    const chapterParam = req.query.chapterNumber as string | undefined;
    const chapterNumber = chapterParam ? parseInt(chapterParam, 10) : NaN;

    if (!Number.isFinite(chapterNumber) || chapterNumber < 1 || chapterNumber > 114) {
      return res.status(400).json({ status: "error", message: "Invalid chapterNumber" });
    }

    try {
      const data = await sanityClient.fetch(
        `*[_type == "bookSection" && sectionType == "surah" && coalesce(surahNumber, chapterNumber) == $chapterNumber][0]{
          _id,
          _type,
          title,
          titleMal,
          titleEng,
          summary,
          body,
          content,
          chapterNumber,
          surahNumber,
          versesCount,
          revelation,
          revelationMal,
          _updatedAt
        }`,
        { chapterNumber }
      );

      res.json({ status: "success", data });
    } catch (error) {
      console.error("Failed to fetch Sanity chapter:", error);
      res.status(500).json({ status: "error", message: "Failed to fetch Sanity chapter" });
    }
  });

  app.post("/api/chat", async (req, res) => {
    const message = String(req.body?.message || "").trim();
    const activeSectionTitle = String(req.body?.activeSectionTitle || "").trim();
    const activeSurahId = Number(req.body?.activeSurahId || 0);

    if (!message || message.length < 2) {
      return res.status(400).json({ status: "error", message: "Message is required" });
    }

    const references = getChatReferences(message);
    const relatedToBook = isBookTopicQuery(message) || Boolean(activeSectionTitle) || Number.isFinite(activeSurahId);
    const canAnswer = references.length > 0 && references[0].score >= 1;
    const escalateToAuthor = relatedToBook && !canAnswer;

    const contextLabel = activeSectionTitle
      ? `നിലവിലെ അധ്യായം: ${activeSectionTitle}${Number.isFinite(activeSurahId) && activeSurahId > 0 ? ` (സൂറത്ത് ${activeSurahId})` : ""}`
      : "";

    const draftQuestionForAuthor = [
      "അസ്സലാമു അലൈക്കും.",
      "ഈ ചോദ്യത്തിന് വിശദീകരണം വേണം:",
      message,
      contextLabel,
    ]
      .filter(Boolean)
      .join("\n");

    const whatsappUrl = `https://wa.me/${AUTHOR_WHATSAPP}?text=${encodeURIComponent(draftQuestionForAuthor)}`;

    if (!canAnswer) {
      return res.json({
        status: "success",
        canAnswer: false,
        escalateToAuthor,
        answer: escalateToAuthor
          ? "ഈ ചോദ്യത്തിന് കൃത്യമായ മറുപടി ഇപ്പോൾ ലഭ്യമല്ല. ഗ്രന്ഥകർത്താവിനോട് നേരിട്ട് ചോദിക്കാം."
          : "ഖുർആൻ സംക്ഷിപ്ത അവലോകനവുമായി ബന്ധപ്പെട്ട ചോദ്യങ്ങൾ ചോദിക്കൂ. ഞാൻ ബന്ധപ്പെട്ട വചനങ്ങൾ കണ്ടെത്തി സഹായിക്കും.",
        references: [],
        whatsappUrl,
        draftQuestionForAuthor,
      });
    }

    const topRefs = references.slice(0, 3);
    const answerLines = topRefs.map((ref, idx) => `${idx + 1}) സൂറത്ത് ${ref.surahId || "?"} • ${ref.verseKey}\n${ref.snippet}`);

    return res.json({
      status: "success",
      canAnswer: true,
      escalateToAuthor: false,
      answer: `താങ്കളുടെ ചോദ്യവുമായി ബന്ധപ്പെട്ട ഭാഗങ്ങൾ കണ്ടെത്തി:\n\n${answerLines.join("\n\n")}`,
      references: topRefs,
      whatsappUrl,
      draftQuestionForAuthor,
    });
  });

  // API to retrieve list of available verses in the database (with optimized lazy-loading filtering)
  app.get("/api/verses", (req, res) => {
    const surahId = req.query.surahId ? parseInt(req.query.surahId as string, 10) : null;
    if (surahId) {
      const filtered: Record<string, any> = {};
      for (const [key, val] of Object.entries(quranData)) {
        // Skip introduction verses for Surah-wise rendering
        if (val.context_chapter === "ആമുഖം (Introduction)") {
          continue;
        }

        // Match "അധ്യായം N" or "അദ്ധ്യായം N" to Surah ID
        if (val.context_chapter) {
          const cleanContext = val.context_chapter.trim();
          const chapterMatch = cleanContext.match(/^(?:അധ്യായം|അദ്ധ്യായം)\s*(\d+)$/);
          if (chapterMatch) {
            const chapNum = parseInt(chapterMatch[1], 10);
            if (chapNum === surahId) {
              filtered[key] = val;
              continue;
            }
          }
        }

        if (val.surah === surahId) {
          filtered[key] = val;
        }
      }
      return res.json({
        status: "success",
        verses: filtered,
      });
    }

    const keysStr = req.query.keys as string | undefined;
    if (keysStr) {
      const keys = keysStr.split(",");
      const filtered: Record<string, any> = {};
      for (const key of keys) {
        if (quranData[key]) {
          filtered[key] = quranData[key];
        }
      }
      return res.json({
        status: "success",
        verses: filtered,
      });
    }

    // Default fallback: return all verses
    res.json({
      status: "success",
      verses: quranData,
    });
  });

  // API to retrieve available Surahs (meta-info for UI rendering)
  app.get("/api/surahs", (req, res) => {
    const surahs = allSurahs.map((s) => {
      // Find available keys in quranData dynamically
      const availableKeys = Object.entries(quranData)
        .filter(([key, val]) => {
          // Skip introduction verses from being mapped to Surahs
          if (val.context_chapter === "ആമുഖം (Introduction)") {
            return false;
          }

          // Check if context_chapter is "അധ്യായം N" or "അദ്ധ്യായം N"
          if (val.context_chapter) {
            const cleanContext = val.context_chapter.trim();
            const chapterMatch = cleanContext.match(/^(?:അധ്യായം|അദ്ധ്യായം)\s*(\d+)$/);
            if (chapterMatch) {
              const chapNum = parseInt(chapterMatch[1], 10);
              return chapNum === s.id;
            }
          }

          return val.surah === s.id || val.context_chapter === s.nameMal;
        })
        .map(([key, val]) => key);

      return {
        id: String(s.id),
        name: s.nameMal,
        englishName: s.name,
        arabicName: s.arabicName,
        translation: `${s.translation} (${s.translationEng})`,
        versesCount: s.versesCount,
        revelation: s.revelationMal,
        tags: [s.revelationMal, `${s.versesCount} Ayahs`],
        description: s.description,
        availableKeys: availableKeys,
      };
    });

    res.json({
      status: "success",
      surahs,
    });
  });

  // In-memory cache for generated summaries to prevent redundant slow AI calls
  const surahSummaryCache = new Map<number, any>();

  // Pre-populated, high-quality Malayalam summaries for common Surahs to load them instantly
  const predefinedSummaries: Record<number, any> = {
    1: {
      introduction: "വിശുദ്ധ ഖുർആനിലെ ഒന്നാമത്തെ അധ്യായമാണ് അൽ-ഫാത്തിഹ (ആരംഭം). ഖുർആന്റെ സത്ത മുഴുവൻ അടങ്ങിയിരിക്കുന്നതിനാൽ ഈ സൂറത്തിനെ 'ഉമ്മുൽ ഖുർആൻ' (ഖുർആന്റെ മാതാവ്) എന്നും വിളിക്കുന്നു. പ്രാർത്ഥനയിലും ദൈനംദിന ജീവിതത്തിലും ഏറ്റവും കൂടുതൽ പാരായണം ചെയ്യപ്പെടുന്ന ഈ മക്കീ സൂറത്ത്, അല്ലാഹുവിനെ സ്തുതിക്കാനും അവന്റെ മാർഗ്ഗദർശനം തേടാനുമുള്ള ഒരു തികഞ്ഞ പ്രാർത്ഥനയാണ്.",
      keyThemes: [
        {
          theme: "അല്ലാഹുവിന്റെ പരമാധികാരവും സ്തുതിയും",
          description: "പ്രപഞ്ചനാഥനായ അല്ലാഹുവിനുള്ള സ്തുതിയും ആരാധനയും മാത്രമാണ് എല്ലാറ്റിനും അടിസ്ഥാനമെന്ന് ഈ സൂറത്ത് പ്രഖ്യാപിക്കുന്നു."
        },
        {
          theme: "കാരുണ്യവും പരലോക വിജയവും",
          description: "പരമകാരുണികനും കരുണാനിധിയുമായ അല്ലാഹുവിന്റെ കാരുണ്യത്തെയും, പ്രതിഫല ദിവസത്തിന്റെ (ന്യായവിധി നാൾ) പ്രാധാന്യത്തെയും ഇത് ഓർമ്മിപ്പിക്കുന്നു."
        },
        {
          theme: "മാർഗ്ഗദർശനവും സൽമാർഗ്ഗവും",
          description: "നേരായ വഴിയിലേക്ക് നയിക്കാനുള്ള അടിയന്തര പ്രാർത്ഥനയും, മുൻകാലങ്ങളിൽ അനുഗ്രഹം ലഭിച്ചവരുടെ വഴി പിന്തുടരാനുള്ള ആഗ്രഹവും ഇതിൽ അടങ്ങിയിരിക്കുന്നു."
        }
      ],
      notableVerses: [
        {
          verseRange: "1-2",
          message: "പരമകാരുണികനും കരുണാനിധിയുമായ അല്ലാഹുവിന്റെ നാമത്തിൽ. സർവ്വലോക രക്ഷിതാവായ അല്ലാഹുവിനാണ് സർവ്വ സ്തുതിയും."
        },
        {
          verseRange: "5",
          message: "നിന്നെ മാത്രം ഞങ്ങൾ ആരാധിക്കുന്നു, നിന്നോട് മാത്രം ഞങ്ങൾ സഹായം തേടുന്നു. ആരാധനയും സഹായം തേടലും അല്ലാഹുവിനോട് മാത്രമാണെന്ന തൗഹീദിന്റെ അടിസ്ഥാന തത്വം."
        },
        {
          verseRange: "6",
          message: "ഞങ്ങളെ നീ സൽമാർഗ്ഗത്തിൽ നയിക്കേണമേ. ജീവിതത്തിൽ എപ്പോഴും ദൈവത്തിന്റെ നേരായ വഴിയിലായിരിക്കാനുള്ള അപേക്ഷ."
        }
      ],
      practicalLessons: [
        "ദിനംപ്രതി ഓരോ പ്രാർത്ഥനയിലും അൽ-ഫാത്തിഹ ആവർത്തിക്കുന്നതിലൂടെ അല്ലാഹുവുമായുള്ള ബന്ധം സജീവമായി നിലനിർത്തുക.",
        "അല്ലാഹുവോട് മാത്രം സഹായം ചോദിക്കുകയും അവനിൽ പൂർണ്ണമായി ഭരമേൽപ്പിക്കുകയും ചെയ്യുക.",
        "എല്ലാ കാര്യങ്ങളും അല്ലാഹുവിന്റെ നാമത്തിലും അവനുള്ള കൃതജ്ഞതയോടും കൂടി ആരംഭിക്കുക.",
        "ജീവിതത്തിൽ വഴിപിഴച്ചു പോകാതിരിക്കാൻ നിരന്തരം മാർഗ്ഗദർശനം (ഹിദായത്ത്) പ്രാർത്ഥിക്കുക."
      ],
      conclusion: "അൽ-ഫാത്തിഹ വെറുമൊരു സൂറത്ത് മാത്രമല്ല, അത് ജീവിതത്തിന്റെ മുഴുവൻ മാർഗ്ഗരേഖയുമാണ്. സ്രഷ്ടാവും സൃഷ്ടിയും തമ്മിലുള്ള സംഭാഷണവും ആത്മാർത്ഥമായ സമർപ്പണവുമാണ് ഈ അധ്യായത്തിന്റെ അന്തഃസത്ത."
    },
    112: {
      introduction: "വിശുദ്ധ ഖുർആനിലെ നൂറ്റിപ്പതിരണ്ടാം അധ്യായമാണ് അൽ-ഇഖ്ലാസ് (ശുദ്ധീകരണം/ഏകദൈവവിശ്വാസം). ഇസ്‌ലാമിലെ ഏകദൈവ വിശ്വാസത്തിന്റെ (തൗഹീദ്) അടിത്തറയും അതിന്റെ ഏറ്റവും ചുരുങ്ങിയതും ശക്തവുമായ വിവരണവും ഈ സൂറത്ത് നൽകുന്നു. ഖുർആന്റെ മൂന്നിലൊന്നിന് സമമായി ഈ ചെറിയ സൂറത്തിനെ പ്രവാചകൻ മുഹമ്മദ് നബി (സ) വിശേഷിപ്പിച്ചിട്ടുണ്ട്.",
      keyThemes: [
        {
          theme: "അല്ലാഹുവിന്റെ ഏകത്വം",
          description: "അല്ലാഹു ഏകനാണെന്നും അവന് യാതൊരു പങ്കുകാരോ തുല്യരോ ഇല്ലെന്നും വ്യക്തമാക്കുന്നു."
        },
        {
          theme: "ദൈവിക അനിവാര്യത (സ്വമദ്)",
          description: "അല്ലാഹു മറ്റാരെയും ആശ്രയിക്കാത്തവനും എന്നാൽ മറ്റെല്ലാവരും അവനെ ആശ്രയിക്കുന്നവനുമാണ്."
        },
        {
          theme: "ജനന മരണങ്ങളിൽ നിന്നുള്ള പരിശുദ്ധി",
          description: "അവൻ ആർക്കും ജന്മം നൽകിയിട്ടില്ല, അവന് ആരും ജന്മം നൽകിയിട്ടുമില്ല."
        }
      ],
      notableVerses: [
        {
          verseRange: "1-2",
          message: "പറയുക: കാര്യം അല്ലാഹു ഏകനാണ് എന്നതാകുന്നു. അല്ലാഹു എല്ലാവരാലും ആശ്രയിക്കപ്പെടുന്നവനാകുന്നു."
        },
        {
          verseRange: "3-4",
          message: "അവൻ ജനിപ്പിച്ചിട്ടില്ല; ജനിച്ചിട്ടുമില്ല. അവന് തുല്യനായി ആരും തന്നെയില്ല."
        }
      ],
      practicalLessons: [
        "അല്ലാഹുവെ ആരാധിക്കുന്നതിലും പ്രാർത്ഥിക്കുന്നതിലും തികഞ്ഞ ആത്മാർത്ഥത (ഇഖ്ലാസ്) പുലർത്തുക.",
        "മറ്റൊരു ശക്തിക്കും ദൈവത്തിന്റെ ഗുണങ്ങളുണ്ടെന്ന് വിശ്വസിക്കാതിരിക്കുക.",
        "സന്തോഷത്തിലും ബുദ്ധിമുട്ടിലും അവനെ മാത്രം ആശ്രയിക്കുക (സ്വമദ് എന്ന ഗുണം ഉൾക്കൊള്ളുക).",
        "ദിവസവും ഉറങ്ങുന്നതിന് മുമ്പും പ്രാർത്ഥനകൾക്ക് ശേഷവും ഈ സൂറത്ത് പതിവായി ഓതി സംരക്ഷണം തേടുക."
      ],
      conclusion: "ഏകദൈവ വിശ്വാസത്തിന്റെ പരമപ്രധാനമായ പ്രഖ്യാപനമാണ് ഈ സൂറത്ത്. മനുഷ്യബുദ്ധിക്ക് ചിന്തിക്കാവുന്നതിൽ വെച്ച് ഏറ്റവും ലളിതവും ഗഹനവുമായ രീതിയിലാണ് അല്ലാഹു തന്റെ സത്ത ഇതിൽ വിവരിച്ചിരിക്കുന്നത്."
    },
    113: {
      introduction: "വിശുദ്ധ ഖുർആനിലെ നൂറ്റിപ്പതിമൂന്നാം അധ്യായമാണ് അൽ-ഫലഖ് (പ്രഭാതം). തിന്മകളിൽ നിന്നും അസൂയക്കാരിൽ നിന്നും അല്ലാഹുവോട് സംരക്ഷണം തേടുന്നതിനുള്ള ഏറ്റവും ശക്തമായ പ്രാർത്ഥനയാണിത്. അൽ-ഫലഖ്, അൻ-നാസ് എന്നീ രണ്ട് സൂറത്തുകളെയും ചേർത്ത് 'മുഅവ്വിദതൈൻ' (സംരക്ഷണം തേടുന്ന രണ്ട് അധ്യായങ്ങൾ) എന്ന് വിളിക്കുന്നു.",
      keyThemes: [
        {
          theme: "പ്രഭാതത്തിന്റെ നാഥനോട് ശരണം തേടൽ",
          description: "ഇരുളിൽ നിന്നും പ്രകാശത്തിലേക്ക് നയിക്കുന്ന പ്രഭാതത്തിന്റെ നാഥനായ അല്ലാഹുവിലേക്ക് തിന്മകളിൽ നിന്ന് ഓടിയടുക്കാൻ ഉപദേശിക്കുന്നു."
        },
        {
          theme: "പ്രകൃതിയിലെയും മനുഷ്യരിലെയും തിന്മകൾ",
          description: "സൃഷ്ടികളുടെ ദോഷങ്ങൾ, രാത്രിയിലെ ഇരുട്ട് പരക്കുമ്പോഴുണ്ടാകുന്ന വിപത്തുകൾ, മന്ത്രവാദങ്ങൾ എന്നിവയിൽ നിന്നുള്ള സംരക്ഷണം തേടുന്നു."
        },
        {
          theme: "അസൂയയുടെ ആപത്ത്",
          description: "അസൂയക്കാരൻ അസൂയ വെക്കുമ്പോൾ ഉണ്ടാകുന്ന മാനസികവും ശാരീരികവുമായ ദോഷങ്ങളിൽ നിന്നുള്ള ദൈവീക സംരക്ഷണം ഉറപ്പാക്കുന്നു."
        }
      ],
      notableVerses: [
        {
          verseRange: "1-2",
          message: "പറയുക: പ്രഭാതത്തിന്റെ രക്ഷിതാവിനോട് ഞാൻ ശരണം തേടുന്നു, അവൻ സൃഷ്ടിച്ചിട്ടുള്ളവയുടെ തിന്മയിൽ നിന്ന്."
        },
        {
          verseRange: "5",
          message: "അസൂയക്കാരൻ അസൂയപ്പെടുമ്പോൾ അവന്റെ തിന്മയിൽ നിന്നും (ഞാൻ ശരണം തേടുന്നു). അസൂയ എത്രത്തോളം അപകടകരമാണെന്ന് ഇത് കാണിക്കുന്നു."
        }
      ],
      practicalLessons: [
        "ഭയം വരുമ്പോഴും അപകടസാഹചര്യങ്ങളിലും അല്ലാഹുവിന്റെ സംരക്ഷണത്തിൽ പൂർണ്ണ വിശ്വാസമർപ്പിക്കുക.",
        "മനസ്സിൽ അസൂയ വിചാരിക്കാതിരിക്കുകയും മറ്റുള്ളവരുടെ നന്മയിൽ സന്തോഷിക്കുകയും ചെയ്യുക.",
        "പ്രഭാതത്തിലും പ്രദോഷത്തിലും ഉറങ്ങാൻ കിടക്കുമ്പോഴും ഈ സൂറത്ത് പതിവായി ഓതുക.",
        "രഹസ്യമായി ചെയ്യുന്ന തിന്മകളിൽ നിന്നും ദുരാചാരങ്ങളിൽ നിന്നും അകന്നു നിൽക്കുക."
      ],
      conclusion: "ബാഹ്യ ലോകത്തുനിന്നും മനുഷ്യരിൽ നിന്നും ഉണ്ടാകുന്ന വിവിധങ്ങളായ ഭയങ്ങളിൽ നിന്നും തിന്മകളിൽ നിന്നും ദൈവത്തിന്റെ രക്ഷാകവചം തേടാൻ ഈ അധ്യായം നമ്മെ പഠിപ്പിക്കുന്നു."
    },
    114: {
      introduction: "വിശുദ്ധ ഖുർആനിലെ നൂറ്റിപ്പതിനാലാമത്തെയും അവസാനത്തെയും അധ്യായമാണ് അൻ-നാസ് (മനുഷ്യർ). മനുഷ്യരുടെ മനസ്സിലേക്ക് ദുർബോധനങ്ങൾ കടത്തിവിടുന്ന പിശാചുക്കളിൽ നിന്നും ജിന്നുകളിൽ നിന്നും അല്ലാഹുവോട് അഭയം തേടാനാണ് ഇതിലൂടെ ഉപദേശിക്കുന്നത്. മനുഷ്യന്റെ ആന്തരിക സുരക്ഷയ്ക്കുള്ള ദൈവീക കവചമാണിത്.",
      keyThemes: [
        {
          theme: "അല്ലാഹുവിന്റെ മൂന്ന് മഹത്തായ വിശേഷണങ്ങൾ",
          description: "മനുഷ്യരുടെ രക്ഷിതാവ് (റബ്ബ്), മനുഷ്യരുടെ രാജാവ് (മലിക്), മനുഷ്യരുടെ ദൈവം (ഇലാഹ്) എന്നീ മൂന്ന് നാമങ്ങളിലൂടെ അവനിലേക്ക് ശരണം തേടുന്നു."
        },
        {
          theme: "ആന്തരിക ദുർബോധനങ്ങൾ (വസ്‌വാസ്)",
          description: "മനുഷ്യന്റെ മനസ്സിൽ സംശയങ്ങളും മോഹങ്ങളും ജനിപ്പിക്കുന്ന പിശാചിന്റെയും മനുഷ്യരുടെയും കെണികളിൽ നിന്ന് സംരക്ഷണം ആവശ്യപ്പെടുന്നു."
        },
        {
          theme: "ദൃശ്യവും അദൃശ്യവുമായ ശത്രുക്കൾ",
          description: "മനുഷ്യരിലും ജിന്നുകളിലും പെട്ട ദുർബോധകന്മാരെ തിരിച്ചറിഞ്ഞ് അവരിൽ നിന്നെല്ലാം ദൈവത്തോട് കാവൽ ചോദിക്കുന്നു."
        }
      ],
      notableVerses: [
        {
          verseRange: "1-3",
          message: "പറയുക: മനുഷ്യരുടെ രക്ഷിതാവിനോട് ഞാൻ ശരണം തേടുന്നു. മനുഷ്യരുടെ രാജാവിനോട്, മനുഷ്യരുടെ ദൈവത്തോട്."
        },
        {
          verseRange: "4-5",
          message: "പിൻവാങ്ങി കളയുന്ന ദുർബോധകന്റെ തിന്മയിൽ നിന്ന്. മനുഷ്യരുടെ ഹൃദയങ്ങളിൽ ദുർബോധനം നടത്തുന്നവൻ."
        }
      ],
      practicalLessons: [
        "മാനസികമായ ആശങ്കകളും അനാവശ്യ ചിന്തകളും ഉണ്ടാകുമ്പോൾ ഈ സൂറത്ത് ഓതി മനസ്സിനെ ശാന്തമാക്കുക.",
        "മനസ്സിലേക്ക് തെറ്റായ ചിന്തകൾ വരുമ്പോൾ ഉടൻ തന്നെ അല്ലാഹുവോട് കാവൽ ചോദിക്കുക.",
        "മറ്റു മനുഷ്യരെ തെറ്റിലേക്ക് നയിക്കുന്ന ദുർബോധകനായി നാം മാറാതിരിക്കാൻ ശ്രദ്ധിക്കുക.",
        "ദിവസേനയുള്ള സംരക്ഷണത്തിനായി മൂന്ന് കുൽ സൂറത്തുകൾ (ഇഖ്ലാസ്, ഫലഖ്, നാസ്) പതിവാക്കുക."
      ],
      conclusion: "ബാഹ്യമായ തിന്മകളിൽ നിന്ന് അൽ-ഫലഖ് രക്ഷ നൽകുമ്പോൾ, മനുഷ്യന്റെ ഹൃദയത്തെയും ആത്മാവിനെയും ബാധിക്കുന്ന ആന്തരിക തിന്മകളിൽ നിന്നും സംശയങ്ങളിൽ നിന്നും അൻ-നാസ് സംരക്ഷണം നൽകുന്നു."
    }
  };

  // New API to dynamically generate comprehensive AI Summary for any Surah
  app.get("/api/surah-summary/:id", async (req, res) => {
    const surahId = parseInt(req.params.id, 10);
    const surah = allSurahs.find((s) => s.id === surahId);

    if (!surah) {
      return res.status(404).json({
        status: "error",
        message: "Surah not found",
      });
    }

    // 1. Check if we have a static predefined summary (Instantaneous!)
    if (predefinedSummaries[surahId]) {
      return res.json({
        status: "success",
        summary: predefinedSummaries[surahId]
      });
    }

    // 2. Check if we have it in our in-memory cache
    if (surahSummaryCache.has(surahId)) {
      return res.json({
        status: "success",
        summary: surahSummaryCache.get(surahId)
      });
    }

    const systemInstruction = `
You are a renowned, objective Islamic scholar and expert in Quranic sciences.
Provide a beautiful, highly structured, and spiritually uplifting overview of the requested Surah in Malayalam.
The response must be structured strictly in JSON matching the specified schema.
The language of all content fields must be elegant, clear Malayalam.
`;

    const userPrompt = `
Generate a scholarly overview and key message summary for:
Surah Number: ${surah.id}
Surah Name: ${surah.nameMal} (${surah.name})
Arabic Name: ${surah.arabicName}
Translation: ${surah.translation} (${surah.translationEng})
Verse Count: ${surah.versesCount}
Revelation: ${surah.revelationMal} (${surah.revelation})

Structure the response exactly as a JSON object with:
- introduction: (string) A comprehensive, inspiring 3-4 sentence introduction to this Surah.
- keyThemes: (array of objects) 3-4 key themes or messages of this Surah. Each object should have:
  - theme: (string) Theme title in Malayalam
  - description: (string) Theme description in Malayalam
- notableVerses: (array of objects) 2-3 notable or famous verses/sections from this Surah. Each object should have:
  - verseRange: (string) Verse numbers (e.g., "1-4" or "Ayah 255")
  - message: (string) The core message/explanation of this verse in Malayalam
- practicalLessons: (array of strings) 3-4 practical, actionable lessons for modern daily life from this Surah.
- conclusion: (string) A beautiful concluding reflection in Malayalam.
`;

    try {
      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: userPrompt,
        config: {
          systemInstruction,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              introduction: { type: Type.STRING },
              keyThemes: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    theme: { type: Type.STRING },
                    description: { type: Type.STRING }
                  },
                  required: ["theme", "description"]
                }
              },
              notableVerses: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    verseRange: { type: Type.STRING },
                    message: { type: Type.STRING }
                  },
                  required: ["verseRange", "message"]
                }
              },
              practicalLessons: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
              },
              conclusion: { type: Type.STRING }
            },
            required: ["introduction", "keyThemes", "notableVerses", "practicalLessons", "conclusion"]
          }
        }
      });

      const responseText = response.text || "{}";
      const result = JSON.parse(responseText.trim());
      
      // Store in memory cache
      surahSummaryCache.set(surahId, result);

      res.json({
        status: "success",
        summary: result
      });
    } catch (error) {
      console.error("Error generating Surah summary:", error);
      res.status(500).json({
        status: "error",
        message: "Failed to generate summary",
      });
    }
  });

  // Free Malayalam Text-To-Speech Proxy using Google Translate TTS with support for longer text via chunking
  app.get("/api/tts", async (req, res) => {
    const text = req.query.text as string;
    if (!text) {
      return res.status(400).json({ error: "Text query parameter is required" });
    }

    try {
      // Clean and truncate text to a maximum of 1500 characters to prevent abuse or excessively long requests
      const truncatedText = text.substring(0, 1500);

      // Pronunciation normalization for key Malayalam-Arabic terms
      const normalizedText = truncatedText
        .replace(/\u200c|\u200d/g, "")
        .replace(/അല്ലാഹു/g, "അല്ലാഹൂ")
        .replace(/അല്-ലാഹു|അൽ-ലാഹു|അൽ ലാഹു/g, "അല്ലാഹൂ")
        // Reference pronunciation normalization (e.g. 6:154-158, 14:4)
        .replace(/(\d+)\s*:\s*(\d+)\s*-\s*(\d+)/g, (_m, s, a1, a2) => `സൂറത്ത് ${s} വചനം ${a1} മുതൽ ${a2} വരെ`)
        .replace(/(\d+)\s*:\s*(\d+)/g, (_m, s, a) => `സൂറത്ത് ${s} വചനം ${a}`)
        .replace(/\s+/g, " ")
        .trim();

      // Helper function to split text into chunks of maximum 160 characters
      const splitTextIntoChunks = (str: string, maxLength = 160): string[] => {
        const cleaned = str.replace(/\s+/g, " ").trim();
        if (cleaned.length <= maxLength) {
          return [cleaned];
        }

        const words = cleaned.split(" ");
        const chunks: string[] = [];
        let currentChunk = "";

        for (const word of words) {
          if ((currentChunk + " " + word).trim().length > maxLength) {
            if (currentChunk.trim()) {
              chunks.push(currentChunk.trim());
            }
            currentChunk = word;
          } else {
            currentChunk = currentChunk ? currentChunk + " " + word : word;
          }
        }

        if (currentChunk.trim()) {
          chunks.push(currentChunk.trim());
        }

        return chunks;
      };

      const chunks = splitTextIntoChunks(normalizedText);
      const buffers: Buffer[] = [];

      for (const chunk of chunks) {
        // Keep natural punctuation for better Malayalam prosody; only strip control/special symbols.
        const cleanChunk = chunk
          .replace(/[\u0000-\u001F\u007F]/g, " ")
          .replace(/[\[\]{}#@_*+=|\\<>]/g, " ")
          .replace(/\s+/g, " ")
          .trim();

        if (!cleanChunk) continue;

        const url = `https://translate.google.com/translate_tts?ie=UTF-8&tl=ml&client=gtx&q=${encodeURIComponent(cleanChunk)}`;
        const response = await fetch(url, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
          }
        });

        if (!response.ok) {
          console.error(`Google TTS chunk fetch failed with status ${response.status} for chunk: "${cleanChunk}"`);
          continue; // Skip failing chunk instead of throwing and breaking everything, so we still play the rest!
        }

        const arrayBuffer = await response.arrayBuffer();
        buffers.push(Buffer.from(arrayBuffer));
      }

      if (buffers.length === 0) {
        throw new Error("No audio buffers were successfully generated");
      }

      const combinedBuffer = Buffer.concat(buffers);
      res.setHeader("Content-Type", "audio/mpeg");
      res.setHeader("Cache-Control", "public, max-age=86400");
      res.send(combinedBuffer);
    } catch (error) {
      console.error("TTS Proxy Error:", error);
      res.status(500).json({ error: "Failed to generate TTS audio" });
    }
  });

  // Assistant Query endpoint
  app.post("/api/query", async (req, res) => {
    const { query, requestedCoreEssence, language } = req.body;
    if (!query) {
      return res.status(400).json({
        status: "error",
        message: "Query parameter is required",
      });
    }

    const isEnglish = language === "english";

    // Try to find a direct reference matching Surah:Ayah (e.g. 6:154 or 6:154-158 or 6 154)
    const normalizedQuery = query.trim();
    const verseMatch = normalizedQuery.match(/(\d+)\s*[:\-\s]\s*(\d+)/);
    
    let matchedVerseKey: string | null = null;
    let matchedVerseData: any = null;

    if (verseMatch) {
      const surahNum = parseInt(verseMatch[1], 10);
      const ayahNum = parseInt(verseMatch[2], 10);
      
      // Look up key in data
      const possibleKey = `${surahNum}:${ayahNum}`;
      if (quranData[possibleKey]) {
        matchedVerseKey = possibleKey;
        matchedVerseData = quranData[possibleKey];
      } else {
        // Look up by surah and start/end ayah range
        for (const [key, val] of Object.entries(quranData)) {
          if (val.surah === surahNum && ayahNum >= val.start_ayah && ayahNum <= val.end_ayah) {
            matchedVerseKey = key;
            matchedVerseData = val;
            break;
          }
        }
      }
    }

    const waNum = process.env.WHATSAPP_NUMBER || "919876543210";
    const waText = encodeURIComponent(`എനിക്ക് ഈ വിഷയത്തിൽ സംശയമുണ്ട്: "${query}"`);
    const waLink = `https://wa.me/${waNum}?text=${waText}`;

    // Prompt construction for Gemini
    let systemInstruction = "";
    if (isEnglish) {
      systemInstruction = `
You are an intelligent, compassionate, and scholarly assistant for the 'Quran Summary Platform.'
Your task is to explain the provided Quranic content in English.

CRITICAL RULES:
1. Primary language MUST be English. Keep your explanation respectful, scholarly, and easy to understand for a modern reader.
2. CITATION: Always cite the Surah and Ayah numbers clearly (e.g., Surah 6:154).
3. SOURCE OF TRUTH: If information is requested about a verse, and we have the manuscript content, base your explanation strictly on the provided manuscript.
4. EXPLANATION SIZE & SPEED: Keep the explanation extremely concise and direct (1-2 sentences max). This is a fast real-time assistant, so respond as quickly and succinctly as possible without unnecessary filler.
5. CORE ESSENCE: If the user requests 'Core Essence', extract the key message from the JSON data and highlight the spiritual/practical lesson in English.
6. WHATSAPP ROUTING: If the user expresses deep doubt, high complexity, or personal spiritual distress, include a polite mention that they can connect for a 1-on-1 discussion, but still provide the English explanation in the JSON.
7. ABSENT INFO: If the information is NOT in the provided manuscript, politely state in English that you are focusing on the specific manuscript provided (e.g. "According to the provided manuscript, there is no further explanation on this topic in this work.").
`;
    } else {
      systemInstruction = `
You are an intelligent, compassionate, and scholarly assistant for the 'Quran Summary Platform.'
Your task is to explain the provided Quranic content in Malayalam.

CRITICAL RULES:
1. Primary language MUST be Malayalam. Keep your explanation respectful, scholarly, and easy to understand for a modern reader.
2. CITATION: Always cite the Surah and Ayah numbers clearly. (e.g., സൂറത്ത് 6:154).
3. SOURCE OF TRUTH: If information is requested about a verse, and we have the manuscript content, base your explanation strictly on the provided manuscript.
4. EXPLANATION SIZE & SPEED: Keep the explanation extremely concise and direct (1-2 sentences max). This is a fast real-time assistant, so respond as quickly and succinctly as possible without unnecessary filler.
5. CORE ESSENCE: If the user requests 'Core Essence' (പ്രധാന ആശയം / ജീവസ്സുറ്റ പാഠം), extract the key message from the JSON data and highlight the spiritual/practical lesson.
6. WHATSAPP ROUTING: If the user expresses deep doubt, high complexity, or personal spiritual distress, include a polite mention that they can connect for a 1-on-1 discussion, but still provide the Malayalam explanation in the JSON.
7. ABSENT INFO: If the information is NOT in the provided manuscript, politely state in Malayalam that you are focusing on the specific manuscript provided (e.g. "നൽകിയിട്ടുള്ള കയ്യെഴുത്തുപ്രതിയിലെ വിവരങ്ങൾ അനുസരിച്ച് ഈ വിഷയത്തിൽ കൂടുതൽ വിശദീകരണമില്ല...").
`;
    }

    let userPrompt = "";
    if (isEnglish) {
      userPrompt = `
User Query: "${query}"
Is Core Essence requested? ${requestedCoreEssence ? "Yes" : "No"}

Manuscript Data Available for Query:
${matchedVerseData ? JSON.stringify(matchedVerseData, null, 2) : "None found in manuscript for this specific search."}

Please output the response strictly matching the following schema.
The explanation field must be in clear, readable English.
`;
    } else {
      userPrompt = `
User Query: "${query}"
Is Core Essence requested? ${requestedCoreEssence ? "Yes" : "No"}

Manuscript Data Available for Query:
${matchedVerseData ? JSON.stringify(matchedVerseData, null, 2) : "None found in manuscript for this specific search."}

Please output the response strictly matching the following schema.
The explanation field must be in elegant Malayalam.
`;
    }

    try {
      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: userPrompt,
        config: {
          systemInstruction,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              status: { type: Type.STRING },
              explanation: { 
                type: Type.STRING, 
                description: isEnglish
                  ? "Brief scholarly explanation in English (1-2 sentences max) citing the Surah and Ayah"
                  : "Elegant brief scholarly explanation in Malayalam (1-2 sentences max) citing the Surah and Ayah"
              },
              wa_link: { type: Type.STRING, description: "The WhatsApp discussion link provided" }
            },
            required: ["status", "explanation", "wa_link"]
          }
        }
      });

      const responseText = response.text || "{}";
      const result = JSON.parse(responseText.trim());
      
      // Override wa_link if not returned perfectly
      if (!result.wa_link || result.wa_link.includes("yournumber")) {
        result.wa_link = waLink;
      }
      
      res.json(result);
    } catch (error) {
      console.error("Gemini query error:", error);
      const fallbackExplanation = isEnglish
        ? (matchedVerseData 
            ? `Overview of Surah ${matchedVerseData.surah}:${matchedVerseData.start_ayah} - ${matchedVerseData.end_ayah}: ${matchedVerseData.text[0].substring(0, 150)}...`
            : "Sorry, I couldn't find a precise answer to this question in the provided manuscript.")
        : (matchedVerseData 
            ? `സൂറത്ത് ${matchedVerseData.surah}:${matchedVerseData.start_ayah} - ${matchedVerseData.end_ayah} നെക്കുറിച്ചുള്ള അവലോകനം: ${matchedVerseData.text[0].substring(0, 150)}...`
            : "ക്ഷമിക്കണം, ഈ ചോദ്യത്തിന് കൃത്യമായ മറുപടി കണ്ടെത്താൻ കഴിഞ്ഞില്ല. നൽകിയിട്ടുള്ള കയ്യെഴുത്തുപ്രതിയിൽ ഈ ഭാഗത്തെക്കുറിച്ചുള്ള വിവരങ്ങൾ ലഭ്യമല്ല.");
      res.json({
        status: "success",
        explanation: fallbackExplanation,
        wa_link: waLink
      });
    }
  });

  // Direct Database Search endpoint (replaces AI semantic search)
  app.post("/api/semantic-search", async (req, res) => {
    const { keyword } = req.body;
    if (!keyword) {
      return res.status(400).json({
        status: "error",
        message: "Keyword is required",
      });
    }

    const query = keyword.trim().toLowerCase();

    try {
      // 1. Identify matching surah IDs based on English name, Malayalam name, translations, etc.
      const matchingSurahIds = new Set<number>();
      const matchedSurahsList = [];
      for (const s of allSurahs) {
        if (
          s.name.toLowerCase().includes(query) ||
          s.nameMal.toLowerCase().includes(query) ||
          s.translation.toLowerCase().includes(query) ||
          (s.translationEng && s.translationEng.toLowerCase().includes(query)) ||
          (s.description && s.description.toLowerCase().includes(query))
        ) {
          matchingSurahIds.add(s.id);
          const availableKeys = Object.entries(quranData)
            .filter(([key, val]) => val.surah === s.id || val.context_chapter === s.nameMal)
            .map(([key, val]) => key);

          matchedSurahsList.push({
            id: String(s.id),
            name: s.nameMal,
            englishName: s.name,
            arabicName: s.arabicName,
            translation: `${s.translation} (${s.translationEng})`,
            versesCount: s.versesCount,
            revelation: s.revelationMal,
            tags: [s.revelationMal, `${s.versesCount} Ayahs`],
            description: s.description,
            availableKeys: availableKeys,
          });
        }
      }

      // Also match by exact Surah number if the query is a simple integer
      const querySurahNum = parseInt(query, 10);
      if (!isNaN(querySurahNum)) {
        const s = allSurahs.find((sur) => sur.id === querySurahNum);
        if (s && !matchingSurahIds.has(s.id)) {
          matchingSurahIds.add(s.id);
          const availableKeys = Object.entries(quranData)
            .filter(([key, val]) => val.surah === s.id || val.context_chapter === s.nameMal)
            .map(([key, val]) => key);

          matchedSurahsList.push({
            id: String(s.id),
            name: s.nameMal,
            englishName: s.name,
            arabicName: s.arabicName,
            translation: `${s.translation} (${s.translationEng})`,
            versesCount: s.versesCount,
            revelation: s.revelationMal,
            tags: [s.revelationMal, `${s.versesCount} Ayahs`],
            description: s.description,
            availableKeys: availableKeys,
          });
        }
      }

      const directMatches: { key: string; chapter: string; preview: string }[] = [];

      // 2. Check if the query is a specific reference format like "6:154" or "6 154"
      const refMatch = query.match(/^(\d+)[\s:-]+(\d+)$/);
      if (refMatch) {
        const surahNum = parseInt(refMatch[1], 10);
        const ayahNum = parseInt(refMatch[2], 10);
        const exactKey = `${surahNum}:${ayahNum}`;

        if (quranData[exactKey]) {
          const verse = quranData[exactKey];
          const surahMeta = allSurahs.find((s) => s.id === verse.surah);
          const surahName = surahMeta ? `${surahMeta.nameMal} (${surahMeta.name})` : `Surah ${verse.surah}`;
          directMatches.push({
            key: exactKey,
            chapter: `${surahName} - ${verse.context_chapter}`,
            preview: verse.text[0] || "",
          });
        } else {
          // Find if the ayah falls into any verse range
          for (const [key, val] of Object.entries(quranData)) {
            if (val.surah === surahNum && ayahNum >= val.start_ayah && ayahNum <= val.end_ayah) {
              const surahMeta = allSurahs.find((s) => s.id === val.surah);
              const surahName = surahMeta ? `${surahMeta.nameMal} (${surahMeta.name})` : `Surah ${val.surah}`;
              directMatches.push({
                key,
                chapter: `${surahName} - ${val.context_chapter}`,
                preview: val.text[0] || "",
              });
              break;
            }
          }
        }
      }

      // 3. Find other matches by checking text content and chapter names
      const textMatches: { key: string; chapter: string; preview: string }[] = [];
      for (const [key, val] of Object.entries(quranData)) {
        const isSurahMatch = matchingSurahIds.has(val.surah);
        const isTextMatch = val.text.some((t) => t.toLowerCase().includes(query));
        const isChapterMatch = val.context_chapter.toLowerCase().includes(query);
        const isKeyMatch = key === query || key.includes(query);

        if (isSurahMatch || isTextMatch || isChapterMatch || isKeyMatch) {
          // Avoid duplicating direct reference matches
          if (directMatches.some((m) => m.key === key)) {
            continue;
          }

          const surahMeta = allSurahs.find((s) => s.id === val.surah);
          const surahName = surahMeta ? `${surahMeta.nameMal} (${surahMeta.name})` : `Surah ${val.surah}`;

          textMatches.push({
            key,
            chapter: `${surahName} - ${val.context_chapter}`,
            preview: val.text[0] || "",
          });
        }
      }

      // Combine direct matches first, then general text matches, capped at 50 results
      const allMatches = [...directMatches, ...textMatches].slice(0, 50);

      res.json({
        status: "success",
        keyword: keyword,
        matches: allMatches,
        surahMatches: matchedSurahsList,
      });
    } catch (error) {
      console.error("Direct search error:", error);
      res.status(500).json({
        status: "error",
        message: "Failed to perform database search",
      });
    }
  });

  // Vite and production fallback
  if (serveFrontend) {
    if (process.env.NODE_ENV !== "production") {
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: "spa",
      });
      app.use(vite.middlewares);
    } else {
      const distPath = path.join(process.cwd(), "dist");
      app.use(express.static(distPath));
      app.get("*", (req, res) => {
        res.sendFile(path.join(distPath, "index.html"));
      });
    }
  }

  return app;
}

let cachedApiApp: Promise<express.Express> | null = null;

const getApiApp = () => {
  if (!cachedApiApp) {
    cachedApiApp = startServer({ serveFrontend: false });
  }
  return cachedApiApp;
};

export default async function handler(req: any, res: any) {
  const app = await getApiApp();
  return app(req, res);
}

if (!process.env.VERCEL) {
  startServer({ serveFrontend: true })
    .then((app) => {
      const PORT = Number(process.env.PORT || 3000);
      const HOST = process.env.HOST || "0.0.0.0";
      app.listen(PORT, HOST, () => {
        console.log(`Server running on http://localhost:${PORT}`);
      });
    })
    .catch((error) => {
      console.error("Failed to start server:", error);
      process.exit(1);
    });
}
