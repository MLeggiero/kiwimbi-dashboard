/** In-page links. Scrolls directly, since the app runs inside Apps Script's frame. */
export function jumpTo(e: Event, id: string): void {
  e.preventDefault();
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
