import AbstractSource from '../abstract.js'

/**
 * @typedef {import('../sources/index.js').TorrentQuery} TorrentQuery
 * @typedef {import('../sources/index.js').TorrentResult} TorrentResult
 */

export default new class Nyaa extends AbstractSource {
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
    let query = title.replace(/[^\w\s-]/g, " ").trim()

    const url = this.base + encodeURIComponent(query)
    console.log("url:", url)
    console.log("updated")
    const res = await fetch(url)
    
    if (!res.ok) return []

    const data = await res.json()
    if (!Array.isArray(data)) return []

    return data.map(item => ({
      title: item.Name,
      link: item.Magnet,
      hash: item.Magnet?.match(/btih:([A-Fa-f0-9]+)/)?.[1] || "",
      seeders: Number(item.Seeders || 0),
      leechers: Number(item.Leechers || 0),
      downloads: Number(item.Downloads || 0),
      size: 0,
      date: new Date(item.DateUploaded),
      accuracy: "medium",
      type: "alt"
    }))
  }

  /**
   * Validates the source is reachable
   * @returns {Promise<boolean>}
   */
  async validate() {
    try {
      const res = await fetch(this.base + 'one%20piece')
      return res.ok
    } catch {
      return false
    }
  }
}()