import AbstractSource from '../abstract.js'

/**
 * @typedef {import('../sources/index.js').TorrentQuery} TorrentQuery
 * @typedef {import('../sources/index.js').TorrentResult} TorrentResult
 */

export default new class PirateBay extends AbstractSource {
  base = 'https://torrent-search-api-livid.vercel.app/api/piratebay/'

  /**
   * @param {TorrentQuery} options
   * @returns {Promise<TorrentResult[]>}
   */
  async single({ titles, episode }) {
    console.log('[piratebaysrc] single() called with titles:', titles, 'episode:', episode)
    if (!titles?.length) {
      console.log('[piratebaysrc] No titles provided, returning empty')
      return []
    }
    return this._search(titles[0], episode)
  }

  /**
   * @param {TorrentQuery} options
   * @returns {Promise<TorrentResult[]>}
   */
  async batch(options) {
    return this.single(options)
  }

  /**
   * @param {TorrentQuery} options
   * @returns {Promise<TorrentResult[]>}
   */
  async movie(options) {
    console.log('[piratebaysrc] movie() called with options:', JSON.stringify({titles: options.titles, mediaType: options.mediaType}))
    return this.single(options)
  }

  /**
   * Internal search method
   * @param {string} title
   * @param {number} [episode]
   * @returns {Promise<TorrentResult[]>}
   */
  async _search(title, episode) {
    try {
      let query = title.replace(/[^\w\s-]/g, " ").trim()
      if (episode) query += ` ${episode.toString().padStart(2, "0")}`

      const url = this.base + encodeURIComponent(query)
      console.log('[piratebaysrc] Fetching from URL:', url)
      const res = await fetch(url)
      console.log('[piratebaysrc] Response status:', res.status, 'ok:', res.ok)
      if (!res.ok) {
        console.log('[piratebaysrc] Response not ok, throwing error')
        throw new Error(`HTTP ${res.status}: ${res.statusText}`)
      }

      const data = await res.json()
      console.log('[piratebaysrc] Got', Array.isArray(data) ? data.length : 0, 'results')
      if (!Array.isArray(data)) {
        console.log('[piratebaysrc] Data is not an array:', typeof data, data)
        throw new Error(`Expected array, got ${typeof data}`)
      }

      const results = data.map(item => ({
        title: item.Name,
        link: item.Magnet,
        hash: item.Magnet?.match(/btih:([A-Fa-f0-9]+)/)?.[1] || "",
        seeders: Number(item.Seeders || 0),
        leechers: Number(item.Leechers || 0),
        downloads: 0,  // Not provided by Pirate Bay API
        size: this._parseSize(item.Size),
        date: this._parseDate(item.DateUploaded),
        accuracy: "medium",
        type: "alt"
      })).slice(0, 30)  // Limit to top 30 results
      console.log('[piratebaysrc] Returning', results.length, 'results')
      return results
    } catch (error) {
      console.error('[piratebaysrc] Error in _search:', error.message, error.stack)
      throw error
    }
  }

  /**
   * Parse size string to bytes
   * @param {string} sizeStr - Size string like "1.85 GiB" or "500 MiB"
   * @returns {number} - Size in bytes
   */
  _parseSize(sizeStr) {
    if (!sizeStr) return 0
    
    const units = {
      'B': 1,
      'KiB': 1024,
      'MiB': 1024 ** 2,
      'GiB': 1024 ** 3,
      'TiB': 1024 ** 4,
      'KB': 1000,
      'MB': 1000 ** 2,
      'GB': 1000 ** 3,
      'TB': 1000 ** 4
    }

    const match = sizeStr.trim().match(/^([\d.]+)\s*([A-Za-z]+)$/)
    if (!match) return 0

    const value = parseFloat(match[1])
    const unit = match[2]
    const multiplier = units[unit] || 1

    return Math.floor(value * multiplier)
  }

  /**
   * Parse date string to Date object
   * Handles formats like "06-13 2012" or "04-15 2024" or "01-01 05:50"
   * @param {string} dateStr - Date string from API
   * @returns {Date} - Parsed date or current date if unparseable
   */
  _parseDate(dateStr) {
    if (!dateStr) return new Date()

    // Try format "MM-DD YYYY" or "MM-DD HH:MM"
    const dateMatch = dateStr.trim().match(/^(\d{2})-(\d{2})\s+(.+)$/)
    if (dateMatch) {
      const month = dateMatch[1]
      const day = dateMatch[2]
      const yearOrTime = dateMatch[3]

      // Check if it's a year (4 digits) or time (HH:MM)
      if (/^\d{4}$/.test(yearOrTime)) {
        // Format: MM-DD YYYY
        return new Date(`${yearOrTime}-${month}-${day}`)
      } else {
        // Format: MM-DD HH:MM - assume current year
        const currentYear = new Date().getFullYear()
        return new Date(`${currentYear}-${month}-${day}T${yearOrTime}`)
      }
    }

    // Fallback: try to parse as-is
    const parsed = new Date(dateStr)
    return isNaN(parsed.getTime()) ? new Date() : parsed
  }

  /**
   * Validates the source is reachable
   * @returns {Promise<boolean>}
   */
  async validate() {
    try {
      const res = await fetch(this.base + 'test')
      return res.ok
    } catch {
      return false
    }
  }
}()