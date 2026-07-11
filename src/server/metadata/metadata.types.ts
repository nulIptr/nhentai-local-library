export interface Metadata {
    repo: string
    head: Head
    version: number
    data: Daum[]
}

export interface Head {
    sha: string
    message: string
    author: Author
    committer: Committer
}

export interface Author {
    name: string
    email: string
    when: string
}

export interface Committer {
    name: string
    email: string
    when: string
}

export interface Daum {
    namespace: string
    frontMatters: FrontMatters
    count: number
    data: Record<string, {
        name: string
        intro: string
        links: string
    }>
}

export interface FrontMatters {
    name: string
    description: string
    key: string
    rules: string[]
    abbr?: string
    copyright?: string
    aliases?: string[]
    example?: Example
}

export interface Example {
    raw: string
    name: string
    intro: string
    links: string
}