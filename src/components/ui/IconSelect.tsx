import { useState } from 'preact/hooks';
import { Icon, ICON_NAMES } from './Icon';
import { Popover } from './Popover';

type Props = {
	value: string;
	onChange: (s: string) => void;
};

export function IconSelect({ value, onChange }: Props) {
	const [filter, setFilter] = useState('');
	const f = filter.trim().toLowerCase();
	const filtered = f ? ICON_NAMES.filter(n => n.includes(f)) : ICON_NAMES;

	return (
		<Popover
			trigger={value ? <Icon name={value} /> : <small>Icon <Icon name="caret-down"/></small>}
			tooltip={value || 'Pick icon'}
			variant="ghost"
		>
			<input
				type="text"
				placeholder="filter…"
				value={filter}
				onInput={e => setFilter(e.currentTarget.value)}
				autoFocus
			/>
			<div class="icon-grid">
				<button
					type="button"
					class="icon-cell"
					data-variant="ghost"
					data-tooltip="none"
					aria-label="none"
					data-dim={value === '' ? undefined : ''}
					onClick={() => onChange('')}
				>
					✕
				</button>
				{filtered.map(name => (
					<button
						key={name}
						type="button"
						class="icon-cell"
						data-variant="ghost"
						data-tooltip={name}
						aria-label={name}
						data-selected={value === name ? '' : undefined}
						onClick={() => onChange(name)}
					>
						<Icon name={name} />
					</button>
				))}
			</div>
		</Popover>
	);
}
