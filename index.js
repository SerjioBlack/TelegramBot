const TelegramApi = require('node-telegram-bot-api');
const {gameOptions, againOptions} = require('./options')
const token = '7180507295:AAGWCc1yuCm4snIbuV3rmqcF5jiCgpKQmLU';

const bot = new TelegramApi(token, {polling: true});

const chats = {};



const startGame = async (chatId) => {
    await bot.sendMessage(chatId, 'Сейчас я загадаю цифру от 0 до 9, а ты должен её отгадать');
    const randomNumber = Math.floor(Math.random() * 10);
    chats[chatId] = randomNumber;
    await bot.sendMessage(chatId, 'Отгадывай', gameOptions);
};

const start = () => {
    bot.setMyCommands([
        {command: '/start', description: 'Starting greet'},
        {command: '/info', description: 'Get info about user'},
        {command: '/game', description: 'Игра Угадай Цифру'},
    ]);
    
    bot.on('message', async (msg) => {
        const text = msg.text;
        const chatId = msg.chat.id;
    
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
        return bot.sendMessage(chatId, 'I don\'t understand, select another command');
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