const fs = require('fs');
const Discord = require('discord.js');
const { token, proxy } = require('./config.json');

// 读取参数
const specifiedCommandArgs = process.argv.slice(2);
const mode = specifiedCommandArgs[0] || 'set';
const guildId = specifiedCommandArgs[1] || undefined;

// 参数检查
if (!['set', 'clear'].includes(mode)) {
  return console.log('模式只能是\'set\'或\'clear\'');
}
if (guildId && !/^\d+$/.test(guildId)) {
  return console.log('服务器ID无效');
}

// 创建客户端
const client = new Discord.Client({
  intents: ['GUILD_INTEGRATIONS']
});

// 准备就绪时
client.on('ready', async () => {
  console.log(`登陆到 ${client.user.tag}`);
  const { commands } = guildId ? client.guilds.cache.get(guildId) : client.application; // 引入相关对象
  if (mode === 'set') {
    // 创建命令
    let commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));
    for (let file of commandFiles) {
      let command = require(`./commands/${file}`);
      await commands.create(command);
      console.log(`注册命令 ${command.name}`);
    }
  } else if (mode === 'clear') {
    // 清空命令
    await commands.set([]);
    console.log('命令已清空');
  }
  client.destroy(); // 销毁客户端
  console.log('拜拜');
});

// 设置代理
if (proxy.enable) {
  require('global-agent').bootstrap();
  if (proxy.http) global.GLOBAL_AGENT.HTTP_PROXY = proxy.http;
  if (proxy.https) global.GLOBAL_AGENT_HTTPS_PROXY = proxy.https;
}

client.login(token); // 登陆客户端
