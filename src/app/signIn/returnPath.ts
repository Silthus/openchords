const pathOnThisSite = /^\/(?![/\\])/;

export function returnPath(to: string | undefined) {
  return to !== undefined && pathOnThisSite.test(to) ? to : "/";
}
