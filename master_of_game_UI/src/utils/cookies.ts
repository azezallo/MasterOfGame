export const setCookie = (name: string, value: string, options: { expires?: number; path?: string } = {}) => {
  let expires = '';
  if (options.expires) {
    const date = new Date();
    date.setTime(date.getTime() + options.expires * 24 * 3600 * 1000);
    expires = `; expires=${date.toUTCString()}`;
  }
  document.cookie = `${name}=${value}${expires}${options.path ? `; path=${options.path}` : ''}; SameSite=Lax;`;
};

export const getCookie = (name: string): string | undefined => {
  const value = `; ${document.cookie}`;
  const parts = value.split(';');
  for (let i = 0; i < parts.length; i++) {
    const cookie = parts[i].trim();
    if (cookie.startsWith(`${name}=`)) {
      return cookie.substring(name.length + 1);
    }
  }
  return undefined;
};
