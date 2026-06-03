import { useToasts } from '../../utils/toast';

export function Toaster() {
	const toasts = useToasts(s => s.toasts);
	const dismiss = useToasts(s => s.dismiss);
	return (
		<div class="toaster" role="status" aria-live="polite">
			{toasts.map(t => (
				<div key={t.id} class="toast" data-kind={t.kind}>
					<button
						type="button"
						class="toast-message"
						onClick={() => dismiss(t.id)}
					>
						{t.message}
					</button>
					{t.action && (
						<button
							type="button"
							class="toast-action"
							onClick={() => {
								t.action!.onClick();
								dismiss(t.id);
							}}
						>
							{t.action.label}
						</button>
					)}
				</div>
			))}
		</div>
	);
}
