const TelegramApi = require('node-telegram-bot-api');
const OpenAI = require('openai');
const axios = require('axios');
const { gameOptions, againOptions } = require('./options');
require('dotenv').config();

const token = process.env.TELEGRAM_TOKEN;
const openAiApiKey = process.env.OPENAI_API_KEY;

if (!token) {
    console.error('TELEGRAM_TOKEN is not defined');
    process.exit(1);
}
if (!openAiApiKey) {
    console.error('OPENAI_API_KEY is not defined');
    process.exit(1);
}

console.log('TELEGRAM_TOKEN:', token);
console.log('OPENAI_API_KEY:', openAiApiKey);

const bot = new TelegramApi(token, { polling: true });

const openaiClient = new OpenAI(openAiApiKey);

const chats = {};

const startGame = async (chatId) => {
    await bot.sendMessage(chatId, 'Сейчас я загадаю цифру от 0 до 9, а ты должен её отгадать');
    const randomNumber = Math.floor(Math.random() * 10);
    chats[chatId] = randomNumber;
    await bot.sendMessage(chatId, 'Отгадывай', gameOptions);
};

const handleImageUpload = async (chatId, photo) => {
    const fileId = photo[photo.length - 1].file_id;
    const file = await bot.getFile(fileId);
    const filePath = `https://api.telegram.org/file/bot${token}/${file.file_path}`;

    try {
        const form = new FormData();
        form.append('file', axios.get(filePath, { responseType: 'stream' }).then(res => res.data));

        const contentLength = form.getLengthSync();

        const response = await axios.post('https://api.openai.com/v1/images', form, {
            headers: {
                'Authorization': `Bearer ${openAiApiKey}`,
                'Content-Type': `multipart/form-data; boundary=${form._boundary}`,
                'Content-Length': contentLength
            }
        });

        const description = response.data.description;
        await bot.sendMessage(chatId, `Вот что на изображении: ${description}`);
    } catch (error) {
        console.error('Error processing image:', error);
        await bot.sendMessage(chatId, 'Произошла ошибка при обработке изображения. Попробуйте еще раз.');
    }
};


const askQuestion = async (chatId, question) => {
    try {
        const OpenAI = require('openai');
        const openai = new OpenAI(openAiApiKey);

        const stream = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: [{ role: "user", content: question }],
            stream: true,
        });

        let response = "";
        for await (const chunk of stream) {
            response += chunk.choices[0]?.delta?.content || "";
        }

        await bot.sendMessage(chatId, response.trim());
    } catch (error) {
        console.error('Error fetching answer:', error);
        await bot.sendMessage(chatId, 'Произошла ошибка при обработке вопроса. Попробуйте еще раз.');
    }
};

const start = () => {
    bot.setMyCommands([
        { command: '/start', description: 'Starting greet' },
        { command: '/info', description: 'Get info about user' },
        { command: '/game', description: 'Игра Угадай Цифру' },
        { command: '/upload_image', description: 'Загрузить изображение' },
        { command: '/ask', description: 'Задать вопрос боту' },
    ]);

    bot.on('message', async (msg) => {
        if (!msg.text) {
            return;
        }

        const text = msg.text;
        const chatId = msg.chat.id;

        console.log(`Received message: ${text} from chat: ${chatId}`);

        if (text === '/start') {
            await bot.sendSticker(chatId, 'https://tlgrm.ru/_/stickers/ea5/382/ea53826d-c192-376a-b766-e5abc535f1c9/7.webp');
            return bot.sendMessage(chatId, `Добро пожаловать в телеграм бот SerjioBlack`);
        }
        if (text === '/info') {
            return bot.sendMessage(chatId, `Тебя зовут ${msg.from.first_name} ${msg.from.username}`);
        }
        if (text === '/game') {
            return startGame(chatId);
        }
        if (text === '/upload_image') {
            return bot.sendMessage(chatId, 'Пожалуйста, загрузите изображение.');
        }
        if (text.startsWith('/ask ')) {
            const question = text.slice(5).trim();
            console.log(`Received question: ${question}`);
            if (question) {
                return askQuestion(chatId, question);
            } else {
                return bot.sendMessage(chatId, 'Пожалуйста, введите вопрос после команды /ask.');
            }
        }
        return bot.sendMessage(chatId, 'I don\'t understand, select another command');
    });

    bot.on('photo', async (msg) => {
        const chatId = msg.chat.id;
        const photo = msg.photo;
        await handleImageUpload(chatId, photo);
    });

    bot.on('callback_query', async (msg) => {
        const data = msg.data;
        const chatId = msg.message.chat.id;
        if (data === '/again') {
            return startGame(chatId);
        }
        if (parseInt(data) === chats[chatId]) {
            return bot.sendMessage(chatId, `Поздравляю, ты отгадал цифру ${chats[chatId]}`, againOptions);
        } else {
            return bot.sendMessage(chatId, `К сожалению, ты не угадал, бот выбрал цифру ${chats[chatId]}`, againOptions);
        }
    });
};

start();
