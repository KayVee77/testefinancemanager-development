import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import OpenAI from 'openai';

// Load environment variables
dotenv.config();

// Validate OpenAI API key
if (!process.env.OPENAI_API_KEY) {
  console.error('❌ ERROR: OPENAI_API_KEY is not set in .env file');
  console.error('   Please copy .env.example to .env and add your OpenAI API key');
  process.exit(1);
}

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// System prompts for AI financial coach (multilingual)
const SYSTEM_PROMPTS = {
  lt: `Tu esi draugiškas, šiuolaikiškas asmeninio biudžeto AI asistentas 🤖💰

Tavo stilius:
- 🎯 Energingas, pozityvus, motyvuojantis
- 💡 Naudok emoji punktuose (🎯 📊 💰 🚀 ⚡ 🌟 ✨ 💪 🔥 📈)
- 🗣️ Šnekamoji, draugiška lietuvių kalba
- 📋 Struktūruotas - naudok aiškius punktus su emoji

Tavo užduotys:
- Padaryk finansų analizę ĮDOMIĄ ir ĮKVEPIANT Ą
- Pasiūlyk KONKREČIUS veiksmus su skaičiais
- Pagirk tai, kas sekasi gerai! 🎉
- Pasiūlyk realistiškas optimizacijas
- Niekada neminėk asmeninių duomenų

Tu nesi licencijuotas finansų patarėjas - tai edukaciniai pasiūlymai. 📚`,

  en: `You are a friendly, modern personal budget AI assistant 🤖💰

Your style:
- 🎯 Energetic, positive, motivating
- 💡 Use emojis in bullet points (🎯 📊 💰 🚀 ⚡ 🌟 ✨ 💪 🔥 📈)
- 🗣️ Conversational, friendly English
- 📋 Well-structured - use clear points with emojis

Your tasks:
- Make financial analysis INTERESTING and INSPIRING
- Suggest SPECIFIC actions with numbers
- Praise what's going well! 🎉
- Suggest realistic optimizations
- Never mention personal data

You're not a licensed financial advisor - these are educational suggestions. 📚`
};

const SYSTEM_PROMPT = SYSTEM_PROMPTS.lt;  // Default (will be dynamic)

// Create Express app
const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    service: 'FinanceFlow Dev API',
    openai: !!process.env.OPENAI_API_KEY 
  });
});

// AI Suggestions endpoint
app.post('/api/ai/suggestions', async (req, res) => {
  try {
    const { summary, language = 'lt' } = req.body;

    // Validate request
    if (!summary) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Missing required field: summary'
      });
    }

    // Check if enough data
    if (!summary.totalIncome || !summary.totalExpenses) {
      return res.status(422).json({
        code: 'NOT_ENOUGH_DATA',
        message: 'Nepakanka duomenų analizei. Įveskite daugiau transakcijų.'
      });
    }

    console.log('📊 Generating AI suggestions...');
    console.log(`   Language: ${language}`);
    console.log(`   Period: ${summary.period.from} to ${summary.period.to}`);
    console.log(`   Income: €${summary.totalIncome.toFixed(2)}`);
    console.log(`   Expenses: €${summary.totalExpenses.toFixed(2)}`);
    console.log(`   Balance: €${summary.savingsOrDeficit.toFixed(2)}`);

    // Get system prompt for the selected language
    const systemPrompt = SYSTEM_PROMPTS[language] || SYSTEM_PROMPTS.lt;

    // Build user prompt
    const userPrompt = buildUserPrompt(summary, language);

    // Call OpenAI API
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',  // Using gpt-4o-mini (latest fast model)
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.8,  // Increased for more creative/fun responses
      max_tokens: 1000,  // Increased for more detailed responses
      top_p: 1,
      frequency_penalty: 0.3,  // Reduce repetition
      presence_penalty: 0.3,  // Encourage diverse topics
    });

    // Extract suggestions from response
    const content = response.choices[0]?.message?.content || '';
    const suggestions = parseSuggestions(content);

    console.log(`✅ Generated ${suggestions.length} suggestions`);
    
    // Log usage
    console.log(`💰 Tokens used: ${response.usage?.total_tokens || 0} (prompt: ${response.usage?.prompt_tokens || 0}, completion: ${response.usage?.completion_tokens || 0})`);

    // Return suggestions
    res.json({ 
      suggestions,
      usage: response.usage 
    });

  } catch (error) {
    console.error('❌ OpenAI API Error:', error);

    // Handle specific OpenAI errors
    if (error.status === 401) {
      return res.status(500).json({
        error: 'API Configuration Error',
        message: 'OpenAI API key is invalid. Please check your configuration.'
      });
    }

    if (error.status === 429) {
      return res.status(429).json({
        error: 'Rate Limit Exceeded',
        message: 'Pasiektas užklausų limitas. Pabandykite vėliau.'
      });
    }

    // Generic error
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Nepavyko sugeneruoti pasiūlymų. Bandykite dar kartą.'
    });
  }
});

