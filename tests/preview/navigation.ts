// Local preview navigation; never silently discard a navigation request.
const router = {
  push(href: string) { window.location.assign(href); },
  replace(href: string) { window.location.replace(href); },
  refresh() { window.location.reload(); },
  back() { window.history.back(); },
};
export function usePathname() { return window.location.pathname; }
export function useRouter() { return router; }
