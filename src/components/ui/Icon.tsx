type Weight = 'thin' | 'light' | 'regular' | 'bold' | 'fill' | 'duotone';

type Props = {
	name: string;
	weight?: Weight;
};

export function Icon({ name, weight = 'bold' }: Props) {
	return <i class={`ph-${weight} ph-${name}`} aria-hidden="true" />;
}

export const ICON_NAMES = [
	'coffee', 'coffee-bean',
	'wine', 'beer-bottle', 'beer-stein', 'martini', 'tea-bag', 'champagne',
	'cake', 'cookie', 'croissant', 'bread', 'hamburger', 'hot-dog',
	'ice-cream', 'pizza', 'salad', 'fork-knife', 'chef-hat',
	'leaf', 'tree', 'flower', 'plant',
	'sun', 'cloud', 'cloud-sun', 'lightning', 'snowflake',
	'wifi-high', 'armchair', 'couch',
	'music-note', 'music-notes', 'headphones', 'speaker-high',
	'book', 'book-open',
	'map-pin', 'storefront', 'building', 'house',
	'laptop', 'monitor',
	'money', 'wallet', 'coin',
	'clock', 'alarm', 'star', 'heart', 'smiley', 'sparkle',
];
