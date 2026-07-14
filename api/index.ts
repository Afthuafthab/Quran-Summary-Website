import express from "express";
import path from "path";
import { promises as fs } from "fs";
import { createClient } from "@sanity/client";
import { quranData } from "../src/data/pmd_converted_content";
import { volume2Data } from "../src/data/volume2";

const sanityClient = createClient({
  projectId: process.env.VITE_SANITY_PROJECT_ID || "lgqos9pf",
  dataset: process.env.VITE_SANITY_DATASET || "production",
  apiVersion: process.env.VITE_SANITY_API_VERSION || "2025-07-01",
  useCdn: false,
});

const ADMIN_USER_ID = process.env.ADMIN_USER_ID || "test";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "test@123";
const HARD_COPY_TARGET = Math.max(50, Number(process.env.HARD_COPY_TARGET || 100));

const DATA_DIR = process.env.VERCEL ? "/tmp" : path.join(process.cwd(), "data");
const HARD_COPY_STORE_PATH = path.join(DATA_DIR, "hardcopy_votes.json");
const BETA_REPORT_STORE_PATH = path.join(DATA_DIR, "beta_reports.json");

type HardCopyVote = {
  id: string;
  name: string;
  phone?: string;
  address?: string;
  email?: string;
  createdAt: string;
  updatedAt: string;
};

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

const ensureStore = async <T>(filePath: string, fallback: T) => {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  try {
    await fs.access(filePath);
  } catch {
    await fs.writeFile(filePath, JSON.stringify(fallback, null, 2), "utf8");
  }
};

const readJson = async <T>(filePath: string, fallback: T): Promise<T> => {
  await ensureStore(filePath, fallback);
  const raw = await fs.readFile(filePath, "utf8");
  return JSON.parse(raw || JSON.stringify(fallback)) as T;
};

const writeJson = async <T>(filePath: string, value: T) => {
  await fs.writeFile(filePath, JSON.stringify(value, null, 2), "utf8");
};

const buildDemandVisual = (count: number) => {
  const progress = Math.max(0, Math.min(100, Math.round((count / HARD_COPY_TARGET) * 100)));
  const targetReached = count >= HARD_COPY_TARGET;

  let stage = "collecting";
  if (targetReached) stage = "ready_to_print";
  else if (progress >= 75) stage = "almost_ready";
  else if (progress >= 40) stage = "building";

  return { progress, stage, targetReached };
};

const isAdminAllowed = (req: express.Request) => {
  const providedUser = String(req.headers["x-admin-user-id"] || "").trim();
  const providedPass = String(req.headers["x-admin-password"] || "").trim();
  return providedUser === ADMIN_USER_ID && providedPass === ADMIN_PASSWORD;
};

let appPromise: Promise<express.Express> | null = null;

