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
    description: 'Steam个人资料地址',
    required: true
  },{
    name: 'player2',
    type: 'STRING',
    description: 'Steam个人资料地址',
    required: true
  },{
    name: 'player3',
    type: 'STRING',
    description: 'Steam个人资料地址',
    required: false
  },{
    name: 'player4',
    type: 'STRING',
    description: 'Steam个人资料地址',
    required: false
  },{
    name: 'player5',
    type: 'STRING',
    description: 'Steam个人资料地址',
    required: false
  },{
    name: 'player6',
    type: 'STRING',
    description: 'Steam个人资料地址',
    required: false
  }],

  async execute(interaction) {
    // 解析参数
    let profiles = [];
    for (let option of interaction.options) {
      profiles.push(option.value.trim());
    }

    // 推迟回复
    await interaction.defer();

    // 引入嵌入消息工具类
    const { commonEmbed, errorEmbed } = interaction.client.embeds;

    // 计算游戏的交集
    let data;
    try {
      data = await getGamesData(profiles[0]);
      for (let i = 1; i < profiles.length; i++) {
        let intersect = data.intersect(await getGamesData(profiles[i]));
        intersect.each(game => {
          let oldGame = data.get(game.appID);
          if (game.hoursOnRecord || oldGame.hoursOnRecord) {
            game.hoursOnRecord = (game.hoursOnRecord || 0) + (oldGame.hoursOnRecord || 0);
          }
        });
        data = intersect;
      }
    } catch (error) {
      if (error.code !== 'ERR_GAME_INFO' && error.name !== 'TypeError') throw error;
      return interaction.followUp({ embeds:[errorEmbed(error)], ephemeral: true });
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
    await interaction.followUp(embed);
  }
}

/**
 * 获取游戏数据
 * @param {string} profile Steam个人资料地址
 * @returns {Promise<Discord.Collection<string, any>>}
 */
async function getGamesData(profile) {
  let url = new URL('games/?xml=1&l=schinese', `${profile}${profile.endsWith('/') ? '' : '/'}`); // 生成URL
  if (url.host !== 'steamcommunity.com') throw new TypeError(`非Steam社区地址: ${profile}`); // 检查URL
  let res = await fetch(url.href); // 发送请求
  let data = await xml2js.parseStringPromise(await res.text(), { explicitArray: false }); // 解析XML
  // 无法获取游戏数据时报错
  if (!data.gamesList.games || !data.gamesList.games.game) {
    let error = new Error(`无法获取 [${data.gamesList.steamID}](${profile}) 的游戏信息。`);
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
