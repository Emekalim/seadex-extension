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
    if (!titles?.length) return []
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
      const res = await fetch(url)
      
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`)
      }

      const data = await res.json()
      if (!Array.isArray(data)) {
        throw new Error(`Expected array, got ${typeof data}`)
      }

      const results = data.map(item => {
        try {
          return {
            title: item.Name,
            link: item.Magnet,
            hash: item.Magnet?.match(/btih:([A-Fa-f0-9]+)/)?.[1] || "",
            seeders: Number(item.Seeders || 0),
            leechers: Number(item.Leechers || 0),
            downloads: 0,
            size: this._parseSize(item.Size),
            date: this._parseDate(item.DateUploaded),
            accuracy: "medium",
            type: "alt"
          }
        } catch (itemError) {
          console.warn('[piratebaysrc] Failed to parse item:', item.Name, itemError.message)
          return null
        }
      }).filter(item => item !== null).slice(0, 30)
      
      return results
    } catch (error) {
      console.error('[piratebaysrc] Error in _search:', error.message)
      throw error
    }
  }

  /**
   * Parse size string to bytes
   * @param {string} sizeStr - Size string like "1.85 GiB" or "500 MiB"
   * @returns {number} - Size in bytes
   */
  _parseSize(sizeStr) {
    try {
      if (!sizeStr || typeof sizeStr !== 'string') return 0
      
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
      if (isNaN(value)) return 0
      const unit = match[2]
      const multiplier = units[unit] || 1

      return Math.floor(value * multiplier)
    } catch (e) {
      console.warn('[piratebaysrc] Error parsing size:', sizeStr, e.message)
      return 0
    }
  }

  /**
   * Parse date string to Date object
   * Handles formats like "06-13 2012" or "04-15 2024" or "01-01 05:50"
   * @param {string} dateStr - Date string from API
   * @returns {Date} - Parsed date or current date if unparseable
   */
  _parseDate(dateStr) {
    try {
      if (!dateStr || typeof dateStr !== 'string') return new Date()

      // Try format "MM-DD YYYY" or "MM-DD HH:MM"
      const dateMatch = dateStr.trim().match(/^(\d{2})-(\d{2})\s+(.+)$/)
      if (dateMatch) {
        const month = dateMatch[1]
        const day = dateMatch[2]
        const yearOrTime = dateMatch[3]

        // Check if it's a year (4 digits) or time (HH:MM)
        if (/^\d{4}$/.test(yearOrTime)) {
          // Format: MM-DD YYYY
          const parsed = new Date(`${yearOrTime}-${month}-${day}`)
          if (!isNaN(parsed.getTime())) return parsed
        } else {
          // Format: MM-DD HH:MM - assume current year
          const currentYear = new Date().getFullYear()
          const parsed = new Date(`${currentYear}-${month}-${day}T${yearOrTime}`)
          if (!isNaN(parsed.getTime())) return parsed
        }
      }

      // Fallback: try to parse as-is
      const parsed = new Date(dateStr)
      return isNaN(parsed.getTime()) ? new Date() : parsed
    } catch (e) {
      console.warn('[piratebaysrc] Error parsing date:', dateStr, e.message)
      return new Date()
    }
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