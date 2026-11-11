/** Native showModal supplies inertness; explicitly restore scroll and focus on
 * every close/unmount path, including React's effect setup/cleanup cycle. */
export function openGalleryDialog(dialog: HTMLDialogElement, returnFocus: HTMLElement | null): () => void {
  const document = dialog.ownerDocument;
  const oldOverflow = document.body.style.overflow;
  if (!dialog.open) dialog.showModal();
  document.body.style.overflow = 'hidden';
  dialog.querySelector<HTMLButtonElement>('button')?.focus({ preventScroll: true });
  let cleanedUp = false;
  return () => {
    if (cleanedUp) return;
    cleanedUp = true;
    if (dialog.open) dialog.close();
    document.body.style.overflow = oldOverflow;
    if (returnFocus?.isConnected) returnFocus.focus({ preventScroll: true });
  };
}

export function trapGalleryFocus(event: Pick<KeyboardEvent, 'key' | 'shiftKey' | 'preventDefault'>, dialog: HTMLDialogElement): void {
  if (event.key !== 'Tab') return;
  const elements = Array.from(dialog.querySelectorAll<HTMLElement>('button:not(:disabled), [tabindex="0"]'));
  const first = elements[0];
  const last = elements[elements.length - 1];
  const active = dialog.ownerDocument.activeElement;
  if (!first) { event.preventDefault(); dialog.focus(); }
  else if (!elements.includes(active as HTMLElement)) { event.preventDefault(); (event.shiftKey ? last : first).focus(); }
  else if (event.shiftKey && active === first) { event.preventDefault(); last.focus(); }
  else if (!event.shiftKey && active === last) { event.preventDefault(); first.focus(); }
}
