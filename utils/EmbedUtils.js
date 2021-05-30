const Discord = require('discord.js');

/**
 * 嵌入对象工具类
 */
class EmbedUtils {
  /**
   * @param {Discord.Client} client 客户端对象
   */
  constructor(client) {
    this.client = client; 
  }
  
  /**
   * 通用消息模板
   * @returns {Discord.MessageEmbed} 嵌入消息
   */
  commonEmbed = () => {
    const { user } = this.client;
    
    let embed = new Discord.MessageEmbed()
      .setColor('#0099ff')
      .setAuthor(user.username, user.displayAvatarURL())
      .setFooter(`由 Android 制作`)
      .setTimestamp();
    
    return embed;
  }
  
  /**
   * 错误消息模板
   * @param {Error | string} error 错误对象
   * @param {string} message 文字信息
   * @returns {Discord.MessageEmbed} 嵌入消息
   */
  errorEmbed = (error, message) => {
    let embed = this.commonEmbed()
      .setColor('#E74C3C')
      .setTitle('错误')
      .setDescription(`${message ? `${message}\n\n` : ''}${error.message || error}`);
  
    return embed;
  }
}

module.exports = EmbedUtils;
