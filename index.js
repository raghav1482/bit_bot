const { Telegraf } = require('telegraf');
const axios = require('axios');
const { GoogleGenerativeAI } = require("@google/generative-ai");
const express = require('express');
require('dotenv').config();
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

const options = {
    method: 'GET',
    url: 'https://youtube-v31.p.rapidapi.com/search',
    params: {
      channelId: 'UCSkE1f1N3kBocAdzPdMHqOw',
      part: 'snippet,id',
      order: 'date',
      maxResults: '5'
    },
    headers: {
      'x-rapidapi-key': `${process.env.RAPID_API_KEY}`,
      'x-rapidapi-host': 'youtube-v31.p.rapidapi.com'
    }
};

const bot = new Telegraf(process.env.BOT_TOKEN);

bot.start(async (ctx) => {
    const msg= `<b>Welcome to BIT_BOT</b>\n
    <b>Available commands</b>:
👉/start - Start the bot
👉/help - Show help message
📹 /ytchannel - Fetch latest videos from Bitstalker's YouTube channel
📰 /search_article [your search_text] - search relevant articles
💬 Send a message in the format <b>"ASK AI: your_message"</b> to generate AI responses
`
    await ctx.reply(msg,{parse_mode:"HTML"});
});

bot.hears(/hi|hello|hey|greetings/i, async (ctx) => {
    await ctx.reply('Hello! How can I assist you today?');
});

  bot.command('help', async (ctx) => {
    const helpMessage = `
<b>Available commands</b>:
👉/start - Start the bot
👉/help - Show this help message
📹 /ytchannel - Fetch latest videos from Bitstalker's YouTube channel
📰 /search_article [your search_text] - search relevant articles
💬 Send a message in the format <b>"ASK AI: your_message"</b> to generate AI responses
`;

    await ctx.reply(helpMessage,{parse_mode:"HTML"});
});
;
const getChannelData = async()=>{
    try {
        const response = await axios.request(options);
        return response.data;
        // return response.items;
    } catch (error) {
        console.error(error);
    }
}

async function searchArticle(query) {
    try {
        const response = await axios.post('https://rgblogit.vercel.app/api/filter', {search_text:query});

        const articles = response.data ? response.data : [];
        if (articles.length > 0) {
            let message = `<b>📰 Search Results for "${query}"</b>\n\n`;
            articles.forEach(article => {
                const desc = article.prompt.replace(/(<([^>]+)>)/gi, "").slice(0, 200);
                message += `<b>Title:</b> ${article.title}\n<b>Description:</b> ${desc}...\n<b>Read more:</b> ${"https://rgblogit.vercel.app/post/"+article._id}\n\n`;
            });

            return message;
        } else {
            return `No articles found for "${query}".`;
        }
    } catch (error) {
        console.error('Error fetching data from API:', error);
        return 'An error occurred while searching for articles. Please try again later.';
    }
}

async function run(message) {
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash"});
  if (message.endsWith('\n')) {
    message = message.slice(0, -1);
  }
  const result = await model.generateContent([
    message+' answer in MARKDOWN mode']
  );
  return result.response.text();
}
bot.command('search_article', async (ctx) => {
    const query = ctx.message.text.split(' ').slice(1).join(' ');
    if (query) {
        const searchResult = await searchArticle(query);
        await ctx.reply(searchResult, { parse_mode: 'HTML' });
    } else {
        await ctx.reply('Please provide a search query.');
    }
});

bot.hears(/ytchannel|channelupdate|bitstalkeryt/i, async (ctx) => {
    try{
        const channel= await getChannelData();
        const top5 = await channel?channel.items:[]; 
        for(i=0;i<top5.length;i++){
            await ctx.reply(`<b>${top5[i].snippet.title}</b>\n<b>View Now 👉:"https://www.youtube.com/watch?v=${top5[i].id.videoId}"</b>`,{parse_mode:"HTML"});
        }
    }catch(e){
        console.log(e);
    }
});



bot.on('message', async (ctx) => {
    try{
        const msg = ctx.message.text
        if(msg.slice(0,7)==='ASK AI:'){
            const ai_answer = await run(ctx.message.text);
            await ctx.reply(ai_answer,{ parse_mode: 'Markdown' });
        }else{
            await ctx.reply("Sorry i couldn't understand.");
        }
    }catch(e){
        console.log(e);
        await ctx.reply("Some error occurred. Please try again later.");
    }
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
