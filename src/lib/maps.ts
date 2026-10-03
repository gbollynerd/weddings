/** Deep links into the major map apps for an address. Safe to use on server and client. */
export function mapLinks(address: string) {
  const q = encodeURIComponent(address);
  return {
    google: `https://www.google.com/maps/dir/?api=1&destination=${q}`,
    apple: `https://maps.apple.com/?daddr=${q}`,
    waze: `https://waze.com/ul?q=${q}&navigate=yes`,
    embed: `https://www.google.com/maps?q=${q}&output=embed`,
    view: `https://www.google.com/maps/search/?api=1&query=${q}`,
  };
}
