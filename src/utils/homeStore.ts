import { create } from 'zustand';

type HomeState = {
	query: string;
	showSearch: boolean;
	selectedTagIds: number[];
	showArchived: boolean;
	sortBy: 'rank' | 'date';
	sortDir: 'asc' | 'desc';
	scrollY: number;
	update: (patch: Partial<Omit<HomeState, 'update'>>) => void;
};

// In-memory store: filters + scroll position survive client-side navigation
// (Home → Cafe → back) but reset on hard reload, which is what we want.
export const useHomeStore = create<HomeState>(set => ({
	query: '',
	showSearch: false,
	selectedTagIds: [],
	showArchived: false,
	sortBy: 'rank',
	sortDir: 'asc',
	scrollY: 0,
	update: patch => set(patch),
}));
