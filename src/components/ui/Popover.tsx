import { useId } from 'preact/hooks';
import type { ComponentChildren } from 'preact';

type Props = {
	trigger: ComponentChildren;
	triggerStyle?: string;
	triggerClass?: string;
	tooltip?: string;
	variant?: 'ghost';
	children: ComponentChildren;
};

export function Popover({ trigger, triggerStyle, triggerClass, tooltip, variant, children }: Props) {
	const id = useId();

	function autoClose(e: any) {
		const btn = e.target.closest('button');
		if (!btn) return;
		if (btn.hasAttribute('data-keep-open')) return;
		e.currentTarget.hidePopover();
	}

	const triggerAttrs = { popovertarget: id } as any;
	const popoverAttrs = { popover: 'auto' } as any;

	return (
		<>
			<button
				type="button"
				{...triggerAttrs}
				class={triggerClass}
				style={triggerStyle}
				data-tooltip={tooltip}
				aria-label={tooltip}
				data-variant={variant}
			>
				{trigger}
			</button>
			<div
				id={id}
				{...popoverAttrs}
				class="popover"
				onClick={autoClose}
			>
				{children}
			</div>
		</>
	);
}
