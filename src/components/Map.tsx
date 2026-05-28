import { useState } from 'preact/hooks';

type CafeMapProps = {
	name: string;
	city: string | null;
	state: string | null;
	address?: string | null;
	queryOverride?: string | null;
};

export function Map({ name, city, state, address, queryOverride }: CafeMapProps) {
	const [loaded, setLoaded] = useState(false);
	const queryString = queryOverride?.trim()
		? queryOverride.trim()
		: [address ?? name, city, state].filter(Boolean).join(", ");
	const src = `https://maps.google.com/maps?q=${encodeURIComponent(queryString)}&output=embed`;

	return (
		<div class="map-frame">
			{!loaded && <div class="map-skeleton" aria-hidden="true" />}
			<iframe
				src={src}
				style={{ opacity: loaded ? 1 : 0 }}
				allowFullScreen
				loading="lazy"
				referrerPolicy="no-referrer-when-downgrade"
				onLoad={() => setLoaded(true)}
				title={`Map of ${name}`}
			/>
		</div>
	);
}
