import Groq from 'groq-sdk';
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

// ── Path resolution (ESM doesn't expose __dirname) ────────────────────────────
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

// ── Load config files ─────────────────────────────────────────────────────────
const affiliates = JSON.parse(
  readFileSync(path.join(ROOT, 'affiliate-config.json'), 'utf8')
);

const indexPath = path.join(ROOT, 'posts', 'index.json');
const index = JSON.parse(readFileSync(indexPath, 'utf8'));

// ── Today's date (UTC — matches GitHub Actions cron timezone) ─────────────────
const today = new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"

// ── Duplicate check ───────────────────────────────────────────────────────────
const existing = index.find(p => p.date === today);
if (existing) {
  console.log(`Post already exists for ${today}: ${existing.slug}. Skipping.`);
  process.exit(0);
}

// ── Build system prompt ───────────────────────────────────────────────────────
const SYSTEM_PROMPT = `You are an expert AI & automation content strategist, blog writer, and affiliate marketer writing for "KhanAI Daily".

Your job is to write one high-quality blog post about a trending AI tools topic and naturally embed affiliate opportunities throughout.

RESEARCH PHASE:
Identify the most relevant trending topic right now from:
- New AI tool launches or major updates
- Viral AI use cases on X, Reddit, LinkedIn, HackerNews
- Automation workflows gaining traction
- AI news affecting everyday people or small businesses

Pick ONE specific focused topic. Avoid vague topics.

WRITING RULES:
- Audience: General English-speaking readers, mostly US-based
- Tone: Conversational, smart, punchy — like a smart friend explaining something cool
- Length: 700–1000 words of body content
- No fluff. Every sentence must earn its place
- Use <h2> subheadings to break it up
- End with one clear takeaway or action item

AFFILIATE INTEGRATION:
Naturally mention 2–3 relevant AI tools within the article.
For each tool use this EXACT placeholder format in the href attribute:
<a href="{{AFFILIATE_LINK_TOOLNAME}}" class="aff-link">Try TOOLNAME free</a>

Where TOOLNAME is UPPERCASE. Available tool names (uppercase): CHATGPT, CLAUDE, NOTION, JASPER, CURSOR, PERPLEXITY, MAKE, ELEVENLABS, WRITESONIC

Rules:
- Never sound salesy
- Always explain WHY the tool matters before placing the link
- Include an FTC disclosure paragraph at the very end of body_html

OUTPUT FORMAT — respond with ONLY valid JSON, no markdown fences, no preamble, no trailing text:
{
  "title": "string — compelling, specific post title",
  "slug": "${today}-kebab-case-title",
  "date": "${today}",
  "excerpt": "string — one sentence summary, max 160 characters",
  "tags": ["string", "string", "string"] — 3-5 lowercase topic tags (e.g. ["ai writing", "automation", "productivity"]),
  "tool_featured": "string — primary tool key, lowercase (e.g. cursor)",
  "faq": [
    {"question": "string — a real question a reader would Google", "answer": "string — concise answer, 1-3 sentences"},
    {"question": "string", "answer": "string"},
    {"question": "string", "answer": "string"}
  ],
  "body_html": "string — full article as HTML. Use <h2>, <p>, <ul>, <li>, <strong>, <a> tags. Embed affiliate placeholders as described above. End with FTC disclosure paragraph."
}`;

const USER_PROMPT = `Write today's KhanAI Daily post for ${today}.

Pick one specific, trending AI topic that would genuinely help someone save time or make money. Make it practical and actionable. Mention 2-3 tools from the available list and embed their affiliate placeholders naturally.

Remember: output ONLY the JSON object, nothing else.`;

// ── Call Groq API ─────────────────────────────────────────────────────────────
console.log(`Generating post for ${today} using Groq (Llama 3.3 70B)...`);

const client = new Groq({ apiKey: process.env.GROQ_API_KEY });

