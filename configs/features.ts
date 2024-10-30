export type Project = {
  name: string;
  desc: string;
  link: string;
};

export const products: Project[] = [];

export const dependencies: Project[] = [
  {
    name: 'POSTHUMAN',
    desc: 'Decentralized validator and our frends.',
    link: 'https://posthuman.digital/',
  },
  {
    name: 'КриптоБаза | PHMN',
    desc: 'The best crypto community.',
    link: 'https://t.me/Crypto_Base_Chat',
  },
  {
    name: 'RESP-chat Pass',
    desc: 'Pass to the chat of Posthuman RESP owners.',
    link: 'https://resp-pass.iiiyjiep.ru/',
  },
];
