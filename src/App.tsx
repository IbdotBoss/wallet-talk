import { Routes, Route } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { PrivyProvider } from './providers/PrivyProvider';
import { Onboarding } from './pages/Onboarding';
import { Chat } from './pages/Chat';
import { Settings } from './pages/Settings';
import { Conversations } from './pages/Conversations';

function App() {
    return (
        <PrivyProvider>
            <div className="min-h-screen bg-background">
                <AnimatePresence mode="wait">
                    <Routes>
                        <Route path="/" element={<Onboarding />} />
                        <Route path="/conversations" element={<Conversations />} />
                        <Route path="/chat/:address" element={<Chat />} />
                        <Route path="/settings" element={<Settings />} />
                    </Routes>
                </AnimatePresence>
            </div>
        </PrivyProvider>
    );
}

export default App;
