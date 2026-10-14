import { describe, expect, test, vi } from 'vitest'
import { deleteFile, keepFile, makeVoice, pickPhoto, unlock } from './reasonsMedia.js'

function fakeFS() {
  const files = new Set(['file:///tmp/pick.JPG', 'file:///tmp/rec.m4a'])
  class Directory { constructor(base, name) { this.uri = `${base.uri}${name}/`; this.exists = true } create() {} delete() {} }
  class File {
    constructor(a, b) { this.uri = b ? `${a.uri}${b}` : a }
    get exists() { return files.has(this.uri) }
    async copy(dest) { files.add(dest.uri) }
    delete() { files.delete(this.uri) }
  }
  return { files, Directory, File, Paths: { document: { uri: 'file:///docs/' } } }
}

describe('reasons media', () => {
  test('keepFile copies into reasons/ and keeps the extension', async () => {
    const FS = fakeFS()
    const uri = await keepFile(FS, 'file:///tmp/pick.JPG', 'jpg')
    expect(uri).toMatch(/^file:\/\/\/docs\/reasons\/.+\.jpg$/)
    expect(FS.files.has(uri)).toBe(true)
    expect(await keepFile(FS, 'blob:abc', 'jpg', true)).toBe('blob:abc')
    deleteFile(FS, uri)
    expect(FS.files.has(uri)).toBe(false)
  })
  test('pickPhoto: denied, cancelled, picked', async () => {
    const FS = fakeFS()
    const P = (granted, result) => ({ requestMediaLibraryPermissionsAsync: async () => ({ granted }), launchImageLibraryAsync: vi.fn(async () => result) })
    expect(await pickPhoto(P(false), FS, false)).toEqual({ uri: null, denied: true })
    expect(await pickPhoto(P(true, { canceled: true }), FS, false)).toEqual({ uri: null })
    expect((await pickPhoto(P(true, { canceled: false, assets: [{ uri: 'file:///tmp/pick.JPG' }] }), FS, false)).uri).toMatch(/reasons\//)
  })
  test('voice: records, stops, keeps the file', async () => {
    const FS = fakeFS()
    const recorder = { prepareToRecordAsync: vi.fn(async () => {}), record: vi.fn(), stop: vi.fn(async () => {}), uri: 'file:///tmp/rec.m4a' }
    const Audio = {
      RecordingPresets: { HIGH_QUALITY: { extension: '.m4a', sampleRate: 44100, numberOfChannels: 2, bitRate: 128000, ios: { audioQuality: 127 } } },
      requestRecordingPermissionsAsync: async () => ({ granted: true }), setAudioModeAsync: vi.fn(async () => {}),
      AudioModule: { AudioRecorder: vi.fn(function (o) { this.o = o; return recorder }) },
      createAudioPlayer: vi.fn(() => ({ play: vi.fn(), pause: vi.fn() })),
    }
    const v = makeVoice(Audio, FS, { OS: 'ios' })
    expect(await v.stop()).toBeNull()
    expect(await v.start()).toBe(true)
    expect(Audio.AudioModule.AudioRecorder.mock.calls[0][0]).toMatchObject({ audioQuality: 127, sampleRate: 44100 })
    const r = await v.stop()
    expect(r.uri).toMatch(/reasons\/.+\.m4a$/)
    expect(recorder.stop).toHaveBeenCalled()
    v.play(r.uri); expect(Audio.createAudioPlayer).toHaveBeenCalledWith(r.uri)
    const denied = makeVoice({ ...Audio, requestRecordingPermissionsAsync: async () => ({ granted: false }) }, FS, { OS: 'ios' })
    expect(await denied.start()).toBe(false)
  })
  test('unlock: no Face ID set up lets you through; cancel keeps it locked', async () => {
    expect(await unlock({ hasHardwareAsync: async () => false })).toBe(true)
    const LA = (success) => ({ hasHardwareAsync: async () => true, isEnrolledAsync: async () => true, authenticateAsync: async () => ({ success }) })
    expect(await unlock(LA(true))).toBe(true)
    expect(await unlock(LA(false))).toBe(false)
  })
})
