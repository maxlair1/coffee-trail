import { LocationProvider, Router, Route, hydrate, prerender as ssr } from 'preact-iso';

import { Header } from './components/Header.jsx';
import { Home } from './pages/Home';
import { NotFound } from './pages/_404';
import { Cafe } from './pages/Cafe';
import '../styles/global.css';

export function App() {

	return (
		<LocationProvider scope="/coffee-trail">
			<Header />
			<main>
				<Router>
					<Route path="/" component={Home} />
					<Route default component={NotFound} />
					<Route path='/cafe/:id' component={Cafe}></Route>
				</Router>
			</main>
		</LocationProvider>
	);
}

if (typeof window !== 'undefined') {
	hydrate(<App />, document.getElementById('app')!);
}

export async function prerender(data) {
	return await ssr(<App {...data} />);
}
