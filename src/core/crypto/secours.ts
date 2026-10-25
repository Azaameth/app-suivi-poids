import { randomBytes } from './encoding'
import { desenvelopper, envelopper, unlockDataKey, type KeyMeta } from './keys'

/**
 * Code de secours (D48) : 160 bits aléatoires, en base32 Crockford (sans O/0 ni I/1/L ambigus),
 * affiché en 8 groupes de 4 : `K7Q2-…`. Il encapsule la même clé de données que la phrase :
 * en cas d'oubli de la phrase, il permet d'en choisir une nouvelle sans perdre les données.
 */
const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'
const LONGUEUR = 32

export class InvalidRecoveryCodeError extends Error {
  constructor() {
    super('Code de secours mal formé : 32 caractères (8 groupes de 4).')
    this.name = 'InvalidRecoveryCodeError'
  }
}

export class WrongRecoveryCodeError extends Error {
  constructor() {
    super('Code de secours incorrect')
    this.name = 'WrongRecoveryCodeError'
  }
}

export class NoRecoveryCodeError extends Error {
  constructor() {
    super('Aucun code de secours n’a été créé pour ce compte')
    this.name = 'NoRecoveryCodeError'
  }
}

export function genererCodeSecours(): string {
  let bits = 0
  let valeur = 0
  let code = ''
  for (const octet of randomBytes((LONGUEUR * 5) / 8)) {
    valeur = (valeur << 8) | octet
    bits += 8
    while (bits >= 5) {
      code += ALPHABET[(valeur >>> (bits - 5)) & 31]
      bits -= 5
    }
  }
  return code.match(/.{4}/g)!.join('-')
}

/** Saisie tolérante : minuscules, espaces, tirets, O→0, I/L→1. Lève si le code est mal formé. */
export function normaliserCode(saisie: string): string {
  const brut = saisie.toUpperCase().replace(/[\s-]/g, '').replace(/O/g, '0').replace(/[IL]/g, '1')
  if (brut.length !== LONGUEUR || [...brut].some((c) => !ALPHABET.includes(c))) {
    throw new InvalidRecoveryCodeError()
  }
  return brut
}

/** Ajoute (ou remplace) l'encapsulation par un nouveau code ; l'ancien code devient inutile. */
export async function ajouterCodeSecours(
  passphrase: string,
  meta: KeyMeta,
  code: string,
): Promise<KeyMeta> {
  const key = await unlockDataKey(passphrase, meta, { extractable: true })
  return { ...meta, secours: await envelopper(key, normaliserCode(code)) }
}

/** Décapsule la clé de données avec le code de secours. */
export function deverrouillerAvecCode(
  code: string,
  meta: KeyMeta,
  { extractable = false } = {},
): Promise<CryptoKey> {
  if (!meta.secours) throw new NoRecoveryCodeError()
  return desenvelopper(normaliserCode(code), meta.secours, {
    extractable,
    mauvaisSecret: () => new WrongRecoveryCodeError(),
  })
}

/** Phrase oubliée : nouvelle phrase choisie grâce au code (qui reste valable). */
export async function remplacerPhraseAvecCode(
  code: string,
  nouvellePhrase: string,
  meta: KeyMeta,
): Promise<KeyMeta> {
  const key = await deverrouillerAvecCode(code, meta, { extractable: true })
  return { ...meta, ...(await envelopper(key, nouvellePhrase)) }
}
