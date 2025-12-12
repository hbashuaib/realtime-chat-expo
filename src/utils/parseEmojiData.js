import emojiData from 'emoji-datasource/emoji.json';

export const getUnifiedEmoji = unified => {
  return unified
    .split('-')
    .map(u => String.fromCodePoint(parseInt(u, 16)))
    .join('');
};

export const getEmojiList = () => {
  return emojiData
    .filter(e => e.has_img_apple) // optional: filter only emojis with images
    .map(e => ({
        emoji: getUnifiedEmoji(e.unified),
        name: e.name || '',
        category: e.category || '',
        short_name: e.short_name || '',
    }));
};