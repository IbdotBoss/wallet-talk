import { Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { PrivyProvider } from './providers/PrivyProvider';
import { Onboarding } from './pages/Onboarding';
import { Chat } from './pages/Chat';
import { Settings } from './pages/Settings';
import { Conversations } from './pages/Conversations';
import { MessagingLayout } from './layouts/MessagingLayout';

// Apple-style page transition variants
const pageVariants = {
    initial: (direction: number) => ({
        opacity: 0,
        x: direction > 0 ? 20 : -20,
        scale: 0.98,
        filter: 'blur(4px)',
    }),
    animate: {
        opacity: 1,
        x: 0,
        scale: 1,
        filter: 'blur(0px)',
    },
    exit: (direction: number) => ({
        opacity: 0,
        x: direction > 0 ? -20 : 20,
        scale: 0.98,
        filter: 'blur(4px)',
    }),
};

const pageTransition = {
    type: 'spring',
    stiffness: 300,
    damping: 30,
    mass: 0.8,
};

function App() {
    const location = useLocation();

    // Determine navigation direction for slide animation
    const getDirection = (pathname: string) => {
        const paths = ['/', '/messages', '/conversations', '/chat', '/settings'];
        const currentIndex = paths.findIndex(p => pathname.startsWith(p));
        return currentIndex;
    };

    return (
        <PrivyProvider>
            <div className="min-h-screen bg-background">
                <AnimatePresence mode="wait" custom={getDirection(location.pathname)}>
                    <motion.div
                        key={location.pathname}
                        custom={getDirection(location.pathname)}
                        variants={pageVariants}
                        initial="initial"
                        animate="animate"
                        exit="exit"
                        transition={pageTransition}
                        className="min-h-screen"
                    >
                        <Routes location={location}>
                            <Route path="/" element={<Onboarding />} />
                            {/* New 2-column messaging layout */}
                            <Route path="/messages" element={<MessagingLayout />} />
                            <Route path="/messages/:address" element={<MessagingLayout />} />
                            {/* Legacy routes for compatibility */}
                            <Route path="/conversations" element={<Conversations />} />
                            <Route path="/chat/:address" element={<Chat />} />
                            <Route path="/settings" element={<Settings />} />
                        </Routes>
                    </motion.div>
                </AnimatePresence>
            </div>
        </PrivyProvider>
    );
}

export default App;

