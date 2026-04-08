// ─────────────────────────────────────────────────────────────────────────────
// server/index.js  —  The Brain
//
// This Express server does three things:
//   1. Validates the secret token on every request (security)
//   2. Proxies chat messages to Azure OpenAI (conversation)
//   3. When the user types DRAW, generates the coat of arms image
//   4. Serves the built React frontend in production
//
// WHY a server at all? Because Azure API keys must NEVER be in the browser.
// Anyone could open DevTools and steal your keys. The server is the only one
// who knows the keys — the browser just talks to THIS server.
// ─────────────────────────────────────────────────────────────────────────────

const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const app = express();
app.use(express.json());
app.use(cors());

// ─────────────────────────────────────────────────────────────────────────────
// THE SYSTEM PROMPT
//
// This is the AI's "soul" — it tells Azure OpenAI WHO it is and HOW to behave.
// It lives here on the server and is never exposed to the browser.
// We send it as the first "system" message on every API call.
// ─────────────────────────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `You are the Guided Heraldic Design Assistant — Career Coat of Arms Creator.
Your purpose is to help students build a personalized Career Coat of Arms through a structured 8-step interview.
Tone: Dignified, supportive, and structured.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PHASE RULES (STRICT — DO NOT SKIP)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

PHASE 1 — THE INTERVIEW (Questions 1–8)
You are a TEXT-ONLY assistant during this phase.
Do NOT generate any images.
Ask ONLY ONE question at a time.
Wait for the user's full response before continuing.
Do NOT preview upcoming questions.
Do NOT summarize mid-interview. Go straight from one question to the next.

PHASE 2 — THE SUMMARY
After Question 8, present the final summary and instruct the user to type DRAW.

PHASE 3 — THE TRIGGER
When the user types the exact word DRAW, respond with ONLY this text:
"Creating your Career Coat of Arms now... ✨"
Nothing else. The system will handle the image automatically.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
THE INTERVIEW FLOW
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Q1 — Personality:
"Step 1 of 8: Write five positive words that describe you."

Q2 — Family:
"Step 2 of 8: Briefly describe your family."

Q3 — Hobbies & Interests:
"Step 3 of 8: List or describe three of your hobbies or interests."

Q4 — Work Experience:
"Step 4 of 8: List or describe three of your previous jobs or self-employment projects."

Q5 — Accomplishments:
"Step 5 of 8: List or describe three of your accomplishments."

Q6 — Education:
"Step 6 of 8: List or describe your educational achievements."

Q7 — The Banner:
"Step 7 of 8: List some of your core values. These will be inscribed on the banner at the base of your crest."

Q8 — Aesthetic Taste:
"Step 8 of 8 — The Final Step: What is your preferred art style or aesthetic? (For example: Traditional Medieval, Modern Minimalist, Cyberpunk, Elegant Watercolor, Dark Fantasy, Stained Glass, Neoclassical, etc.)"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
AFTER QUESTION 8 — THE SUMMARY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Present the final summary using this exact format:
"Your Career Coat of Arms is ready to be created. Here is your complete identity:

Section 1 — Personality: [Q1 answer]
Section 2 — Family: [Q2 answer]
Section 3 — Hobbies & Interests: [Q3 answer]
Section 4 — Work Experience: [Q4 answer]
Section 5 — Accomplishments: [Q5 answer]
Section 6 — Education: [Q6 answer]
Banner Values: [Q7 answer]
Artistic Style: [Q8 answer]"

Then say exactly:
"Your professional identity is ready to become art. To generate your Career Coat of Arms in your chosen style, please type the word: DRAW"

