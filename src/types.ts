export interface TagMap {
  [category: string]: string[] | string
}

export interface TagLink {
  label: string
  url: string
}

export interface TagMetadata {
  name: string
  intro: string
  links: TagLink[]
}

export interface TagAnalysis {
  totalTags: number
  taggedMangaCount: number
  translationCoverage: number
  namespaceCounts: Record<string, number>
  topTags: Array<{
    namespace: string
    tag: string
    name?: string
    intro?: string
    count: number
  }>
  topAuthors: Array<{
    tag: string
    name?: string
    count: number
  }>
  cooccurrence: {
    tags: Array<{ namespace: string; tag: string; name?: string; intro?: string }>
    matrix: number[][]
  }
}

export interface TagMetadataStatus {
  loaded: boolean
  version?: number
  repo?: string
  headSha?: string
  headMessage?: string
  updatedAt?: string
  fileMtime?: string | null
  lastRefreshSuccessAt?: string | null
  lastRefreshError?: string | null
  isRefreshing: boolean
  namespaces: number
  totalEntries: number
}

export interface Manga {
  id: string
  title: string | null
  titleJpn: string | null
  coverPath: string | null
  hash: string | null
  filepath: string | null
  type: string | null
  pageCount: number | null
  bundleSize: number | null
  mtime: string | null
  coverHash: string | null
  status: string | null
  date: string | null
  rating: number | null
  tags: TagMap | null
  filecount: number | null
  posted: number | null
  filesize: number | null
  category: string | null
  url: string | null
  mark: boolean | null
  hiddenBook: boolean | null
  readCount: number | null
  currentPage: number | null
  createdAt: string | null
  updatedAt: string | null
  uploadDate: string | null
  exist: boolean | null
  tagMeta?: Record<string, Record<string, TagMetadata>> | null
}

export interface MangaListResponse {
  items: Manga[]
  pagination: {
    page: number
    pageSize: number
    total: number
    totalPages: number
  }
}

export type ReaderMode = 'single' | 'double' | 'scroll'
export type FitMode = 'width' | 'height' | 'window'

export type SortField =
  | 'mtime'
  | 'createdAt'
  | 'updatedAt'
  | 'uploadDate'
  | 'rating'
  | 'readCount'
  | 'bundleSize'
  | 'pageCount'
  | 'title'
