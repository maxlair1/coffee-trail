import { create } from 'zustand';

export type ToastKind = 'info' | 'success' | 'error';

export type Toast = {
	id: number;
	message: string;
	kind: ToastKind;
};

type ToastStore = {
	toasts: Toast[];
	push: (toast: Omit<Toast, 'id'>) => void;
	dismiss: (id: number) => void;
};

let nextId = 1;
const DURATION_MS = 3500;

export const useToasts = create<ToastStore>(set => ({
	toasts: [],
	push: t => {
		const id = nextId++;
		set(s => ({ toasts: [...s.toasts, { ...t, id }] }));
		setTimeout(() => useToasts.getState().dismiss(id), DURATION_MS);
	},
	dismiss: id => set(s => ({ toasts: s.toasts.filter(t => t.id !== id) })),
}));

export const toast = {
	info: (message: string) => useToasts.getState().push({ message, kind: 'info' }),
	success: (message: string) => useToasts.getState().push({ message, kind: 'success' }),
	error: (message: string) => useToasts.getState().push({ message, kind: 'error' }),
};