/**
 * Build user prompt from budget summary
 */
function buildUserPrompt(summary, language) {
  const { period, currency, totalIncome, totalExpenses, savingsOrDeficit, expenseCategories } = summary;
  
  // Calculate additional insights
  const savingsRate = totalIncome > 0 ? (savingsOrDeficit / totalIncome * 100) : 0;
  const topCategory = expenseCategories[0];
  const topCategoryPercent = topCategory ? (topCategory.shareOfExpenses * 100).toFixed(1) : 0;
  
  // Format categories with more details
  const categoriesText = expenseCategories
    .slice(0, 6)  // Top 6 categories for better analysis
    .map((cat, index) => {
      const emoji = ['🍔', '🚗', '🎮', '🏥', '📱', '👕'][index] || '💰';
      return `  ${emoji} ${cat.name}: ${cat.amount.toFixed(2)}${currency} (${(cat.shareOfExpenses * 100).toFixed(1)}%)`;
    })
    .join('\n');

  if (language === 'en') {
    return `📊 FINANCIAL SNAPSHOT

Period: ${period.from} to ${period.to}
Currency: ${currency}

💰 INCOME & EXPENSES:
- Total income: €${totalIncome.toFixed(2)}
- Total expenses: €${totalExpenses.toFixed(2)}
- Net balance: ${savingsOrDeficit >= 0 ? '+' : ''}€${savingsOrDeficit.toFixed(2)} ${savingsOrDeficit >= 0 ? '✅ (saving!)' : '⚠️ (overspending)'}
- Savings rate: ${savingsRate.toFixed(1)}% ${savingsRate >= 20 ? '🌟 Great!' : savingsRate >= 10 ? '👍 Good' : '⚡ Needs improvement'}

📈 TOP SPENDING CATEGORIES:
${categoriesText}
${topCategory ? `\n🎯 Biggest category: ${topCategory.name} at ${topCategoryPercent}%` : ''}

🚀 YOUR MISSION:
Generate 5-7 AWESOME, ACTIONABLE tips to optimize this budget!

CRITICAL FORMAT RULES:
- Each tip MUST be on its OWN LINE
- Start EVERY line with: "- emoji" (dash, space, emoji, space, text)
- Example format:
  - 💡 First tip here
  - 🎯 Second tip here
  - 🔥 Third tip here

Content requirements:
- Be specific with numbers when possible
- Mix praise (what's good) with suggestions (what to improve)
- Make it FUN and MOTIVATING
- Keep each tip to 1-2 sentences max
- Use conversational English
- Use varied emojis: 💡 🎯 🔥 💪 ⚡ 🌟 ✨ 📊 💰 🚀 👍 🎉

REMEMBER: ONE TIP PER LINE with "- emoji" format!`;
  }

  return `📊 FINANSINĖ APŽVALGA

Laikotarpis: ${period.from} – ${period.to}
Valiuta: ${currency}

💰 PAJAMOS IR IŠLAIDOS:
- Pajamos: €${totalIncome.toFixed(2)}
- Išlaidos: €${totalExpenses.toFixed(2)}
- Balansas: ${savingsOrDeficit >= 0 ? '+' : ''}€${savingsOrDeficit.toFixed(2)} ${savingsOrDeficit >= 0 ? '✅ (taupai!)' : '⚠️ (perviršis)'}
- Taupymo rodiklis: ${savingsRate.toFixed(1)}% ${savingsRate >= 20 ? '🌟 Puiku!' : savingsRate >= 10 ? '👍 Gerai' : '⚡ Reikia tobulėti'}

📈 PAGRINDINĖS IŠLAIDŲ KATEGORIJOS:
${categoriesText}
${topCategory ? `\n🎯 Didžiausia kategorija: ${topCategory.name} - ${topCategoryPercent}%` : ''}

🚀 TAVO MISIJA:
Sugeneruok 5-7 NUOSTABIUS, PRAKTIŠKUS patarimus šiam biudžetui optimizuoti!

KRITINIAI FORMATO REIKALAVIMAI:
- Kiekvienas patarimas TURI būti ATSKIROJE EILUTĖJE
- Pradėk KIEKVIENĄ eilutę: "- emoji" (brūkšnys, tarpas, emoji, tarpas, tekstas)
- Pavyzdinis formatas:
  - 💡 Pirmas patarimas čia
  - 🎯 Antras patarimas čia
  - 🔥 Trečias patarimas čia

Turinio reikalavimai:
- Būk konkretus su skaičiais, kur įmanoma
- Sumaišyk pagyras (kas gerai) su pasiūlymais (ką gerinti)
- Padaryk TAI SMAGIAI ir MOTYVUOJANČIAI
- Kiekvienas patarimas 1-2 sakiniai max
- Naudok šnekamą lietuvių kalbą
- Naudok įvairius emoji: 💡 🎯 🔥 💪 ⚡ 🌟 ✨ 📊 💰 🚀 👍 🎉

ATMINK: VIENAS PATARIMAS VIENOJE EILUTĖJE su "- emoji" formatu!`;
}

