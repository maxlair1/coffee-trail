import { supabase } from '../api/client';

const BUCKET = 'cafe_images';
const MAX_DIM = 1600;
const QUALITY = 0.85;

function loadImage(src: string): Promise<HTMLImageElement> {
	return new Promise((resolve, reject) => {
		const img = new Image();
		img.onload = () => resolve(img);
		img.onerror = reject;
		img.src = src;
	});
}

async function downsample(file: File): Promise<Blob> {
	const url = URL.createObjectURL(file);
	try {
		const img = await loadImage(url);
		const scale = Math.min(1, MAX_DIM / Math.max(img.width, img.height));
		const w = Math.round(img.width * scale);
		const h = Math.round(img.height * scale);
		const canvas = document.createElement('canvas');
		canvas.width = w;
		canvas.height = h;
		const ctx = canvas.getContext('2d');
		if (!ctx) throw new Error('No 2D context');
		ctx.drawImage(img, 0, 0, w, h);
		return await new Promise<Blob>((resolve, reject) =>
			canvas.toBlob(
				b => (b ? resolve(b) : reject(new Error('toBlob returned null'))),
				'image/jpeg',
				QUALITY,
			),
		);
	} finally {
		URL.revokeObjectURL(url);
	}
}

export async function uploadCafeImage(file: File, cafeId: number): Promise<string> {
	const blob = await downsample(file);
	const path = `${cafeId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
	const { error } = await supabase.storage
		.from(BUCKET)
		.upload(path, blob, { contentType: 'image/jpeg', upsert: false });
	if (error) {
		const msg = (error as any).message ?? String(error);
		if (msg.toLowerCase().includes('not found') || msg.toLowerCase().includes('bucket')) {
			throw new Error(`Storage bucket "${BUCKET}" not found. Create it in Supabase → Storage (public bucket, exact name "${BUCKET}").`);
		}
		throw error;
	}
	const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
	return data.publicUrl;
}
