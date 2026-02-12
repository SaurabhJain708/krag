import fernet from "fernet";

export const encrypt_data = (data: string, key: string): string => {
  const secret = new fernet.Secret(key);
  const token = new fernet.Token({ secret, message: data, ttl: 0 });

  return token.encode();
};
