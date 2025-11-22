import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import OpenAI from 'openai';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, QueryCommand, UpdateCommand, DeleteCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';

// Load environment variables
dotenv.config();

// Initialize DynamoDB Client (connects to DynamoDB Local in Docker)
const dynamoClient = new DynamoDBClient({
  endpoint: process.env.DYNAMODB_ENDPOINT || 'http://dynamodb-local:8000',
  region: process.env.AWS_REGION || 'eu-north-1',
  credentials: {
    accessKeyId: 'local',
    secretAccessKey: 'local'
  }
});

const docClient = DynamoDBDocumentClient.from(dynamoClient);

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
// Optimized for concise, demo-friendly responses
const SYSTEM_PROMPTS = {
  lt: `Tu esi trumpas ir konkretus asmeninio biudžeto AI asistentas.

Tavo stilius:
- Trumpas ir aiškus - TIKTAI 3-5 patarimai
- Kiekvienas patarimas 1-2 sakiniai, max 35-40 žodžių
- Pradėk KIEKVIENĄ patarimą skaičiumi: "1. ", "2. ", "3. ", etc.
- Naudok 1 emoji pradžioje kiekvieno patarimo
- Šnekamoji, draugiška lietuvių kalba
- BE įvado ar išvadų - TIK sąrašas

Tavo užduotys:
- Sugeneruok TIKTAI 3-5 konkrečius patarimus
- Naudok tikrus skaičius (€, %, kategorijos)
- Vienas patarimas = viena problema arba siūlymas
- NIEKADA nekartok tos pačios idėjos
- FORMATAS: Tik sunumeruotas sąrašas, jokių kitų paragrafų

Pavyzdys:
1. 💰 Pirmas patarimas čia (1-2 sakiniai su konkrečiais skaičiais)
2. 🎯 Antras patarimas čia (kita tema, ne kartoti)
3. 🔥 Trečias patarimas čia (vėl unikali idėja)`,

  en: `You are a brief and concrete personal budget AI assistant.

Your style:
- Short and clear - ONLY 3-5 suggestions
- Each suggestion 1-2 sentences, max 35-40 words
- Start EACH suggestion with number: "1. ", "2. ", "3. ", etc.
- Use 1 emoji at start of each suggestion
- Conversational, friendly English
- NO intro or conclusions - JUST the list

Your tasks:
- Generate ONLY 3-5 concrete suggestions
- Use real numbers (€, %, categories)
- One suggestion = one problem or tip
- NEVER repeat the same idea
- FORMAT: Only numbered list, no other paragraphs

Example:
1. 💰 First tip here (1-2 sentences with specific numbers)
2. 🎯 Second tip here (different topic, don't repeat)
3. 🔥 Third tip here (unique idea again)`
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
      temperature: 0.7,  // Balanced for consistent, focused responses
      max_tokens: 350,  // Reduced for brevity (3-5 short suggestions)
      top_p: 1,
      frequency_penalty: 0.5,  // Higher to reduce repetition
      presence_penalty: 0.4,  // Encourage diverse topics
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
  
  // Format top 3 categories only (reduced for brevity)
  const categoriesText = expenseCategories
    .slice(0, 3)
    .map((cat) => `${cat.name}: €${cat.amount.toFixed(0)} (${(cat.shareOfExpenses * 100).toFixed(0)}%)`)
    .join(', ');

  if (language === 'en') {
    return `User financial summary:

Income: €${totalIncome.toFixed(2)}
Expenses: €${totalExpenses.toFixed(2)}
Balance: ${savingsOrDeficit >= 0 ? '+' : ''}€${savingsOrDeficit.toFixed(2)}
Savings rate: ${savingsRate.toFixed(1)}%
Top categories: ${categoriesText}

Generate EXACTLY 3-5 short, actionable suggestions in numbered format:
1. emoji Suggestion (1-2 sentences max, 35-40 words)
2. emoji Suggestion (different topic)
3. emoji Suggestion (another unique tip)

Use real numbers from data. Be specific and practical.`;
  }

  return `Vartotojo finansinė suvestinė:

Pajamos: €${totalIncome.toFixed(2)}
Išlaidos: €${totalExpenses.toFixed(2)}
Balansas: ${savingsOrDeficit >= 0 ? '+' : ''}€${savingsOrDeficit.toFixed(2)}
Taupymo rodiklis: ${savingsRate.toFixed(1)}%
Pagrindinės kategorijos: ${categoriesText}

Sugeneruok TIKSLIAI 3-5 trumpus, praktiškus patarimus sunumeruotame sąraše:
1. emoji Patarimas (1-2 sakiniai max, 35-40 žodžių)
2. emoji Patarimas (kita tema)
3. emoji Patarimas (dar vienas unikalus patarimas)

Naudok tikrus skaičius iš duomenų. Būk konkretus ir praktiškas.`;
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
    const { followUpType, originalSummary, initialSuggestions, language = 'lt' } = req.body;

    // Validate request
    if (!followUpType || !originalSummary) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Missing required fields: followUpType, originalSummary'
      });
    }

    // Validate followUpType
    const validTypes = ['DETAIL', 'EXAMPLE', 'CHALLENGE', 'QUICK_ACTIONS'];
    if (!validTypes.includes(followUpType)) {
      return res.status(400).json({
        error: 'Bad Request',
        message: `Invalid followUpType. Must be one of: ${validTypes.join(', ')}`
      });
    }

    console.log(`🔄 Generating ${followUpType} follow-up response...`);
    console.log(`   Language: ${language}`);

    // Build mode-specific prompt
    const { systemPrompt, userPrompt } = buildFollowUpPrompt(
      followUpType,
      originalSummary, 
      initialSuggestions,
      language
    );

    // Call OpenAI API with mode-specific settings
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.7,
      max_tokens: 250,  // Reduced for brevity
      top_p: 1,
      frequency_penalty: 0.4,
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
 * Build follow-up prompt with mode-specific instructions
 * Returns { systemPrompt, userPrompt } for the specified mode
 */