Then wait. Do nothing until the user types DRAW.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
REVISION RULE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
If the user wants changes after seeing the image:
Ask which section, the banner, or the aesthetic style they want adjusted.
Update only that element.
Do NOT restart the entire process unless explicitly instructed.`;

// ─────────────────────────────────────────────────────────────────────────────
// TOKEN VALIDATION MIDDLEWARE
//
// Every API request must include the secret token in the header.
// The frontend reads the token from the URL (?token=...) and sends it here.
// If the token doesn't match what's in our .env, we reject the request.
// ─────────────────────────────────────────────────────────────────────────────
function validateToken(req, res, next) {
  const token = req.headers['x-access-token'];
  if (!token || token !== process.env.ACCESS_TOKEN) {
    return res.status(401).json({ error: 'Invalid or missing access token.' });
  }
  next();
}

// ─────────────────────────────────────────────────────────────────────────────
// ROUTE: GET /api/validate-token
//
// The frontend calls this once on load to check if the token in the URL is valid.
// If this returns 200, show the chat. If 401, show "Access Denied".
// ─────────────────────────────────────────────────────────────────────────────
app.get('/api/validate-token', validateToken, (req, res) => {
  res.json({ valid: true });
});

// ─────────────────────────────────────────────────────────────────────────────
// ROUTE: POST /api/chat
//
// The main conversation endpoint. The frontend sends:
//   - messages: the conversation history so far [{role, content}, ...]
//   - userMessage: the new message the user just typed
//
// We add the system prompt + history + new message and send it to Azure.
// If the user typed DRAW, we also generate the image.
// ─────────────────────────────────────────────────────────────────────────────
app.post('/api/chat', validateToken, async (req, res) => {
  try {
    const { messages, userMessage } = req.body;

    // Detect if the user typed DRAW (case-insensitive, trim whitespace)
    const isDrawCommand = userMessage.trim().toUpperCase() === 'DRAW';

    // Build the full message array for Azure OpenAI:
    // [system prompt] + [conversation history] + [new user message]
    const fullMessages = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...messages,
      { role: 'user', content: userMessage },
    ]
    // Call Azure OpenAI for the chat response
    const chatText = await callGeminiChat(fullMessages);

    if (isDrawCommand) {
      // User typed DRAW — generate the image too
      // Step 1: Ask AI to extract all 8 answers from the conversation as JSON
      // Step 2: Build the image prompt from those answers
      // Step 3: Call the image generation API
      const imagePrompt = await buildImagePromptFromConversation(messages);
      const imageUrl = await generateImage(imagePrompt);
      return res.json({ message: chatText, imageUrl });
    }

    // Normal conversation — just return the text
    res.json({ message: chatText });

  } catch (error) {
    console.error('Chat error:', error.message);
    res.status(500).json({
      error: 'The scribe encountered an error. Please try again.',
    });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// HELPER: callGeminiChat(messages)
//
// Sends a messages array to Azure OpenAI chat completions.
// Returns the AI's text response as a string.
// ─────────────────────────────────────────────────────────────────────────────
async function callGeminiChat(messages) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`;

  const contents = messages
    .filter(msg => msg.role !== 'system')
    .map(msg => ({
      role: msg.role === 'assistant' ? 'model' : msg.role,
      parts: [{ text: msg.content }]
    }))
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: messages.find(m => m.role === 'system')?.content || '' }] },
      contents,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini Chat API error ${response.status}: ${errorText}`);
  }

  const data = await response.json();
  return data.candidates[0].content.parts[0].text;
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPER: buildImagePromptFromConversation(conversationHistory)
//
// When DRAW is triggered, we need to build a detailed image prompt.
// We do this by asking Azure OpenAI to extract all 8 answers as JSON,
// then we fill them into the coat of arms prompt template.
// ─────────────────────────────────────────────────────────────────────────────
async function buildImagePromptFromConversation(conversationHistory) {
  // Ask the AI to extract the 8 interview answers from the conversation
  const extractionMessages = [
    {
      role: 'system',
      content: `You are a data extractor. Based on the conversation provided, extract the 8 coat of arms interview answers.