/**
 * Parse AI response into array of suggestions
 */
function parseSuggestions(content) {
  // Split by newlines and filter for bullet points
  const lines = content.split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0);

  const suggestions = [];
  
  for (const line of lines) {
    // Check if line starts with a bullet point marker (with or without emoji)
    if (line.match(/^[-•*]\s*[\p{Emoji}]?\s*/u)) {
      // Remove the bullet marker and trim
      const suggestion = line.replace(/^[-•*]\s*/, '').trim();
      if (suggestion.length > 15) {  // Must be at least 15 chars for meaningful content
        suggestions.push(suggestion);
      }
    } 
    // Handle numbered lists like "1. Suggestion" or "1️⃣ Suggestion"
    else if (line.match(/^(\d+[.)]|\d+️⃣)\s*/)) {
      const suggestion = line.replace(/^(\d+[.)]|\d+️⃣)\s*/, '').trim();
      if (suggestion.length > 15) {
        suggestions.push(suggestion);
      }
    }
    // Handle emoji-only bullets like "💡 Suggestion"
    else if (line.match(/^[\p{Emoji}]\s+/u)) {
      const suggestion = line.trim();
      if (suggestion.length > 15) {
        suggestions.push(suggestion);
      }
    }
  }

  // If no bullet points found, try to split by emoji at the start of sentences
  if (suggestions.length === 0) {
    const emojiSplit = content.split(/(?=[\p{Emoji}]\s+)/u).filter(s => s.trim().length > 15);
    if (emojiSplit.length > 1) {
      return emojiSplit.map(s => s.trim());
    }
    
    // Last resort: return entire response as one suggestion
    if (content.trim().length > 0) {
      return [content.trim()];
    }
  }

  return suggestions;
}

