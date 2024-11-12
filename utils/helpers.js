const natural = require('natural');
const tokenizer = new natural.WordTokenizer();

function cleanAndTokenize(text) {
  text = text.replace(/\s+/g, ' ');
  text = text.replace(/<[^>]*>/g, '');
  text = text.replace(/\[.*?\]/g, '').replace(/\(.*?\)/g, '');
  text = text.replace(/\b(?:http|ftp)s?:\/\/\S+/g, '');
  text = text.replace(/\W/g, ' ').replace(/\d+/g, '');
  text = text.toLowerCase();
  return tokenizer.tokenize(text).join(' ');
}

module.exports = {
  cleanAndTokenize,
};