module.exports = {
  name: 'matrix',
  description: '矩阵命令',
  options: [{
    name: 'invite',
    type: 'SUB_COMMAND',
    description: '查看机器人的邀请链接。'
  },{
    name: 'info',
    type: 'SUB_COMMAND',
    description: '查看机器人信息。'
  }],

  async execute(interaction) {
    // 根据子命令调用对应的处理程序
    let sub = interaction.options[0].name;
    await handles[sub](interaction);
  }
}

// 处理程序
let handles = {
  invite(interaction) {
    // 引入对象
    const { commonEmbed } = interaction.client.embeds;

    // 发送嵌入消息
    let embed = commonEmbed()
      .setTitle('欢迎使用矩阵！')
      .setDescription(`[点此邀请加入服务器](https://discord.com/oauth2/authorize?client_id=${interaction.applicationID}&scope=bot+applications.commands&permissions=8)`);
    interaction.reply(embed);
  },

  async info(interaction) {
    // 引入对象
    const { user, application, embeds } = interaction.client;
    const { commonEmbed } = embeds;
    const { version } = require('../package.json');

    await application.fetch(); // 获取应用信息
    // 发送嵌入消息
    let embed = commonEmbed()
      .setTitle('机器人信息')
      .setThumbnail(user.displayAvatarURL())
      .addFields(
        { name: '所有者', value: application.owner.tag, inline: true },
        { name: '版本', value: version, inline: true },
        { name: '源代码', value: 'https://github.com/Android-KitKat/Matrix', inline: false }
      );
    interaction.reply(embed);
  }
}