const getApp = async () => {
  if (appPromise) return appPromise;

  appPromise = (async () => {
    const app = express();
    app.use(express.json({ limit: "1mb" }));

    app.get("/api/health", (req, res) => {
      res.json({ status: "ok" });
    });

    app.get("/api/sanity/chapter", async (req, res) => {
      const chapterNumber = Number(String(req.query.chapterNumber || "").trim());
      if (!Number.isFinite(chapterNumber) || chapterNumber < 1 || chapterNumber > 114) {
        return res.status(400).json({ status: "error", message: "chapterNumber is required" });
      }

      try {
        const chapter = await sanityClient.fetch(
          `*[
            (_type == "bookSection" && sectionType == "surah" && coalesce(surahNumber, chapterNumber) == $chapterNumber)
            ||
            (_type == "chapter" && chapterNumber == $chapterNumber)
          ]
          | order(length(coalesce(content, body, "")) desc, _updatedAt desc)[0]{
            _id,
            _type,
            title,
            titleMal,
            titleEng,
            chapterNumber,
            surahNumber,
            versesCount,
            revelation,
            revelationMal,
            summary,
            content,
            body,
            _updatedAt
          }`,
          { chapterNumber }
        );

        if (!chapter) {
          return res.status(404).json({ status: "error", message: "Chapter not found" });
        }

        return res.json({ status: "success", chapter });
      } catch (error) {
        console.error("Sanity chapter fetch error:", error);
        return res.status(500).json({ status: "error", message: "Failed to fetch chapter" });
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

    app.get("/api/hardcopy-vote/status", async (req, res) => {
      try {
        const voteId = String(req.query.voteId || "").trim();
        const store = await readJson<{ votes: HardCopyVote[] }>(HARD_COPY_STORE_PATH, { votes: [] });
        const demand = buildDemandVisual(store.votes.length);
        const hasVoted = Boolean(voteId && store.votes.some((v) => v.id === voteId));

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
      const existingVoteId = String(req.body?.voteId || "").trim();

      if (!name) {
        return res.status(400).json({ status: "error", message: "Name is required" });
      }

      try {
        const store = await readJson<{ votes: HardCopyVote[] }>(HARD_COPY_STORE_PATH, { votes: [] });
        const now = new Date().toISOString();

        let voteId = existingVoteId;
        const existing = voteId ? store.votes.find((v) => v.id === voteId) : null;

        if (existing) {
          existing.name = name;
          existing.phone = phone || existing.phone;
          existing.address = address || existing.address;
          existing.email = email || existing.email;
          existing.updatedAt = now;
        } else {
          voteId = `vote_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
          store.votes.push({ id: voteId, name, phone: phone || undefined, address: address || undefined, email: email || undefined, createdAt: now, updatedAt: now });
        }

        await writeJson(HARD_COPY_STORE_PATH, store);
        const demand = buildDemandVisual(store.votes.length);

        return res.json({ status: "success", voteId, targetReached: demand.targetReached, demandStage: demand.stage, floatLevel: demand.progress });
      } catch (error) {
        console.error("Hard copy vote submit error:", error);
        return res.status(500).json({ status: "error", message: "Failed to submit vote" });
      }
    });

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
        const store = await readJson<{ reports: BetaReport[] }>(BETA_REPORT_STORE_PATH, { reports: [] });
        const now = new Date().toISOString();
        const reportId = `rep_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

        store.reports.unshift({ id: reportId, chapterId, sectionId, sectionTitle, anchorId, originalText, suggestedText, issueType, note: note || undefined, reporterName: reporterName || undefined, reporterContact: reporterContact || undefined, status: "new", createdAt: now, updatedAt: now });
        await writeJson(BETA_REPORT_STORE_PATH, store);

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
        const store = await readJson<{ reports: BetaReport[] }>(BETA_REPORT_STORE_PATH, { reports: [] });
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
        return res.status(400).json({ status: "error", message: "Invalid report update request" });
      }

      try {
        const store = await readJson<{ reports: BetaReport[] }>(BETA_REPORT_STORE_PATH, { reports: [] });
        const target = store.reports.find((r) => r.id === reportId);
        if (!target) {
          return res.status(404).json({ status: "error", message: "Report not found" });
        }

        target.status = nextStatus;
        target.updatedAt = new Date().toISOString();
        target.resolutionNote = resolutionNote || undefined;

        await writeJson(BETA_REPORT_STORE_PATH, store);
        return res.json({ status: "success", report: target });
      } catch (error) {
        console.error("Beta report update error:", error);
        return res.status(500).json({ status: "error", message: "Failed to update report" });
      }
    });

    app.get("/api/tts", async (req, res) => {
      const text = String(req.query.text || "").trim();
      if (!text) {
        return res.status(400).json({ status: "error", message: "Text query parameter is required" });
      }

      try {
        const normalizedText = text
          .substring(0, 1500)
          .replace(/\u200c|\u200d/g, "")
          .replace(/അല്ലാഹു/g, "അല്ലാഹൂ")
          .replace(/അല്-ലാഹു|അൽ-ലാഹു|അൽ ലാഹു/g, "അല്ലാഹൂ")
          .replace(/\s+/g, " ")
          .trim();

        if (!normalizedText) {
          return res.status(400).json({ status: "error", message: "Text not usable after normalization" });
        }

        const chunks = normalizedText.match(/.{1,160}(\s|$)/g) || [normalizedText];
        const audioBuffers: Buffer[] = [];

        for (const chunk of chunks) {
          const cleanChunk = chunk.replace(/[\u0000-\u001f\u007f]/g, "").trim();
          if (!cleanChunk) continue;

          const url = `https://translate.google.com/translate_tts?ie=UTF-8&tl=ml&client=gtx&q=${encodeURIComponent(cleanChunk)}`;
          const response = await fetch(url, {
            headers: {
              "User-Agent": "Mozilla/5.0",
              Referer: "https://translate.google.com/",
            },
          });

          if (!response.ok) {
            throw new Error(`Failed to fetch audio chunk: ${response.status}`);
          }

          const arrayBuffer = await response.arrayBuffer();
          audioBuffers.push(Buffer.from(arrayBuffer));
        }

        if (audioBuffers.length === 0) {
          return res.status(500).json({ status: "error", message: "No audio generated" });
        }

        const mergedAudio = Buffer.concat(audioBuffers);
        res.setHeader("Content-Type", "audio/mpeg");
        res.setHeader("Cache-Control", "public, max-age=300");
        return res.send(mergedAudio);
      } catch (error) {
        console.error("TTS proxy error:", error);
        return res.status(500).json({ status: "error", message: "Failed to generate Malayalam audio" });
      }
    });

    return app;
  })();

  return appPromise;
};

export default async function handler(req: any, res: any) {
  const app = await getApp();
  return app(req, res);
}
