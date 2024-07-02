export function base64UrlDecode(base64Url: string): ArrayBuffer {
  // Convert base64url to base64 by replacing characters
  const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')

  // Pad with '=' if needed
  const padding = '='.repeat((4 - (base64.length % 4)) % 4)
  const base64Padded = base64 + padding

  // Decode base64 to binary string
  const binaryString = atob(base64Padded)

  // Convert binary string to Uint8Array
  const uint8Array = new Uint8Array(binaryString.length)
  for (let i = 0; i < binaryString.length; i++) {
    uint8Array[i] = binaryString.charCodeAt(i)
  }

  return uint8Array.buffer.slice(0) as ArrayBuffer
}

const MONTHS = 'Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec'.split(' ')

export function renderTimestamp() {
  const date = new Date()
  const month = MONTHS[date.getMonth()]
  const day = date.getDate()
  const year = date.getFullYear()

  let hours = date.getHours()
  const minutes = date.getMinutes()

  const ampm = hours >= 12 ? 'pm' : 'am'
  hours = hours % 12
  hours = hours ? hours : 12 // the hour '0' should be '12'

  const minutesStr = minutes < 10 ? '0' + minutes : minutes.toString()

  return `${month} ${day} ${year} ${hours}:${minutesStr}${ampm}`
}
