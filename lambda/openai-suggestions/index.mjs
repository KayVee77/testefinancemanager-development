// Lambda function for OpenAI Budget Suggestions
// Environment variable: OPENAI_API_KEY

import https from 'https';

// System prompts for AI (bilingual)
const SYSTEM_PROMPTS = {
  lt: `Tu esi trumpas ir konkretus asmeninio biudžeto AI asistentas.
Tavo stilius:
- Trumpas ir aiškus - TIKTAI 3-5 patarimai
- Kiekvienas patarimas 1-2 sakiniai, max 35-40 žodžių
- Pradėk KIEKVIENĄ patarimą skaičiumi: "1. ", "2. ", "3. ", etc.
- Naudok 1 emoji pradžioje kiekvieno patarimo
- Šnekamoji, draugiška lietuvių kalba
- BE įvado ar išvadų - TIK sąrašas`,

  en: `You are a brief and concrete personal budget AI assistant.
Your style:
- Short and clear - ONLY 3-5 suggestions
- Each suggestion 1-2 sentences, max 35-40 words
- Start EACH suggestion with number: "1. ", "2. ", "3. ", etc.
- Use 1 emoji at start of each suggestion
- Conversational, friendly English
- NO intro or conclusions - JUST the list`
};

// Call OpenAI API
async function callOpenAI(messages, maxTokens = 350) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      model: 'gpt-4o-mini',
      messages,
      temperature: 0.7,
      max_tokens: maxTokens,
      frequency_penalty: 0.5,
      presence_penalty: 0.4
    });

    const options = {
      hostname: 'api.openai.com',
      port: 443,
      path: '/v1/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Length': Buffer.byteLength(data)
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          resolve(JSON.parse(body));
        } else {
          reject(new Error(`OpenAI API error: ${res.statusCode} - ${body}`));
        }
      });
    });

    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

// Parse suggestions from AI response
function parseSuggestions(content) {
  const lines = content.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  const suggestions = [];
  
  for (const line of lines) {
    if (line.match(/^(\d+[.)]|\d+️⃣)\s*/)) {
      const suggestion = line.replace(/^(\d+[.)]|\d+️⃣)\s*/, '').trim();
      if (suggestion.length > 15) suggestions.push(suggestion);
    } else if (line.match(/^[\p{Emoji}]\s+/u)) {
      if (line.length > 15) suggestions.push(line.trim());
    }
  }
  
  return suggestions.length > 0 ? suggestions : [content.trim()];
}

// Build user prompt from summary
function buildUserPrompt(summary, language) {
  const { totalIncome, totalExpenses, savingsOrDeficit, expenseCategories } = summary;
  const savingsRate = totalIncome > 0 ? (savingsOrDeficit / totalIncome * 100) : 0;
  
  const categoriesText = (expenseCategories || [])
    .slice(0, 3)
    .map(cat => `${cat.name}: €${cat.amount.toFixed(0)} (${(cat.shareOfExpenses * 100).toFixed(0)}%)`)
    .join(', ');

  if (language === 'en') {
    return `User financial summary:
Income: €${totalIncome.toFixed(2)}
Expenses: €${totalExpenses.toFixed(2)}
Balance: ${savingsOrDeficit >= 0 ? '+' : ''}€${savingsOrDeficit.toFixed(2)}
Savings rate: ${savingsRate.toFixed(1)}%
Top categories: ${categoriesText}

Generate EXACTLY 3-5 short, actionable suggestions.`;
  }

  return `Vartotojo finansinė suvestinė:
Pajamos: €${totalIncome.toFixed(2)}
Išlaidos: €${totalExpenses.toFixed(2)}
Balansas: ${savingsOrDeficit >= 0 ? '+' : ''}€${savingsOrDeficit.toFixed(2)}
Taupymo rodiklis: ${savingsRate.toFixed(1)}%
Pagrindinės kategorijos: ${categoriesText}

Sugeneruok TIKSLIAI 3-5 trumpus, praktiškus patarimus.`;
}

// Main handler
export const handler = async (event) => {
  // CORS headers
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Access-Control-Allow-Methods': 'POST,OPTIONS'
  };

  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const path = event.path || event.rawPath || '';

    // Route: POST /ai/suggestions
    if (path.includes('/suggestions')) {
      const { summary, language = 'lt' } = body;
      
      if (!summary || !summary.totalIncome) {
        return {
          statusCode: 422,
          headers,
          body: JSON.stringify({ code: 'NOT_ENOUGH_DATA', message: 'Nepakanka duomenų analizei.' })
        };
      }

      const systemPrompt = SYSTEM_PROMPTS[language] || SYSTEM_PROMPTS.lt;
      const userPrompt = buildUserPrompt(summary, language);

      const response = await callOpenAI([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ]);

      const content = response.choices[0]?.message?.content || '';
      const suggestions = parseSuggestions(content);

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ suggestions, usage: response.usage })
      };
    }

    // Route: POST /ai/follow-up
    if (path.includes('/follow-up')) {
      const { followUpType, originalSummary, initialSuggestions, language = 'lt' } = body;
      
      if (!followUpType || !originalSummary) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Missing followUpType or originalSummary' })
        };
      }

      // Simplified follow-up prompt
      const isLT = language === 'lt';
      const suggestionsContext = (initialSuggestions || []).slice(0, 5).map((s, i) => `${i + 1}. ${s}`).join('\n');
      
      let userPrompt = isLT
        ? `Ankstesni patarimai:\n${suggestionsContext}\n\nDuok papildomų patarimų apie: ${followUpType}`
        : `Previous suggestions:\n${suggestionsContext}\n\nGive additional advice about: ${followUpType}`;

      const response = await callOpenAI([
        { role: 'system', content: SYSTEM_PROMPTS[language] || SYSTEM_PROMPTS.lt },
        { role: 'user', content: userPrompt }
      ], 250);

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ response: response.choices[0]?.message?.content || '', usage: response.usage })
      };
    }

    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({ error: 'Not found' })
    };

  } catch (error) {
    console.error('Lambda error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error', message: error.message })
    };
  }
};
