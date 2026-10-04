import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import './index.css';

// The data source is fixed at build time (FI1-Q2). Vite replaces the variable with a literal, so
// the branch not taken, and everything only it imports, is left out of the bundle: a backend build
// contains no mock records, and a mock build contains no backend client.
const root = createRoot(document.getElementById('root')!);

if (import.meta.env.VITE_DATA_SOURCE === 'backend') {
  import('./backend/BackendApp').then(({BackendApp}) =>
    root.render(
      <StrictMode>
        <BackendApp />
      </StrictMode>,
    ),
  );
} else {
  import('./App').then(({default: App}) =>
    root.render(
      <StrictMode>
        <App />
      </StrictMode>,
    ),
  );
}
