import { describe, expect, it } from 'bun:test'
import { parseArchiveMetadata, parseUploadDate } from '../zip.ts'

describe('parseArchiveMetadata', () => {
  it('unwraps gallery_info and normalizes its tags', () => {
    expect(
      parseArchiveMetadata({
        gallery_info: {
          title: ' Gallery ',
          title_title_original: ' Original ',
          category: 'doujinshi',
          link: 'https://exhentai.org/g/1/token/',
          translated: true,
          tags: {
            language: [' english ', 'english', '', 1],
            female: ['schoolgirl', 'schoolgirl', '  '],
            invalid: 'not-an-array'
          }
        }
      })
    ).toEqual({
      title: 'Gallery',
      titleJpn: 'Original',
      category: 'doujinshi',
      url: 'https://exhentai.org/g/1/token/',
      tags: { language: ['english', 'translated'], female: ['schoolgirl'] }
    })
  })

  it('supports root metadata aliases', () => {
    expect(
      parseArchiveMetadata({
        title: 'Gallery',
        title_jpn: 'Original',
        url: 'https://example.test/gallery',
        tags: { artist: ['hiten'] }
      })
    ).toEqual({
      title: 'Gallery',
      titleJpn: 'Original',
      url: 'https://example.test/gallery',
      tags: { artist: ['hiten'] }
    })
  })

  it('ignores invalid or irrelevant metadata', () => {
    expect(parseArchiveMetadata(undefined)).toBeUndefined()
    expect(parseArchiveMetadata({ tags: { artist: 'hiten' } })).toBeUndefined()
    expect(parseArchiveMetadata({ unrelated: true })).toBeUndefined()
  })

  it('drops blank tag namespaces', () => {
    expect(parseArchiveMetadata({ tags: { '  ': ['ignored'], artist: ['hiten'] } })).toEqual({
      tags: { artist: ['hiten'] }
    })
  })

  it('adds translated when language tags are otherwise absent', () => {
    expect(parseArchiveMetadata({ gallery_info: { translated: true, tags: {} } })).toEqual({
      tags: { language: ['translated'] }
    })
  })

  it('parses gallery upload_date as a UTC ISO timestamp', () => {
    expect(parseUploadDate([2023, 1, 9, 23, 51, 5])).toBe('2023-01-09T23:51:05.000Z')
    expect(parseArchiveMetadata({ gallery_info: { upload_date: [2023, 1, 9, 23, 51, 5] } })).toEqual({
      uploadDate: '2023-01-09T23:51:05.000Z'
    })
  })

  it('rejects malformed upload_date values', () => {
    expect(parseUploadDate([2023, 2, 29, 0, 0, 0])).toBeUndefined()
    expect(parseUploadDate([2023, 1, 1])).toBeUndefined()
    expect(parseUploadDate([2023, 1, 1, 0, 0, '0'])).toBeUndefined()
  })
})
