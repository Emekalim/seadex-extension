export type Speed = 'fast' | 'moderate' | 'slow'
export type Accuracy = 'high' | 'medium' | 'low'
export type TorrentType = 'batch' | 'best' | 'alt'
export type MediaType = 'anime' | 'tv' | 'movie'

/**
 * Unified media identifiers from multiple providers
 * Sources can declare which ID types they support
 */
export interface MediaIds {
    anilist?: number
    mal?: number
    anidb?: number
    imdb?: string
    tmdb?: number
    tvdb?: number
    trakt?: number
    slug?: string
}

export interface TorrentResult {
    title: string
    link: string
    hash: string
    seeders: number
    leechers: number
    downloads: number
    size: number
    date: Date
    accuracy?: Accuracy
    type?: TorrentType
}

export interface TorrentQuery {
    // ===== NEW FIELDS - Multi-media support =====
    
    /**
     * Media type - what kind of content to search for
     * DEFAULT: 'anime' (for backward compatibility)
     */
    mediaType?: MediaType
    
    /**
     * Unified media identifiers from multiple providers
     * Sources filter to only IDs they support
     */
    ids?: Partial<MediaIds>
    
    /**
     * Release/broadcast year
     * Useful for disambiguation when multiple media have same title
     */
    year?: number
    
    /**
     * TV show specific: season number
     * Used with episode field to target specific S##E## releases
     */
    season?: number
    
    /**
     * Quality/resolution preference
     * Examples: '2160', '1080', '720', '480', ''
     */
    resolution?: '2160' | '1080' | '720' | '540' | '480' | ''
    
    /**
     * Terms/keywords to exclude from results
     * Examples: ['x264', 'hardsubbed', 'dubbed', 'CAM', 'DTS']
     */
    exclusions?: string[]

    // ===== EXISTING FIELDS - Kept for compatibility =====
    
    /**
     * Search titles - always provided
     * Array of possible titles in different languages/formats
     */
    titles: string[]
    
    /**
     * Episode number (anime/TV)
     * For anime: 1-12 typically per season
     * For TV: absolute episode number or specific with season field
     */
    episode?: number
    
    /**
     * Total episode count (for validation)
     * Useful for checking if requested episode exists
     */
    episodeCount?: number

    // ===== DEPRECATED FIELDS - Backward compatibility only =====
    // Use ids.anilist, ids.mal, ids.anidb instead
    
    /**
     * @deprecated Use ids.anilist instead
     */
    anilistId?: number
    
    /**
     * @deprecated Use ids.anidb instead
     */
    anidbAid?: number
    
    /**
     * @deprecated Use ids.anidb instead (for episode mapping)
     */
    anidbEid?: number
}

export type SearchFunction = (query: TorrentQuery) => Promise<TorrentResult[]>

export abstract class TorrentSource {
    abstract single: SearchFunction
    abstract batch: SearchFunction
    abstract movie: SearchFunction
    abstract validate(): Promise<boolean>
}