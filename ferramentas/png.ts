// PNG sem dependências: lê RGB e RGBA de 8 bits (sem entrelaçamento), que é o que os geradores de imagem entregam,
// e grava RGBA. Usado pelas ferramentas de importação; o jogo carrega as imagens pelo navegador.

import { deflateSync, inflateSync } from 'node:zlib';

export interface Imagem {
  largura: number;
  altura: number;
  /** RGBA, 4 bytes por pixel, linha a linha. */
  dados: Uint8Array;
}

const ASSINATURA = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

export function lerPng(arquivo: Uint8Array): Imagem {
  const b = Buffer.from(arquivo);
  if (!b.subarray(0, 8).equals(ASSINATURA)) throw new Error('não é um PNG');
  let largura = 0;
  let altura = 0;
  let canais = 0;
  const idat: Buffer[] = [];
  for (let p = 8; p < b.length; ) {
    const n = b.readUInt32BE(p);
    const tipo = b.toString('latin1', p + 4, p + 8);
    const corpo = b.subarray(p + 8, p + 8 + n);
    if (tipo === 'IHDR') {
      largura = corpo.readUInt32BE(0);
      altura = corpo.readUInt32BE(4);
      const bits = corpo[8]!;
      const cor = corpo[9]!;
      const entrelacado = corpo[12]!;
      if (bits !== 8 || (cor !== 2 && cor !== 6) || entrelacado) throw new Error(`PNG não suportado (bits ${bits}, cor ${cor}, entrelaçado ${entrelacado}): use RGB ou RGBA de 8 bits`);
      canais = cor === 6 ? 4 : 3;
    } else if (tipo === 'IDAT') idat.push(corpo);
    else if (tipo === 'IEND') break;
    p += 12 + n;
  }
  const cru = inflateSync(Buffer.concat(idat));
  const linha = largura * canais;
  const pixels = new Uint8Array(largura * altura * canais);
  for (let y = 0; y < altura; y++) {
    const filtro = cru[y * (linha + 1)]!;
    const ini = y * (linha + 1) + 1;
    for (let i = 0; i < linha; i++) {
      const a = i >= canais ? pixels[y * linha + i - canais]! : 0;
      const c = y > 0 ? pixels[(y - 1) * linha + i]! : 0;
      const ac = y > 0 && i >= canais ? pixels[(y - 1) * linha + i - canais]! : 0;
      const x = cru[ini + i]!;
      let v: number;
      switch (filtro) {
        case 0:
          v = x;
          break;
        case 1:
          v = x + a;
          break;
        case 2:
          v = x + c;
          break;
        case 3:
          v = x + ((a + c) >> 1);
          break;
        case 4: {
          const p0 = a + c - ac;
          const pa = Math.abs(p0 - a);
          const pb = Math.abs(p0 - c);
          const pc = Math.abs(p0 - ac);
          v = x + (pa <= pb && pa <= pc ? a : pb <= pc ? c : ac);
          break;
        }
        default:
          throw new Error(`filtro de PNG desconhecido: ${filtro}`);
      }
      pixels[y * linha + i] = v & 255;
    }
  }
  if (canais === 4) return { largura, altura, dados: pixels };
  const dados = new Uint8Array(largura * altura * 4);
  for (let i = 0; i < largura * altura; i++) {
    dados[i * 4] = pixels[i * 3]!;
    dados[i * 4 + 1] = pixels[i * 3 + 1]!;
    dados[i * 4 + 2] = pixels[i * 3 + 2]!;
    dados[i * 4 + 3] = 255;
  }
  return { largura, altura, dados };
}

const TABELA_CRC = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(b: Buffer): number {
  let c = 0xffffffff;
  for (const x of b) c = TABELA_CRC[(c ^ x) & 255]! ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function pedaco(tipo: string, corpo: Buffer): Buffer {
  const n = Buffer.alloc(4);
  n.writeUInt32BE(corpo.length);
  const tc = Buffer.concat([Buffer.from(tipo, 'latin1'), corpo]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(tc));
  return Buffer.concat([n, tc, crc]);
}

export function gravarPng(im: Imagem): Buffer {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(im.largura, 0);
  ihdr.writeUInt32BE(im.altura, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  const linha = im.largura * 4;
  const cru = Buffer.alloc((linha + 1) * im.altura);
  for (let y = 0; y < im.altura; y++) Buffer.from(im.dados.buffer, im.dados.byteOffset + y * linha, linha).copy(cru, y * (linha + 1) + 1);
  return Buffer.concat([ASSINATURA, pedaco('IHDR', ihdr), pedaco('IDAT', deflateSync(cru, { level: 9 })), pedaco('IEND', Buffer.alloc(0))]);
}
