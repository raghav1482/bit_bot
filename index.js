const { Telegraf } = require('telegraf');
const axios = require('axios');
const express = require('express');
require('dotenv').config();

const bot = new Telegraf(process.env.BOT_TOKEN);

bot.start(async (ctx) => {
    await ctx.reply('Welcome to BIT_BOT');
});

// Respond to greetings
bot.hears(/hi|hello|hey|greetings/i, async (ctx) => {
    await ctx.reply('Hello! How can I assist you today?');
});

let usedIndexes = new Set(); // Set to store used indexes

// Function to fetch data from API and send a message
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
            // Filter out used indexes
            const availableIndexes = randIndex
                .map((_, index) => index)
                .filter(idx => !usedIndexes.has(idx));

            // If all indexes are used, reset the set
            if (availableIndexes.length === 0) {
                usedIndexes.clear();
            }

            // Choose a random index from availableIndexes
            const randomIndex = availableIndexes[Math.floor(Math.random() * availableIndexes.length)];
            usedIndexes.add(randomIndex);

            const data = randIndex[randomIndex];

            const message = `
            <b>📰TODAYS NEWS</b>\n<b>Title:</b> ${data.title} \n<b>Description:</b> ${data.description.slice(0,400)}\n<b>Read more:</b> ${data.link}
            `;

            // Replace with the chat ID or use a specific user ID
            const chatId = process.env.CHANNEL_ID;

            await bot.telegram.sendMessage(chatId, message, { parse_mode: 'HTML' });
        } else {
            console.log('No results found in the API response.');
        }

    } catch (error) {
        console.error('Error fetching data from API:', error);
    }
}

// Set up Express server
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
    res.send('Welcome to the Express server!');
});

// Endpoint to trigger sending news update
app.get('/send-news-update', async (req, res) => {
    await fetchDataAndSendMessage();
    res.send('News update sent!');
});

// Send data periodically (every 3 hours)
const intervalInMilliseconds = 3 * 60 * 60 * 1000;
setInterval(fetchDataAndSendMessage, intervalInMilliseconds);

// Launch bot and server
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
