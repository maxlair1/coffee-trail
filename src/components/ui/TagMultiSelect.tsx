import { useState } from 'preact/hooks';
import { type Tag as TagT } from '../../api/tag.types';
import { Tag } from './Tag';
import { Icon } from './Icon';

type Props = {
	tags: TagT[];
	selected: Set<number>;
	onToggle: (id: number) => void;
	onClear?: () => void;
};

export function TagMultiSelect({ tags, selected, onToggle, onClear }: Props) {
	const [q, setQ] = useState('');
	const matches = tags.filter(t =>
		t.name.toLowerCase().includes(q.trim().toLowerCase())
	);
	return (
		<div class="tag-picker">
			<input
				type="search"
				placeholder="Search tags…"
				value={q}
				onInput={e => setQ(e.currentTarget.value)}
				class="tag-picker-search"
			/>
			<ul class="tag-picker-list plain">
				{matches.map(t => {
					const active = selected.has(t.id);
					return (
						<li key={t.id}>
							<button
								type="button"
								data-keep-open
								onClick={() => onToggle(t.id)}
								data-active={active || undefined}
								class="tag-picker-row"
							>
								<span class="tag-picker-check">
									{active && <Icon name="check" weight="bold" />}
								</span>
								<Tag name={t.name} color={t.color} icon={t.icon} />
							</button>
						</li>
					);
				})}
				{matches.length === 0 && (
					<li><small style={{ opacity: 0.6, padding: '0.5rem' }}>No matches</small></li>
				)}
			</ul>
			{onClear && selected.size > 0 && (
				<button
					type="button"
					data-keep-open
					data-variant="ghost"
					onClick={onClear}
				>
					Clear ({selected.size})
				</button>
			)}
		</div>
	);
}
