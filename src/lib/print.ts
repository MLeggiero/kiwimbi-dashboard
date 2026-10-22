// Printing. 'report' prints the impact report for the dates on the timeline (src/print);
// 'page' prints the dashboard page on screen. <html data-print="…"> tells the print styles
// which one to show (see app.css), so the browser's own Print command works too.

export type PrintTarget = 'report' | 'page';

/** Wait for images that are still loading (photos, the logo), but never longer than `ms`. */
export async function waitForImages(root: ParentNode | null, ms = 4000): Promise<void> {
  if (!root) return;
  const pending = [...root.querySelectorAll('img')].filter((img) => !img.complete);
  if (!pending.length) return;
  const loaded = pending.map(
    (img) =>
      new Promise<void>((resolve) => {
        img.addEventListener('load', () => resolve(), { once: true });
        img.addEventListener('error', () => resolve(), { once: true });
      }),
  );
  await Promise.race([Promise.all(loaded), new Promise<void>((resolve) => setTimeout(resolve, ms))]);
}
