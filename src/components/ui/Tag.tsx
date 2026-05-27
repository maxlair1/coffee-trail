import { Icon } from './Icon';
import { contrastText } from '../../utils/color';

type Props = {
	name: string;
	color: string;
	icon?: string | null;
	onClear?: () => void;
};

export function Tag({ name, color, icon, onClear }: Props) {
	const fg = contrastText(color);
	return (
		<span class="tag-pill" style={`--bg: ${color}; --fg: ${fg}`}>
			{icon && <Icon name={icon} />}
			{name}
			{onClear && (
				<button type="button" onClick={onClear} aria-label={`Remove ${name}`}>×</button>
			)}
		</span>
	);
}
