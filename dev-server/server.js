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

// System prompt for AI financial coach
// const SYSTEM_PROMPT = `Tu esi draugiškas asmeninio biudžeto patarėjas. Gauni apibendrintus anonimizuotus duomenis apie asmens pajamas, išlaidas ir išlaidų kategorijas.

// Tavo užduotys:
// - Paaiškink finansinę situaciją aiškiai ir paprastai
// - Pasiūlyk realistiškas biudžeto optimizavimo galimybes
// - Sutelk dėmesį į mažus, praktiškus žingsnius, ne drastiškus gyvenimo būdo pakeitimus
// - NIEKADA neprašyk ir nedaryk prielaidų apie asmeninius duomenis (vardus, darbdavius, adresus, bankų pavadinimus, sąskaitų numerius)
// - Tu nesi licencijuotas finansų patarėjas - tai tik bendro pobūdžio edukaciniai pasiūlymai

// Visada atsakyk LIETUVIŲ kalba, naudodamas aiškią, šnekamąją kalbą, kurią suprastų bet kuris žmogus.`;

const SYSTEM_PROMPT = `kas turi didziausia bybi europoje?`;

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
    console.log(`   Period: ${summary.period.from} to ${summary.period.to}`);
    console.log(`   Income: €${summary.totalIncome.toFixed(2)}`);
    console.log(`   Expenses: €${summary.totalExpenses.toFixed(2)}`);
    console.log(`   Balance: €${summary.savingsOrDeficit.toFixed(2)}`);

    // Build user prompt
    const userPrompt = buildUserPrompt(summary, language);

    // Call OpenAI API
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',  // Using gpt-4o-mini (latest fast model)
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.7,
      max_tokens: 800,
      top_p: 1,
      frequency_penalty: 0,
      presence_penalty: 0,
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
  
  const categoriesText = expenseCategories
    .slice(0, 5)  // Top 5 categories
    .map(cat => `  - ${cat.name}: ${cat.amount.toFixed(2)}${currency} (${(cat.shareOfExpenses * 100).toFixed(1)}%)`)
    .join('\n');

  if (language === 'en') {
    return `Period: ${period.from} to ${period.to}
Currency: ${currency}
Total income: ${totalIncome.toFixed(2)}
Total expenses: ${totalExpenses.toFixed(2)}
Savings / deficit: ${savingsOrDeficit.toFixed(2)} ${savingsOrDeficit >= 0 ? '(savings)' : '(overspending)'}

Top expense categories:
${categoriesText}

Based on this data:
- Assess whether expenses are balanced across categories
- Provide 4-6 specific suggestions on how the person could:
  * Reduce non-essential expenses
  * Realistically save more money
  * Set a simple savings goal for next month
- Answer in bullet points (list format), without long introduction or conclusion
- Each suggestion should start with a dash (-)`;
  }

  return `Laikotarpis: ${period.from} – ${period.to}
Valiuta: ${currency}
Pajamos: ${totalIncome.toFixed(2)}
Išlaidos: ${totalExpenses.toFixed(2)}
Balansas: ${savingsOrDeficit.toFixed(2)} ${savingsOrDeficit >= 0 ? '(taupymas)' : '(perviršis)'}

Pagrindinės išlaidų kategorijos:
${categoriesText}

Pagal šiuos duomenis:
- Įvertink, ar išlaidos yra subalansuotos pagal kategorijas
- Nurodyk 4-6 konkrečius pasiūlymus, kaip žmogus galėtų:
  * Sumažinti nebūtinas išlaidas
  * Realistiškai sutaupyti daugiau pinigų
  * Pasirinkti paprastą taupymo tikslą kitam mėnesiui
- Atsakyk punktais (sąrašu), be ilgos įžangos ar pabaigos
- Kiekvienas pasiūlymas turi prasidėti brūkšniu (-)`;
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
    // Check if line starts with a bullet point marker
    if (line.startsWith('-') || line.startsWith('•') || line.startsWith('*')) {
      // Remove the marker and trim
      const suggestion = line.substring(1).trim();
      if (suggestion.length > 10) {  // Must be at least 10 chars
        suggestions.push(suggestion);
      }
    } else if (line.match(/^\d+\./)) {
      // Handle numbered lists like "1. Suggestion"
      const suggestion = line.replace(/^\d+\./, '').trim();
      if (suggestion.length > 10) {
        suggestions.push(suggestion);
      }
    }
  }

  // If no bullet points found, return entire response as one suggestion
  if (suggestions.length === 0 && content.trim().length > 0) {
    return [content.trim()];
  }

  return suggestions;
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
  console.log('');
  console.log('Press Ctrl+C to stop');
  console.log('');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('Shutting down gracefully...');
  process.exit(0);
});