Return ONLY a valid JSON object with exactly these keys (no other text, no markdown, just raw JSON):
{
  "personality": "...",
  "family": "...",
  "hobbies": "...",
  "workExperience": "...",
  "accomplishments": "...",
  "education": "...",
  "values": "...",
  "artStyle": "..."
}`,
    },
    ...conversationHistory,
    {
      role: 'user',
      content: 'Extract the 8 interview answers from this conversation as JSON.',
    },
  ];

  const jsonText = await callGeminiChat(extractionMessages);

  // The AI sometimes wraps JSON in markdown code blocks — strip that out
  const clean = jsonText
    .replace(/```json\s*/gi, '')
    .replace(/```\s*/g, '')
    .trim();

  let answers;
  try {
    answers = JSON.parse(clean);
  } catch {
    // If JSON parsing fails, use a fallback prompt
    console.warn('Could not parse extracted answers, using fallback prompt');
    answers = {
      personality: 'creative, determined, and passionate professional',
      family: 'a close-knit and supportive family',
      hobbies: 'learning, creating, and exploring',
      workExperience: 'diverse professional experience',
      accomplishments: 'notable achievements and milestones',
      education: 'academic achievement and lifelong learning',
      values: 'Integrity, Growth, Excellence',
      artStyle: 'Traditional Medieval',
    };
  }

  const symbolMessages = [
    {
      role: 'system',
      content: ` You are a heraldic visual designer and return ONLY valid JSON with these keys, no markdown: {
      "personality": "...",
      "family": "...",
      "hobbies": "...",
      "workExperience": "...",
      "accomplishments": "...",
      "education": "..."  
      }
        Rule 1 - Be specific per section
        personality = who the person IS as a human being
        family = their family situation and story
        hobbies = what they do for fun
        workExperience = their professional background
        accomplishments = their proudest and joyful moments
        education = their academic journey
        
        Rule 2 - Stay personal use their words
        Use the person's exact words as your inspiration. The description must reflect THEIR specific story, not a generic symbol.
        
        Rule 3 - Describe a scene not a symbol
        A specific visual scene or object that someone looking at it would immediately connect to what the person described.

        Rule 4 — No text, letters, numbers
        Never include text, letters, numbers, code, or written words in your descriptions

        Rule 5 — No generic heraldic symbols
        Avoid generic symbols like chains, compasses, scrolls, or shields unless they are directly meaningful to the person's answer.

        Rule 6 — Each section must be different
        Each of the 6 descriptions must be visually distinct from each other. No repeated imagery across sections.
        `
        ,
    },
    {
      role: 'user',
      content: `Convert these into visual symbols:
  personality (draw a scene that shows a person embodying these character traits in action): ${answers.personality}
  family (draw a warm scene showing the family's bond, cultural roots, and shared story): ${answers.family}
  hobbies (draw a vivid scene showing someone actively doing these activities): ${answers.hobbies}
  workExperience (draw a scene representing the professional world and skills from these jobs): ${answers.workExperience}
  accomplishments (draw a moment of victory, pride, or achievement based on these accomplishments): ${answers.accomplishments}
  education (draw a scene representing academic growth, learning, and knowledge from this journey): ${answers.education}`,
    },
  ];

  const symbolJson = await callGeminiChat(symbolMessages);
  const cleanSymbols = symbolJson.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
  try {
    const symbols = JSON.parse(cleanSymbols);
    answers.personality = symbols.personality;
    answers.family = symbols.family;
    answers.hobbies = symbols.hobbies;
    answers.workExperience = symbols.workExperience;
    answers.accomplishments = symbols.accomplishments;
    answers.education = symbols.education;
  } catch {
    console.warn('Could not parse symbols, using raw answers');
  }

  // Build the final image generation prompt using the template from the system
  return `A beautiful, highly detailed Coat of Arms and decorative crest designed strictly in a ${answers.artStyle} art style. The overall mood, textures, colors, and linework should perfectly reflect this ${answers.artStyle} aesthetic. The crest shield is divided into six distinct sections: Section 1 (top-left): A symbol representing ${answers.personality}. Section 2 (top-right): A symbol representing ${answers.family}. Section 3 (middle-left): A symbol representing ${answers.hobbies}. Section 4 (middle-right): A symbol representing ${answers.workExperience}. Section 5 (bottom-left): A symbol representing ${answers.accomplishments}. Section 6 (bottom-right): A symbol representing ${answers.education}. At the base of the crest, an elegant ribbon banner containing the text: '${answers.values}'. The entire composition must be cohesive, treating the six elements so they harmoniously blend into the chosen ${answers.artStyle} aesthetic rather than looking like separate icons. Centered composition on a complementary background. Do not include any text, words, or labels anywhere in the image.`;
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPER: generateImage(prompt)
//
// Calls your Azure gpt-image-1.5 endpoint with the coat of arms prompt.
// Returns either a URL or a base64 data URL (handles both formats).
// ─────────────────────────────────────────────────────────────────────────────
async function generateImage(prompt) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${process.env.GEMINI_API_KEY}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { responseModalities: ["TEXT", "IMAGE"]}
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Google API error ${response.status}: ${errorText}`);
  }

  const data = await response.json();
  const parts = data.candidates[0].content.parts;
  const imagePart = parts.find(p => p.inlineData);
  return `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`
}

// ─────────────────────────────────────────────────────────────────────────────
// SERVE THE FRONTEND
//
// In production (Docker/Azure), Express serves the built React files.
// In development, Vite's dev server handles the frontend (port 5173).
// ─────────────────────────────────────────────────────────────────────────────
const clientDist = path.join(__dirname, '../client/dist');
app.use(express.static(clientDist));

// Any route not matching /api/* sends back index.html
// (React Router handles client-side routing)
app.get('*', (req, res) => {
  res.sendFile(path.join(clientDist, 'index.html'));
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Shield raised. Server running on port ${PORT}`);
  console.log(`Access token: ${process.env.ACCESS_TOKEN ? 'SET' : 'NOT SET — check your .env'}`);
});
