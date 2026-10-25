import { expect, test } from 'vitest'
import {
  EmailDejaUtiliseError,
  IdentifiantsInvalidesError,
  MotDePasseFaibleError,
} from '../../core'
import { traduireErreurAuth } from './erreursAuth'

const erreur = (code: string) => Object.assign(new Error(code), { code })

test('codes Firebase traduits en erreurs métier, les autres inchangés', () => {
  expect(traduireErreurAuth(erreur('auth/invalid-credential'))).toBeInstanceOf(
    IdentifiantsInvalidesError,
  )
  expect(traduireErreurAuth(erreur('auth/invalid-email'))).toBeInstanceOf(
    IdentifiantsInvalidesError,
  )
  expect(traduireErreurAuth(erreur('auth/email-already-in-use'))).toBeInstanceOf(
    EmailDejaUtiliseError,
  )
  expect(traduireErreurAuth(erreur('auth/weak-password'))).toBeInstanceOf(MotDePasseFaibleError)
  const reseau = erreur('auth/network-request-failed')
  expect(traduireErreurAuth(reseau)).toBe(reseau)
})
