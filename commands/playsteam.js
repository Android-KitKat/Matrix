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

    // 计算游戏的交集
    let data;
    try {
      data = await getGamesData(options[0].value.trim());
      for (let i = 1; i < options.length; i++) {
        let intersect = data.intersect(await getGamesData(options[i].value.trim()));
        intersect.each(game => {
          let oldGame = data.get(game.appID);
          if (game.hoursOnRecord || oldGame.hoursOnRecord) {
            game.hoursOnRecord = (game.hoursOnRecord || 0) + (oldGame.hoursOnRecord || 0);
          }
        });
        data = intersect;
      }
    } catch (error) {
      if (error.code !== 'ERR_GAME_INFO') throw error;
      return interaction.editReply({ embeds:[errorEmbed(error)], ephemeral: true });
    }

    // 按游玩时间排序
    data = data.sort((gameA, gameB) => {
      let a = gameA.hoursOnRecord || 0;
      let b = gameB.hoursOnRecord || 0;
      return -(a - b);
    });

    // 用便于浏览的形式输出
    let result = [];
    for (let game of data.first(15).values()) {
      result.push(`[${game.name}](${game.storeLink}) (${game.hoursOnRecord.toFixed(1)} 小时)`);
    }
    let embed = commonEmbed()
      .setTitle('共同游玩的Steam游戏')
      .setDescription(`将游玩时间相加后进行排序的前15个游戏。\n\n${result.join('\n')}`);
    await interaction.editReply(embed);
  }
}

/**
 * 获取游戏数据
 * @param {string} query SteamID64 或 完整URL 或 自定义URL
 * @returns {Promise<Discord.Collection<string, any>>}
 */
async function getGamesData(query) {
  // 分析并生成URL
  let profile;
  if (query.length === 17 && query.startsWith('7656119')) {
    profile = `https://steamcommunity.com/profiles/${query}/`;
  } else if (/https?:\/\/steamcommunity.com\/(profiles|id)\/.+/.test(query)) {
    profile = `${query}${query.endsWith('/') ? '' : '/'}`;
  } else {
    profile = `https://steamcommunity.com/id/${query}/`;
  }
  let url = new URL('games/?xml=1&l=schinese', profile);
  let res = await fetch(url.href); // 发送请求
  let data = await xml2js.parseStringPromise(await res.text(), { explicitArray: false }); // 解析XML
  // 无法获取游戏数据时报错
  if (!data.gamesList || !data.gamesList.games || !data.gamesList.games.game) {
    let error = new Error(`无法从 ${profile} 获取游戏信息。`);
    error.code = 'ERR_GAME_INFO';
    throw error;
  }
  // 提取游戏数据
  let coll = new Discord.Collection();
  for (let game of data.gamesList.games.game) {
    // 格式化游玩时间
    if (game.hoursOnRecord) {
      game.hoursOnRecord = Number(game.hoursOnRecord.replace(/,/g, ''));
    };
    coll.set(game.appID, game);
  }
  return coll;
}
