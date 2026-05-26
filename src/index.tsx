import { LocationProvider, Router, Route, hydrate, prerender as ssr } from 'preact-iso';

import { Header } from './components/Header.jsx';
import { Home } from './pages/Home';
import { Cafe } from './pages/Cafe';
import { Login } from './pages/Login';
import { AuthProvider } from '../context/AuthContext.js';
import '../styles/global.css';
// import { AuthGuard } from './components/AuthGuard.js';
// import { NotFound } from './pages/_404';

export function App() {

	return (
		<AuthProvider>
			<LocationProvider>
				<Header />
				<main style={{margin: '0.5rem'}}>
					<Router>
						<Route path="/" component={Home} />
						<Route default component={Home} />
						<Route path='/login' component={Login}/>
						<Route path='/cafe/:id' component={Cafe}></Route>
					</Router>
				</main>
			</LocationProvider>
		</AuthProvider>
	);
}

if (typeof window !== 'undefined') {
	hydrate(<App />, document.getElementById('app')!);
}

export async function prerender(data) {
	return await ssr(<App {...data} />);
}