function buildFollowUpPrompt(followUpType, originalSummary, initialSuggestions, language) {
  const { totalIncome, totalExpenses, savingsOrDeficit, expenseCategories } = originalSummary;
  
  // Format initial suggestions as context (first 5 only)
  const suggestionsContext = (initialSuggestions || [])
    .slice(0, 5)
    .map((s, i) => `${i + 1}. ${s}`)
    .join('\n');

  const isLT = language === 'lt';
  
  // Build style instruction for the language
  const styleInstruction = isLT
    ? 'Naudok šnekamą lietuvių kalbą. Būk konkretus, motyvuojantis ir praktiškas.'
    : 'Use conversational English. Be specific, motivating and practical.';

  let systemPrompt = '';
  let userPrompt = '';

  // Mode-specific prompts
  if (followUpType === 'DETAIL') {
    // Explain previous suggestions in more depth
    systemPrompt = isLT
      ? `Tu tęsi trumpą finansinę coaching sesiją.

${styleInstruction}

Taisyklės:
- Paaiškink ankstesnius pasiūlymus šiek tiek išsamiau
- Grąžink daugiausiai 4 trumpus punktus
- Kiekvienas punktas aprašo KODĖL pasiūlymas svarbus ir KAIP pradėti (1-2 sakiniai)
- Nekartok pradinio sąrašo žodis į žodį
- Max 150 žodžių iš viso`
      : `You are continuing a short financial coaching session.

${styleInstruction}

Rules:
- Explain the previous suggestions in a bit more depth
- Return at most 4 short bullet points
- Each bullet describes WHY a suggestion matters and HOW to start (1-2 sentences)
- Do not restate the original list word-for-word
- Max 150 words total`;

    userPrompt = isLT
      ? `Čia yra trumpi pasiūlymai, kuriuos jau davėi:

${suggestionsContext}

Paaiškink pagrindines idėjas šiek tiek giliau, bet išlaikyk trumpą ir lengvai skaitomą formatą (per 30 sekundžių perskaitoma).`
      : `Here are the short suggestions you already gave:

${suggestionsContext}

Explain the main ideas a bit deeper, but keep it concise and easy to read in under 30 seconds.`;

  } else if (followUpType === 'EXAMPLE') {
    // Give one concrete example scenario
    systemPrompt = isLT
      ? `Tu esi finansinis treneris, teikiantis vieną konkretų pavyzdį.

${styleInstruction}

Taisyklės:
- Grąžink VIENĄ sunumeruotą 3-4 žingsnių sąrašą realistinam mėnesiui
- Naudok konkrečius skaičius (€ ir %) pagal duomenis
- Max 150 žodžių iš viso`
      : `You are a financial coach giving a single concrete example scenario.

${styleInstruction}

Rules:
- Return ONE numbered list of 3-4 steps for a realistic example month
- Use specific numbers (€ and %) based on the data
- Max 150 words total`;

    userPrompt = isLT
      ? `Čia vartotojo finansinė suvestinė ir tavo ankstesni pasiūlymai:

Pajamos: €${totalIncome.toFixed(2)}
Išlaidos: €${totalExpenses.toFixed(2)}
Balansas: ${savingsOrDeficit >= 0 ? '+' : ''}€${savingsOrDeficit.toFixed(2)}

Pasiūlymai:
${suggestionsContext}

Duok vieną realistį pavyzdį, kaip galėtų atrodyti tipinis mėnuo, jei vartotojas sektų tavo patarimus.`
      : `Here is the user's financial summary and your previous suggestions:

Income: €${totalIncome.toFixed(2)}
Expenses: €${totalExpenses.toFixed(2)}
Balance: ${savingsOrDeficit >= 0 ? '+' : ''}€${savingsOrDeficit.toFixed(2)}

Suggestions:
${suggestionsContext}

Give one realistic example of how a typical month could look if the user followed your advice.`;

  } else if (followUpType === 'CHALLENGE') {
    // Create a savings challenge
    systemPrompt = isLT
      ? `Tu kuri smaugį taupymo iššūkį.

${styleInstruction}

Taisyklės:
- Grąžink 7-14 dienų iššūkį
- Naudok trumpą sunumeruotą kasdienių ar savaitinių užduočių sąrašą
- Kiekvienas žingsnis turi būti labai konkretus (ką daryti, kiek sutaupyti ar sumažinti)
- Max 8 punktai, max 150 žodžių`
      : `You are creating a fun savings challenge.

${styleInstruction}

Rules:
- Return a 7-14 day challenge
- Use a short numbered list of daily or weekly tasks
- Each step must be extremely concrete (what to do, how much to save or cut)
- Max 8 bullets, max 150 words`;

    userPrompt = isLT
      ? `Pagal šią vartotojo situaciją ir pasiūlymus, sukurk trumpą taupymo iššūkį:

Pajamos: €${totalIncome.toFixed(2)}
Išlaidos: €${totalExpenses.toFixed(2)}
Pagrindinės kategorijos: ${expenseCategories.slice(0, 2).map(c => c.name).join(', ')}

Ankstesni pasiūlymai:
${suggestionsContext}`
      : `Based on this user's situation and the suggestions below, create a short savings challenge:

Income: €${totalIncome.toFixed(2)}
Expenses: €${totalExpenses.toFixed(2)}
Top categories: ${expenseCategories.slice(0, 2).map(c => c.name).join(', ')}

Previous suggestions:
${suggestionsContext}`;

  } else if (followUpType === 'QUICK_ACTIONS') {
    // Give 3 quick wins for this week
    systemPrompt = isLT
      ? `Tu teiki greičiausius sprendimus, kuriuos vartotojas gali padaryti šią savaitę.

${styleInstruction}

Taisyklės:
- Grąžink TIKSLIAI 3 greičius veiksmus artimiausiai 7 dienų
- Kiekvienas veiksmas: vienas sakinys + pasirinktinė emoji
- Fokusuokis į "padaryk dabar" žingsnius, ne ilgalaikį planavimą
- Max 100 žodžių iš viso`
      : `You are giving quick wins the user can do this week.

${styleInstruction}

Rules:
- Return exactly 3 quick actions for the next 7 days
- Each action: one sentence + optional emoji
- Focus on "do it now" steps, not long-term planning
- Max 100 words total`;

    userPrompt = isLT
      ? `Čia vartotojo suvestinė ir tavo ankstesni pasiūlymai:

Pajamos: €${totalIncome.toFixed(2)}
Išlaidos: €${totalExpenses.toFixed(2)}
Pagrindinės kategorijos: ${expenseCategories.slice(0, 2).map(c => c.name).join(', ')}

Pasiūlymai:
${suggestionsContext}

Duok 3 greičiausius sprendimus, kuriuos vartotojas gali įgyvendinti šią savaitę.`
      : `Here is the user's summary and your previous suggestions:

Income: €${totalIncome.toFixed(2)}
Expenses: €${totalExpenses.toFixed(2)}
Top categories: ${expenseCategories.slice(0, 2).map(c => c.name).join(', ')}

Suggestions:
${suggestionsContext}

Give 3 quick wins the user can implement this week.`;
  }

  return { systemPrompt, userPrompt };
}