let raw;
try {
  const completion = await client.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user',   content: USER_PROMPT   },
    ],
    max_tokens: 2048,
    temperature: 0.8,
  });
  raw = completion.choices[0].message.content.trim();
  console.log('Groq API call successful.');
} catch (err) {
  console.error('Groq API error:', err.message);
  process.exit(1);
}

// ── Strip markdown fences if model added them anyway ──────────────────────────
if (raw.startsWith('```')) {
  raw = raw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
}

// ── Parse JSON response ───────────────────────────────────────────────────────
let post;
try {
  post = JSON.parse(raw);
} catch (err) {
  console.error('Failed to parse Groq response as JSON.');
  console.error('Raw response was:');
  console.error(raw);
  process.exit(1);
}

// ── Validate required fields ──────────────────────────────────────────────────
const required = ['title', 'slug', 'date', 'excerpt', 'body_html'];
for (const field of required) {
  if (!post[field]) {
    console.error(`Missing required field in response: "${field}"`);
    process.exit(1);
  }
}

// ── Inject FAQPage JSON-LD block into body_html (AEO) ─────────────────────────
if (Array.isArray(post.faq) && post.faq.length > 0) {
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": post.faq.map(item => ({
      "@type": "Question",
      "name": item.question,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": item.answer
      }
    }))
  };
  const faqHtml =
    `\n<script type="application/ld+json">\n${JSON.stringify(faqSchema, null, 2)}\n</` + `script>`;
  post.body_html += faqHtml;
  console.log(`Injected FAQPage schema with ${post.faq.length} questions.`);
}

// ── Replace affiliate placeholders ────────────────────────────────────────────
let replacements = 0;
post.body_html = post.body_html.replace(
  /\{\{AFFILIATE_LINK_([A-Z]+)\}\}/g,
  (match, toolKey) => {
    const key = toolKey.toLowerCase();
    if (affiliates[key]) {
      replacements++;
      return affiliates[key].url || affiliates[key];
    }
    console.warn(`Unknown affiliate key: "${toolKey}" — leaving placeholder.`);
    return match;
  }
);
console.log(`Replaced ${replacements} affiliate placeholder(s).`);

// ── Ensure slug uses today's date prefix ─────────────────────────────────────
if (!post.slug.startsWith(today)) {
  post.slug = `${today}-${post.slug.replace(/^\d{4}-\d{2}-\d{2}-?/, '')}`;
}

// ── Save individual post file ─────────────────────────────────────────────────
const postPath = path.join(ROOT, 'posts', `${post.slug}.json`);
writeFileSync(postPath, JSON.stringify(post, null, 2), 'utf8');
console.log(`Saved: posts/${post.slug}.json`);

// ── Prepend to index.json ─────────────────────────────────────────────────────
const meta = {
  slug:          post.slug,
  title:         post.title,
  date:          post.date,
  excerpt:       post.excerpt,
  tags:          post.tags || [],
  tool_featured: post.tool_featured || null,
};
index.unshift(meta);
writeFileSync(indexPath, JSON.stringify(index, null, 2), 'utf8');
console.log(`Updated posts/index.json. Total posts: ${index.length}`);

// ── Update sitemap.xml ────────────────────────────────────────────────────────
const sitemapPath = path.join(ROOT, 'sitemap.xml');
let xml = readFileSync(sitemapPath, 'utf8');
const sitemapEntry =
  `  <url>\n` +
  `    <loc>https://khanai-daily.vercel.app/post.html?slug=${post.slug}</loc>\n` +
  `    <lastmod>${post.date}</lastmod>\n` +
  `    <changefreq>never</changefreq>\n` +
  `    <priority>0.7</priority>\n` +
  `  </url>`;

// Only add if this slug isn't already in the sitemap
if (!xml.includes(post.slug)) {
  xml = xml.replace('</urlset>', sitemapEntry + '\n</urlset>');
  writeFileSync(sitemapPath, xml, 'utf8');
  console.log('Updated sitemap.xml.');
} else {
  console.log('Sitemap already contains this slug — skipped.');
}

console.log('Done! ✓');
