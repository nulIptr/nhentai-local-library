export interface TagMap {
  [category: string]: string[]
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
  date: number | null
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
  exist: boolean | null
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
  | 'date'
  | 'mtime'
  | 'posted'
  | 'rating'
  | 'readCount'
  | 'bundleSize'
  | 'pageCount'
  | 'title'
