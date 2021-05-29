const Discord = require('discord.js');
const fetch = require('node-fetch');
const xml2js = require('xml2js');

module.exports = {
  name: 'playsteam',
  description: '寻找共同游玩的Steam游戏。',
  cooldown: 60,
  options: [{
    name: 'player1',
    type: 'STRING',
    description: 'SteamID64 或 完整URL 或 自定义URL',
    required: true
  },{
    name: 'player2',
    type: 'STRING',
    description: 'SteamID64 或 完整URL 或 自定义URL',
    required: true
  },{
    name: 'player3',
    type: 'STRING',
    description: 'SteamID64 或 完整URL 或 自定义URL',
    required: false
  },{
    name: 'player4',
    type: 'STRING',
    description: 'SteamID64 或 完整URL 或 自定义URL',
    required: false
  },{
    name: 'player5',
    type: 'STRING',
    description: 'SteamID64 或 完整URL 或 自定义URL',
    required: false
  },{
    name: 'player6',
    type: 'STRING',
    description: 'SteamID64 或 完整URL 或 自定义URL',
    required: false
  }],

  async execute(interaction) {
    // 推迟回复
    await interaction.defer();

    // 引入相关对象
    const { options } = interaction;
    const { commonEmbed, errorEmbed } = interaction.client.embeds;

    let playerList = []; // 玩家列表
    let games; // 游戏的交集
    try {
      for (let i = 0; i < options.length; i++) {
        let data = await getGamesData(options[i].value.trim()); // 获取游戏数据
        playerList.push(`[${data.steamID}](${data.profile})`); // 向玩家列表添加玩家
        // 如果是初次循环，则不继续计算。
        if (i === 0) {
          games = data.games;
          continue;
        }
        let intersect = games.intersect(data.games); // 计算游戏的交集
        // 将游玩时间相加
        intersect.each(game => {
          let oldGame = games.get(game.appID);
          if (game.hoursOnRecord || oldGame.hoursOnRecord) {
            game.hoursOnRecord = (game.hoursOnRecord || 0) + (oldGame.hoursOnRecord || 0);
          }
        });
        games = intersect;
      }
    } catch (error) {
      if (!error instanceof GamesDataError) throw error;
      return interaction.editReply({ embeds:[errorEmbed(error)], ephemeral: true });
    }

    // 按游玩时间排序
    games = games.sort((gameA, gameB) => {
      let a = gameA.hoursOnRecord || 0;
      let b = gameB.hoursOnRecord || 0;
      return -(a - b);
    });

    // 用便于浏览的形式输出
    let gamesList = [];
    for (let game of games.first(15).values()) {
      let recordText = game.hoursOnRecord ? ` (${game.hoursOnRecord.toFixed(1)} 小时)` : '';
      gamesList.push(`[${game.name}](${game.storeLink})${recordText}`);
    }
    let embed = commonEmbed()
      .setTitle('共同游玩的Steam游戏')
      .setDescription('将游玩时间相加后，排名前15的游戏。')
      .addFields(
        { name: '玩家', value: playerList.join('\n') },
        { name: '共同游戏', value: gamesList.length !== 0 ? gamesList.join('\n') : '没有共同游戏' }
      );
    await interaction.editReply(embed);
  }
}

/**
 * 获取游戏数据
 * @param {string} query SteamID64 或 完整URL 或 自定义URL
 * @returns {Promise<any>} 游戏数据
 */
async function getGamesData(query) {
  // 分析并生成URL
  let profile;
  if (query.length === 17 && query.startsWith('7656119')) {
    profile = `https://steamcommunity.com/profiles/${query}/`;
  } else if (/^https?:\/\/steamcommunity.com\/(profiles|id)\/.+$/.test(query)) {
    profile = `${query}${query.endsWith('/') ? '' : '/'}`;
  } else {
    profile = `https://steamcommunity.com/id/${query}/`;
  }
  let url = new URL('games/?xml=1&l=schinese', profile);
  let res;
  try {
    res = await fetch(url.href, { timeout: 15e3 }); // 发送请求
  } catch(error) {
    // 请求超时时报错
    if (error.type !== 'request-timeout') throw error;
    throw new GamesDataError(profile);
  }
  let data = res.ok && await xml2js.parseStringPromise(await res.text(), { explicitArray: false }); // 解析XML
  // 无法获取游戏数据时报错
  if (!data || !data.gamesList || !data.gamesList.games || !data.gamesList.games.game) {
    throw new GamesDataError(profile);
  }
  // 生成游戏数据
  let result = {
    steamID64: data.gamesList.steamID64,
    steamID: data.gamesList.steamID,
    profile: profile,
    games: new Discord.Collection()
  };
  for (let game of data.gamesList.games.game) {
    // 格式化游玩时间
    if (game.hoursOnRecord) {
      game.hoursOnRecord = Number(game.hoursOnRecord.replace(/,/g, ''));
    };
    result.games.set(game.appID, game);
  }
  return result;
}

// 游戏数据错误类
class GamesDataError extends Error {
  constructor(profile) {
    super(`无法从 ${profile} 获取游戏信息。`);
  }

  get name() {
    return this.constructor.name;
  }
}
