/**
 * Svelte action that adds roving tabindex to a container with role="listbox".
 * Only the focused option has tabindex="0"; all others get tabindex="-1".
 * Arrow keys navigate between options, Home/End jump to first/last.
 */
export function rovingTabindex(node: HTMLElement) {
	function getOptions(): HTMLElement[] {
		return Array.from(node.querySelectorAll('[role="option"]:not([disabled])'));
	}

	function initTabindexes() {
		const options = getOptions();
		if (options.length === 0) return;

		// Find the selected or first option
		const selected = options.find((el) => el.getAttribute('aria-selected') === 'true');
		const active = selected ?? options[0];

		for (const opt of options) {
			opt.setAttribute('tabindex', opt === active ? '0' : '-1');
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		const options = getOptions();
		if (options.length === 0) return;

		const currentIndex = options.findIndex((el) => el === document.activeElement);
		if (currentIndex === -1) return;

		let nextIndex: number | null = null;

		switch (e.key) {
			case 'ArrowDown':
			case 'ArrowRight':
				nextIndex = (currentIndex + 1) % options.length;
				break;
			case 'ArrowUp':
			case 'ArrowLeft':
				nextIndex = (currentIndex - 1 + options.length) % options.length;
				break;
			case 'Home':
				nextIndex = 0;
				break;
			case 'End':
				nextIndex = options.length - 1;
				break;
			default:
				return;
		}

		if (nextIndex !== null) {
			e.preventDefault();
			options[currentIndex].setAttribute('tabindex', '-1');
			options[nextIndex].setAttribute('tabindex', '0');
			options[nextIndex].focus();
		}
	}

	// Initialize on mount and observe changes (for dynamic lists)
	initTabindexes();
	node.addEventListener('keydown', handleKeydown);

	const observer = new MutationObserver(() => {
		// Re-initialize when children change
		requestAnimationFrame(initTabindexes);
	});
	observer.observe(node, { childList: true, subtree: true });

	return {
		destroy() {
			node.removeEventListener('keydown', handleKeydown);
			observer.disconnect();
		}
	};
}
