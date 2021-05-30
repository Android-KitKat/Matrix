const Discord = require('discord.js');
const SteamAPI = require('steamapi');
const { steamapi } = require('../config.json');

const steam = new SteamAPI(steamapi);

module.exports = {
  name: 'playsteam',
  description: '寻找共同游玩的Steam游戏。',
  cooldown: 60,
  options: [{
    name: 'player1',
    type: 'STRING',
    description: 'SteamID64 或 自定义URL 或 完整URL',
    required: true
  },{
    name: 'player2',
    type: 'STRING',
    description: 'SteamID64 或 自定义URL 或 完整URL',
    required: true
  },{
    name: 'player3',
    type: 'STRING',
    description: 'SteamID64 或 自定义URL 或 完整URL',
    required: false
  },{
    name: 'player4',
    type: 'STRING',
    description: 'SteamID64 或 自定义URL 或 完整URL',
    required: false
  },{
    name: 'player5',
    type: 'STRING',
    description: 'SteamID64 或 自定义URL 或 完整URL',
    required: false
  },{
    name: 'player6',
    type: 'STRING',
    description: 'SteamID64 或 自定义URL 或 完整URL',
    required: false
  }],

  async execute(interaction) {
    // 推迟回复
    await interaction.defer();

    // 引入相关对象
    const { options } = interaction;
    const { commonEmbed, errorEmbed } = interaction.client.embeds;

    let playerList = []; // 玩家列表
    let games; // 共同游戏
    for (let i = 0; i < options.length; i++) {
      let query = options[i].value.trim(); // 获取参数
      let data;
      try {
        data = await getPlayerData(query); // 获取游戏数据
      } catch (error) {
        return interaction.editReply({ embeds:[errorEmbed(error, `在获取 ${query} 的数据时发生错误`)], ephemeral: true });
      }
      playerList.push(`[${data.nickname}](${data.url})`); // 向玩家列表添加玩家
      // 如果是初次循环，则不继续计算。
      if (i === 0) {
        games = data.games;
        continue;
      }
      let intersect = games.intersect(data.games); // 计算游戏的交集
      // 将游玩时间相加
      intersect.each(game => {
        game.playTime += games.get(game.appID).playTime;
      });
      games = intersect;
    }

    // 按游玩时间排序
    games = games.sort((gameA, gameB) => {
      return -(gameA.playTime - gameB.playTime);
    });

    // 用便于浏览的形式输出
    let gamesList = [];
    for (let game of games.first(15).values()) {
      let recordText = game.playTime > 0 ? ` (${(game.playTime / 60).toFixed(1)} 小时)` : '';
      gamesList.push(`${game.name}${recordText}`);
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
 * 获取玩家数据
 * @param {string} query SteamID64 或 自定义URL 或 完整URL
 * @returns {Promise<any>} 玩家数据
 */
async function getPlayerData(query) {
  // 获取数据
  let steamID = await steam.resolve(query);
  let player = await steam.getUserSummary(steamID);
  let games = await steam.getUserOwnedGames(steamID);

  // 生成数据
  let data = {
    nickname: player.nickname,
    url: player.url,
    games: new Discord.Collection()
  }

  for (let game of games) {
    data.games.set(game.appID, game);
  }

  return data;
}
