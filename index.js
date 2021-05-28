const fs = require('fs');
const colors = require('colors/safe');
const Discord = require('discord.js');
const EmbedUtils = require('./utils/EmbedUtils');
const { token, proxy, activity } = require('./config.json');

// 创建客户端
const client = new Discord.Client({
  intents: ['GUILD_INTEGRATIONS'],
  presence: {
    activities: [{
      name: '启动中...'
    }]
  }
});

// 增加自定义属性
client.commands = new Discord.Collection();
client.cooldowns = new Discord.Collection();
client.embeds = new EmbedUtils(client);
client.logger = require('tracer').dailyfile({
  format: '{{timestamp}} <{{title}}> {{message}}',
  dateformat: 'yyyy-mm-dd HH:MM:ss Z',
  transport: data => {
    let color = {
      //log : do nothing
      trace : colors.magenta,
      debug : colors.cyan,
      info : colors.green,
      warn : colors.yellow,
      error : colors.red.bold,
      fatal : colors.red.bold
    }
    let output = color[data.title](data.output);
    if (data.title == 'warn') {
      console.warn(output);
    } else if (data.level > 4) {
      console.error(output);
    } else {
      console.log(output);
    }
  },
  root: './logs/',
  maxLogFiles: 30,
  allLogsFileName: 'Matrix'
});
const { commands, cooldowns, embeds, logger } = client;
const { errorEmbed } = embeds;

// 创建日志文件夹
if (!fs.existsSync('./logs/')) fs.mkdirSync('./logs/');

// 加载命令
const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));
for (const file of commandFiles) {
  let command = require(`./commands/${file}`);
  commands.set(command.name, command);
}

// 准备就绪时
client.once('ready', () => {
  logger.info(`登陆到 ${client.user.tag}`); // 输出登陆信息
  client.user.setPresence(activity ? { activities: [{ name: activity }] } : {}); // 设置活动状态
});

// 收到交互时
client.on('interaction', async interaction => {
  // 检查交互
  if (!interaction.isCommand()) return;
  if (!commands.has(interaction.commandName)) return interaction.reply({ embeds: [errorEmbed('命令不存在!')], ephemeral: true });

  // 获取相关对象
  const command = commands.get(interaction.commandName);
  const { user, guild, guildID } = interaction;

  // 检查冷却时间
  if (!cooldowns.has(command.name)) {
    cooldowns.set(command.name, new Discord.Collection());
  }
  const now = Date.now();
  const timestamps = cooldowns.get(command.name);
  const cooldownAmount = (command.cooldown || 3) * 1000;
  if (timestamps.has(user.id)) {
    const timeLeft = (cooldownAmount - (now - timestamps.get(user.id))) / 1000;
    return interaction.reply({ embeds: [errorEmbed(`\`${command.name}\` 命令正在冷却，请 ${timeLeft.toFixed(1)} 秒后再试。`)], ephemeral: true });
  }

  // 记录冷却时间
  timestamps.set(user.id, now);
  setTimeout(() => timestamps.delete(user.id), cooldownAmount);

  // 记录日志
  let options = [];
  interaction.options.forEach(option => {
    options.push(`${option.name}${option.value ? `: ${option.value}` : ''}`);
  });
  let optionsText = options.length > 0 ? ` ${options.join(' ')}` : '';
  let guildText = guild ? `，位于 ${(await guild.fetch()).name}(${guildID})` : '';
  logger.info(`${user.tag}(${user.id}) 使用了 /${command.name}${optionsText}${guildText}。`);

  // 执行命令
  try {
    await command.execute(interaction);
  } catch (error) {
    logger.error(error);
    if (interaction.deferred) {
      interaction.editReply({ embeds: [errorEmbed('在尝试执行命令时出错!')], ephemeral: true });
    } else {
      interaction.reply({ embeds: [errorEmbed('在尝试执行命令时出错!')], ephemeral: true });
    }
  }
});

// 设置代理
if (proxy.enable) {
  require('global-agent').bootstrap();
  if (proxy.http) global.GLOBAL_AGENT.HTTP_PROXY = proxy.http;
  if (proxy.https) global.GLOBAL_AGENT_HTTPS_PROXY = proxy.https;
}

client.login(token); // 登陆客户端

// 退出程序
function exit() {
  client.destroy(); // 销毁客户端
  logger.info('拜拜!'); // 输出退出信息
  process.exit(); // 程序退出
}

// 程序中止时
process.on('SIGINT', exit);
process.on('SIGTERM', exit);
