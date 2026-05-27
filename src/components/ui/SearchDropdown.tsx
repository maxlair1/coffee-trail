import { useId } from 'preact/hooks';

type Props = {
	value: string;
	onChange: (v: string) => void;
	options: string[];
	placeholder?: string;
};

export function SearchDropdown({ value, onChange, options, placeholder }: Props) {
	const id = useId();
	return (
		<>
			<input
				list={id}
				value={value}
				placeholder={placeholder}
				onInput={e => onChange(e.currentTarget.value)}
			/>
			<datalist id={id}>
				{options.map(o => <option key={o} value={o} />)}
			</datalist>
		</>
	);
}
