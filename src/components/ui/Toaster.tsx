import { useToasts } from '../../utils/toast';

export function Toaster() {
	const toasts = useToasts(s => s.toasts);
	const dismiss = useToasts(s => s.dismiss);
	return (
		<div class="toaster" role="status" aria-live="polite">
			{toasts.map(t => (
				<button
					type="button"
					key={t.id}
					class="toast"
					data-kind={t.kind}
					onClick={() => dismiss(t.id)}
				>
					{t.message}
				</button>
			))}
		</div>
	);
}
