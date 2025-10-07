export const hash = async (data: string) => `hashed:${data}`;
export const compare = async (data: string, hashed: string) => hashed === `hashed:${data}`;
export default { hash, compare };
