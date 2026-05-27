import { Popover } from './Popover';
import { COLOR_PRESETS } from '../../constants';
import { eqHex } from '../../utils/color';

type Props = {
	value: string;
	onChange: (c: string) => void;
};

export function ColorSelect({ value, onChange }: Props) {
	return (
		<Popover
			trigger={null}
			tooltip="color"
			triggerClass="color-chip"
			triggerStyle={`--bg: ${value}`}
		>
			<div class="color-grid">
				{COLOR_PRESETS.map(c => (
					<button
						key={c}
						type="button"
						class="color-swatch"
						data-tooltip={c}
						data-selected={eqHex(value, c) ? '' : undefined}
						style={`--bg: ${c}`}
						onClick={() => onChange(c)}
					/>
				))}
			</div>
			<input
				type="color"
				class="color-spectrum"
				value={value}
				onInput={e => onChange(e.currentTarget.value)}
			/>
		</Popover>
	);
}
