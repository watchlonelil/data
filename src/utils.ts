export function getRootDomain(url: string): string {
  const urlObj = new URL(url);
  const domainParts = urlObj.hostname.split(".").reverse();
  if (domainParts.length >= 2) {
    return `${domainParts[1]}.${domainParts[0]}`;
  }
  return urlObj.hostname;
}
