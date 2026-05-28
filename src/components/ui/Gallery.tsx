import { useEffect, useRef, useState } from 'preact/hooks';
import { type ComponentChildren } from 'preact';
import { Icon } from './Icon';

type Props = {
	images: string[];
	alt?: string;
	onRemove?: (idx: number) => void;
	trailing?: ComponentChildren;
};

export function Gallery({ images, alt, onRemove, trailing }: Props) {
	const dialogRef = useRef<HTMLDialogElement>(null);
	const [active, setActive] = useState(0);
	const [open, setOpen] = useState(false);

	function show(idx: number) {
		setActive(idx);
		dialogRef.current?.showModal();
		setOpen(true);
	}

	function close() {
		dialogRef.current?.close();
	}

	function prev() { setActive(a => Math.max(0, a - 1)); }
	function next() { setActive(a => Math.min(images.length - 1, a + 1)); }

	useEffect(() => {
		function onKey(e: KeyboardEvent) {
			if (!open) return;
			if (e.key === 'ArrowLeft') prev();
			if (e.key === 'ArrowRight') next();
		}
		window.addEventListener('keydown', onKey);
		return () => window.removeEventListener('keydown', onKey);
	}, [open, images.length]);

	const current = images[active];

	return (
		<>
			<div class="thumbs">
				{images.map((src, i) => (
					<div class="thumb-wrap" key={i}>
						<button type="button" class="thumb" onClick={() => show(i)}>
							<img src={src} alt={alt} />
						</button>
						{onRemove && (
							<button
								type="button"
								class="thumb-remove"
								onClick={() => onRemove(i)}
								aria-label="Remove image"
							>
								<Icon name="x" />
							</button>
						)}
					</div>
				))}
				{trailing}
			</div>

			<dialog
				ref={dialogRef}
				class="lightbox"
				onClose={() => setOpen(false)}
				onClick={e => {
					if (e.target === dialogRef.current) close();
				}}
			>
				<div class="lightbox-content">
					{current && <img src={current} alt={alt} />}
				</div>

				{images.length > 1 && (
					<>
						<button
							type="button"
							class="lightbox-nav lightbox-prev"
							onClick={prev}
							disabled={active === 0}
							aria-label="Previous"
						>
							<Icon name="caret-left" />
						</button>
						<button
							type="button"
							class="lightbox-nav lightbox-next"
							onClick={next}
							disabled={active === images.length - 1}
							aria-label="Next"
						>
							<Icon name="caret-right" />
						</button>
					</>
				)}

				<button
					type="button"
					class="lightbox-close"
					onClick={close}
					aria-label="Close"
				>
					<Icon name="x" />
				</button>
			</dialog>
		</>
	);
}
