import { useCallback, useState } from 'preact/hooks';

export function useReload() {
	const [version, setVersion] = useState(0);
	const reload = useCallback(() => setVersion(v => v + 1), []);
	return [version, reload] as const;
}
