import { create } from 'zustand';

export type ToastKind = 'info' | 'success' | 'error';

export type ToastAction = {
	label: string;
	onClick: () => void;
};

export type Toast = {
	id: number;
	message: string;
	kind: ToastKind;
	action?: ToastAction;
};

type ToastStore = {
	toasts: Toast[];
	push: (toast: Omit<Toast, 'id'>) => void;
	dismiss: (id: number) => void;
};

let nextId = 1;
const DURATION_MS = 3500;
const DURATION_WITH_ACTION_MS = 6000;

export const useToasts = create<ToastStore>(set => ({
	toasts: [],
	push: t => {
		const id = nextId++;
		set(s => ({ toasts: [...s.toasts, { ...t, id }] }));
		const dur = t.action ? DURATION_WITH_ACTION_MS : DURATION_MS;
		setTimeout(() => useToasts.getState().dismiss(id), dur);
	},
	dismiss: id => set(s => ({ toasts: s.toasts.filter(t => t.id !== id) })),
}));

type Opts = { action?: ToastAction };

export const toast = {
	info: (message: string, opts?: Opts) =>
		useToasts.getState().push({ message, kind: 'info', action: opts?.action }),
	success: (message: string, opts?: Opts) =>
		useToasts.getState().push({ message, kind: 'success', action: opts?.action }),
	error: (message: string, opts?: Opts) =>
		useToasts.getState().push({ message, kind: 'error', action: opts?.action }),
};
