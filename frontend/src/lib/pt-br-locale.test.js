import { describe, expect, test } from 'vitest'
import { createHash } from 'node:crypto'
import pt from '../locales/pt.js'
import ptBR, { PT_BR_OVERRIDES } from '../locales/pt-BR.js'
import { DATE_LOCALES, LANGS } from './i18n-core.js'

const placeholders = value => [...String(value).matchAll(/\{\d+\}/g)].map(match => match[0]).sort()
const byCodeUnit = ([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)

describe('Brazilian Portuguese locale', () => {
  test('is a separately selectable locale with Brazilian date formatting', () => {
    expect(LANGS.pt).toBe('Português (Portugal)')
    expect(LANGS['pt-BR']).toBe('Português (Brasil)')
    expect(DATE_LOCALES['pt-BR']).toBe('pt-BR')
  })

  test('matches the source key set and preserves interpolation placeholders', () => {
    expect(Object.keys(ptBR).sort()).toEqual(Object.keys(pt).sort())
    for (const [source, translated] of Object.entries(ptBR)) {
      expect(placeholders(translated), source).toEqual(placeholders(source))
    }
  })

  test('makes every inherited pt-PT value an explicit reviewed snapshot', () => {
    const inherited = Object.entries(pt)
      .filter(([key]) => !(key in PT_BR_OVERRIDES))
      .sort(byCodeUnit)
    const fingerprint = createHash('sha256').update(JSON.stringify(inherited)).digest('hex')

    // 291 -> 292: kunci catatan waktu salat masuk PT_BR_OVERRIDES, karena dia memang
    // berbeda regional — Portugal menulis "Ramadão", Brasil "Ramadã". Ditaruh di overrides
    // dan bukan ditempel di ekor default export, supaya dia tidak TERLIHAT diwarisi padahal
    // sebenarnya di-override; itu justru drift yang tes ini ada untuk menangkapnya.
    expect(Object.keys(PT_BR_OVERRIDES)).toHaveLength(292)
    // 449 -> 452 -> 457. Dua gelombang:
    //   +3  demo gerakan ('also', 'start position', 'end position')
    //   +5  waktu salat ('Prayer times', 'Prayer city', 'Imsak', 'tomorrow', '{0} now')
    // Semuanya ditambahkan ke pt DAN pt-BR dengan nilai identik, jadi masuk sebagai warisan.
    // Kunci catatan waktu salat TIDAK ada di sini — dia jadi override, lihat di atas.
    // Selisihnya cocok tanpa sisa: itu reviewnya. Hash diambil dari
    // scripts/pt-br-inheritance-fingerprint.mjs, bukan ditempel dari pesan kegagalan.
    expect(inherited).toHaveLength(457)
    // If this fails, review the changed keys and wording before accepting a new hash. From
    // frontend/: node scripts/pt-br-inheritance-fingerprint.mjs --list
    expect(fingerprint, 'pt-PT inheritance changed; review the inherited pt-BR wording').toBe('0e2b96c501f16f28dd4895626c372f57be918c6d1cb3008220bca02756427cf6')
  })

  test('does not leak European Portuguese UI terms', () => {
    const text = Object.values(ptBR).join('\n')
    const europeanPortuguese = /(?:^|[^\p{L}])(?:ficheiro\p{L}*|telemóvel\p{L}*|ecrã\p{L}*|regist(?:o|am|ado|ada|ados|adas)|eliminad\p{L}*|definições|cronómetro|detetad\p{L}*|gémeos|abdómen|anca|coifa dos rotadores|escadora|completaste|acabaste|aguentas|definires|completares|aguenta|aguentaste|ficaste|viajares)(?=$|[^\p{L}])/iu
    expect(text).not.toMatch(europeanPortuguese)
    expect(text).not.toMatch(/[«»]/u)
    expect(ptBR.Save).toBe('Salvar')
    expect(ptBR.Settings).toBe('Configurações')
    expect(ptBR['Delete workout']).toBe('Excluir treino')
    expect(ptBR.Superset).toBe('Superset')
    expect(ptBR['Guest mode — data lives only in this browser.']).toContain('visitante')
    expect(ptBR['Sign in with passkey']).toContain('chave de acesso')
    expect(ptBR.band).toBe('elástico')
    expect(ptBR['resistance band']).toBe('faixa elástica')
    expect(ptBR.soleus).toBe('sóleo')
    expect(ptBR.Unpair).toBe('Desvincular')
    expect(ptBR['Starter plan loaded — Mon Push · Wed Pull · Fri Legs']).toContain('Seg Push · Qua Pull')
  })
})
