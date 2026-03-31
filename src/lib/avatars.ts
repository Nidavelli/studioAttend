export const AVATAR_STYLES = [
  'identicon',
  'shapes',
  'thumbs',
  'adventurer',
  'adventurer-neutral',
  'avataaars-neutral',
  'bottts',
  'bottts-neutral',
  'fun-emoji',
  'lorelei',
  'lorelei-neutral',
  'micah',
  'notionists-neutral',
  'open-peeps',
];

export function generateAvatar(seed: string) {
  const style = AVATAR_STYLES[Math.floor(Math.random() * AVATAR_STYLES.length)];
  return { style, seed };
}

export function getAvatarUrl(style: string | undefined, seed: string | undefined) {
    if (!style || !seed) {
        return `https://api.dicebear.com/7.x/initials/svg?seed=User`;
    }
    return `https://api.dicebear.com/7.x/${style}/svg?seed=${seed}`;
}