// ============================================================================
// DYNAMODB CRUD ROUTES - Transactions (REST-style URLs)
// ============================================================================

// GET /users/:userId/transactions - Get all transactions for user
app.get('/users/:userId/transactions', async (req, res) => {
  try {
    const userId = req.params.userId;
    
    const command = new QueryCommand({
      TableName: 'Transactions',
      KeyConditionExpression: 'userId = :userId',
      ExpressionAttributeValues: {
        ':userId': userId
      }
    });
    
    const result = await docClient.send(command);
    
    // Transform DynamoDB format to API DTO format
    const transactions = (result.Items || []).map(item => ({
      id: item.transactionId,
      userId: item.userId,
      postedAt: item.date,
      amountMinor: Math.round((item.amount || 0) * 100), // Convert euros to cents
      type: item.type,
      category: item.category,
      description: item.description,
      createdAt: item.createdAt
    }));
    
    res.json(transactions);
  } catch (error) {
    console.error('❌ Error fetching transactions:', error);
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});

// POST /users/:userId/transactions - Create new transaction
app.post('/users/:userId/transactions', async (req, res) => {
  try {
    const userId = req.params.userId;
    const transaction = req.body;
    
    // Support both old format (amount) and new format (amountMinor)
    const amount = transaction.amount || (transaction.amountMinor ? transaction.amountMinor / 100 : 0);
    const date = transaction.date || transaction.postedAt;
    
    const command = new PutCommand({
      TableName: 'Transactions',
      Item: {
        userId,
        transactionId: transaction.id,
        amount,
        type: transaction.type,
        category: transaction.category,
        description: transaction.description,
        date,
        createdAt: transaction.createdAt || new Date().toISOString()
      }
    });
    
    await docClient.send(command);
    
    // Return in API format
    res.json({ 
      success: true, 
      transaction: {
        id: transaction.id,
        userId,
        postedAt: date,
        amountMinor: Math.round(amount * 100),
        type: transaction.type,
        category: transaction.category,
        description: transaction.description,
        createdAt: transaction.createdAt || new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('❌ Error creating transaction:', error);
    res.status(500).json({ error: 'Failed to create transaction' });
  }
});

// PUT /users/:userId/transactions/:id - Update transaction
app.put('/users/:userId/transactions/:id', async (req, res) => {
  try {
    const userId = req.params.userId;
    const transactionId = req.params.id;
    const updates = req.body;
    
    const command = new UpdateCommand({
      TableName: 'Transactions',
      Key: {
        userId,
        transactionId
      },
      UpdateExpression: 'SET amount = :amount, #type = :type, category = :category, description = :description, #date = :date',
      ExpressionAttributeNames: {
        '#type': 'type',
        '#date': 'date'
      },
      ExpressionAttributeValues: {
        ':amount': updates.amount,
        ':type': updates.type,
        ':category': updates.category,
        ':description': updates.description,
        ':date': updates.date
      }
    });
    
    await docClient.send(command);
    res.json({ success: true });
  } catch (error) {
    console.error('❌ Error updating transaction:', error);
    res.status(500).json({ error: 'Failed to update transaction' });
  }
});

// DELETE /users/:userId/transactions/:id - Delete transaction
app.delete('/users/:userId/transactions/:id', async (req, res) => {
  try {
    const userId = req.params.userId;
    const transactionId = req.params.id;
    
    const command = new DeleteCommand({
      TableName: 'Transactions',
      Key: {
        userId,
        transactionId
      }
    });
    
    await docClient.send(command);
    res.json({ success: true });
  } catch (error) {
    console.error('❌ Error deleting transaction:', error);
    res.status(500).json({ error: 'Failed to delete transaction' });
  }
});

// ============================================================================
// DYNAMODB CRUD ROUTES - Categories (REST-style URLs)
// ============================================================================

// GET /users/:userId/categories - Get all categories for user
app.get('/users/:userId/categories', async (req, res) => {
  try {
    const userId = req.params.userId;
    
    const command = new QueryCommand({
      TableName: 'Categories',
      KeyConditionExpression: 'userId = :userId',
      ExpressionAttributeValues: {
        ':userId': userId
      }
    });
    
    const result = await docClient.send(command);
    
    // Transform DynamoDB format to app format
    const categories = (result.Items || []).map(item => ({
      id: item.categoryId,
      userId: item.userId,
      name: item.name,
      type: item.type,
      color: item.color,
      icon: item.icon || ''
    }));
    
    res.json(categories);
  } catch (error) {
    console.error('❌ Error fetching categories:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

// POST /users/:userId/categories - Create new category
app.post('/users/:userId/categories', async (req, res) => {
  try {
    const userId = req.params.userId;
    const category = req.body;
    
    const command = new PutCommand({
      TableName: 'Categories',
      Item: {
        userId,
        categoryId: category.id,
        name: category.name,
        type: category.type,
        color: category.color,
        icon: category.icon || ''
      }
    });
    
    await docClient.send(command);
    res.json({ success: true, category });
  } catch (error) {
    console.error('❌ Error creating category:', error);
    res.status(500).json({ error: 'Failed to create category' });
  }
});

// Start server
app.listen(PORT, () => {
  console.log('');
  console.log('='.repeat(60));
  console.log('🚀 FinanceFlow AI Dev Server + DynamoDB Local API');
  console.log('='.repeat(60));
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`✅ OpenAI: ${process.env.OPENAI_API_KEY ? 'Configured' : 'Not configured'}`);
  console.log(`✅ DynamoDB: ${process.env.DYNAMODB_ENDPOINT || 'http://dynamodb-local:8000'}`);
  console.log('');
  console.log('Available endpoints:');
  console.log(`   GET    http://localhost:${PORT}/health`);
  console.log(`   GET    http://localhost:${PORT}/users/:userId/transactions`);
  console.log(`   POST   http://localhost:${PORT}/users/:userId/transactions`);
  console.log(`   PUT    http://localhost:${PORT}/users/:userId/transactions/:id`);
  console.log(`   DELETE http://localhost:${PORT}/users/:userId/transactions/:id`);
  console.log(`   GET    http://localhost:${PORT}/users/:userId/categories`);
  console.log(`   POST   http://localhost:${PORT}/users/:userId/categories`);
  console.log(`   POST   http://localhost:${PORT}/api/ai/suggestions`);
  console.log(`   POST   http://localhost:${PORT}/api/ai/follow-up`);
  console.log('');
  console.log('Press Ctrl+C to stop');
  console.log('');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('Shutting down gracefully...');
  process.exit(0);
});
