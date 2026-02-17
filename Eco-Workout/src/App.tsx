import { ConvexProvider } from 'convex/react';
import { convex } from './lib/convex';
import { AppContent } from './components/AppContent';

function App() {
  return (
    <ConvexProvider client={convex}>
      <div className="min-h-screen bg-gray-50">
        <header className="sticky top-0 z-10 bg-white border-b border-gray-200 p-4 shadow-sm">
          <h1 className="text-2xl font-bold text-center text-gray-800">Eco Track</h1>
        </header>
        <main className="container mx-auto px-4 py-8 max-w-4xl">
          <AppContent />
        </main>
      </div>
    </ConvexProvider>
  );
}

export default App;