// AI Follow-up endpoint (for interactive flashcards)
app.post('/api/ai/follow-up', async (req, res) => {
  try {
    const { followUpPrompt, originalSummary, initialSuggestions, language = 'lt' } = req.body;

    // Validate request
    if (!followUpPrompt || !originalSummary) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Missing required fields: followUpPrompt, originalSummary'
      });
    }

    console.log('🔄 Generating follow-up response...');
    console.log(`   Question: ${followUpPrompt.substring(0, 60)}...`);
    console.log(`   Language: ${language}`);

    // Get system prompt for the selected language
    const systemPrompt = SYSTEM_PROMPTS[language] || SYSTEM_PROMPTS.lt;

    // Build context-aware user prompt for follow-up
    const contextPrompt = buildFollowUpPrompt(
      followUpPrompt, 
      originalSummary, 
      initialSuggestions,
      language
    );

    // Call OpenAI API with conversation context
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: contextPrompt }
      ],
      temperature: 0.8,
      max_tokens: 800,  // Slightly shorter for follow-ups
      top_p: 1,
      frequency_penalty: 0.3,
      presence_penalty: 0.3,
    });

    const responseText = response.choices[0]?.message?.content || '';

    console.log(`✅ Generated follow-up response (${responseText.length} chars)`);
    console.log(`💰 Tokens used: ${response.usage?.total_tokens || 0}`);

    // Return follow-up response
    res.json({ 
      response: responseText.trim(),
      usage: response.usage 
    });

  } catch (error) {
    console.error('❌ OpenAI Follow-up Error:', error);

    if (error.status === 401) {
      return res.status(500).json({
        error: 'API Configuration Error',
        message: 'OpenAI API key is invalid.'
      });
    }

    if (error.status === 429) {
      return res.status(429).json({
        error: 'Rate Limit Exceeded',
        message: 'Pasiektas užklausų limitas. Pabandykite vėliau.'
      });
    }

    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Nepavyko sugeneruoti atsakymo. Bandykite dar kartą.'
    });
  }
});

/**
 * Build follow-up prompt with conversation context
 */
function buildFollowUpPrompt(followUpQuestion, originalSummary, initialSuggestions, language) {
  const { totalIncome, totalExpenses, savingsOrDeficit } = originalSummary;
  
  // Format initial suggestions as context (first 5 only to save tokens)
  const suggestionsContext = (initialSuggestions || [])
    .slice(0, 5)
    .map((s, i) => `${i + 1}. ${s}`)
    .join('\n');

  if (language === 'en') {
    return `CONTEXT FROM PREVIOUS ANALYSIS:

💰 Financial Summary:
- Income: €${totalIncome.toFixed(2)}
- Expenses: €${totalExpenses.toFixed(2)}
- Balance: ${savingsOrDeficit >= 0 ? '+' : ''}€${savingsOrDeficit.toFixed(2)}

Previous suggestions:
${suggestionsContext}

---

USER'S FOLLOW-UP QUESTION:
${followUpQuestion}

RESPONSE GUIDELINES:
- Answer specifically and practically
- Keep it concise (3-5 paragraphs max)
- Use conversational English
- Add emoji for engagement (but not too many)
- Be motivating and supportive
- Give actionable steps when relevant`;
  }

  return `KONTEKSTAS IŠ ANKSTESNĖS ANALIZĖS:

💰 Finansinė suvestinė:
- Pajamos: €${totalIncome.toFixed(2)}
- Išlaidos: €${totalExpenses.toFixed(2)}
- Balansas: ${savingsOrDeficit >= 0 ? '+' : ''}€${savingsOrDeficit.toFixed(2)}

Ankstesni pasiūlymai:
${suggestionsContext}

---

VARTOTOJO KLAUSIMAS:
${followUpQuestion}

ATSAKYMO GAIRĖS:
- Atsakyk konkrečiai ir praktiškai
- Laikykis trumpumo (3-5 pastraipos max)
- Naudok šnekamą lietuvių kalbą
- Pridėk emoji įtraukai (bet ne per daug)
- Būk motyvuojantis ir palaikantis
- Duok konkrečius veiksmus, kur tinka`;
}

// Start server
app.listen(PORT, () => {
  console.log('');
  console.log('🚀 FinanceFlow Dev API Server');
  console.log(`📡 Listening on http://localhost:${PORT}`);
  console.log(`🤖 OpenAI: ${process.env.OPENAI_API_KEY ? '✅ Configured' : '❌ Not configured'}`);
  console.log('');
  console.log('Available endpoints:');
  console.log(`   GET  http://localhost:${PORT}/health`);
  console.log(`   POST http://localhost:${PORT}/api/ai/suggestions`);
  console.log(`   POST http://localhost:${PORT}/api/ai/follow-up`);
  console.log('');
  console.log('Press Ctrl+C to stop');
  console.log('');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('Shutting down gracefully...');
  process.exit(0);
});
