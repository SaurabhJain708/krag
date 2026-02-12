import fernet from "fernet";

export const decrypt_data = (data: string, key: string): string => {
  const secret = new fernet.Secret(key);
  const token = new fernet.Token({ secret, token: data, ttl: 0 });
  return token.decode();
};
