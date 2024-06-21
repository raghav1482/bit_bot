const { Telegraf } = require('telegraf');
const axios = require('axios');
const { GoogleGenerativeAI } = require("@google/generative-ai");
const express = require('express');
require('dotenv').config();
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

async function run(message) {
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash"});
  const result = await model.generateContent([
    message.slice(0,-1)+' answer in MARKDOWN mode']
  );
  return result.response.text();
}
const bot = new Telegraf(process.env.BOT_TOKEN);

bot.start(async (ctx) => {
    await ctx.reply('Welcome to BIT_BOT');
});

bot.hears(/hi|hello|hey|greetings/i, async (ctx) => {
    await ctx.reply('Hello! How can I assist you today?');
});

bot.on('message', async (ctx) => {
    const ai_answer = await run(ctx.message.text);
    await ctx.reply(ai_answer,{ parse_mode: 'Markdown' });
});

let usedIndexes = new Set();

async function fetchDataAndSendMessage() {
    try {
        const response = await axios.get('https://newsdata.io/api/1/news', {
            params: {
                apikey: process.env.NEWS_API,
                q: 'technology'
            }
        });

        const randIndex = response.data ? response.data.results : [];

        if (randIndex.length > 0) {

            const availableIndexes = randIndex
                .map((_, index) => index)
                .filter(idx => !usedIndexes.has(idx));


            if (availableIndexes.length === 0) {
                usedIndexes.clear();
            }

            const randomIndex = availableIndexes[Math.floor(Math.random() * availableIndexes.length)];
            usedIndexes.add(randomIndex);

            const data = randIndex[randomIndex];

            const message = `
            <b>📰TODAYS NEWS</b>\n<b>Title:</b> ${data.title} \n<b>Description:</b> ${data.description.slice(0,400)}\n<b>Read more:</b> ${data.link}
            `;

            const chatId = process.env.CHANNEL_ID;

            await bot.telegram.sendMessage(chatId, message, { parse_mode: 'HTML' });
        } else {
            console.log('No results found in the API response.');
        }

    } catch (error) {
        console.error('Error fetching data from API:', error);
    }
}


const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
    res.send('Welcome to the Express server!');
});

app.get('/send-news-update', async (req, res) => {
    await fetchDataAndSendMessage();
    res.send('News update sent!');
});

const intervalInMilliseconds = 3 * 60 * 60 * 1000;
setInterval(fetchDataAndSendMessage, intervalInMilliseconds);

bot.launch();
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

process.once('SIGINT', () => {
    bot.stop('SIGINT');
    process.exit();
});

process.once('SIGTERM', () => {
    bot.stop('SIGTERM');
    process.exit();
});
