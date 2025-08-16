import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

import { Header } from './components/layout/Header';
import { Home } from './pages/Home';
import { Search } from './pages/Search';
import { ProductDetail } from './pages/ProductDetail';
import { Trending } from './pages/Trending';
import { About } from './pages/About';
import { AdminDashboard } from './pages/AdminDashboard';
import { ChatBot } from './pages/ChatBot';
import { ErrorBoundary } from './components/common/ErrorBoundary';

function App() {
  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gray-50">
        <Header />
        <AnimatePresence mode="wait">
          <Routes>
            <Route 
              path="/" 
              element={
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <Home />
                </motion.div>
              } 
            />
            <Route 
              path="/search" 
              element={
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <Search />
                </motion.div>
              } 
            />
            <Route 
              path="/product/:id" 
              element={
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <ProductDetail />
                </motion.div>
              } 
            />
            <Route 
              path="/trending" 
              element={
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <Trending />
                </motion.div>
              } 
            />
            <Route 
              path="/about" 
              element={
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <About />
                </motion.div>
              } 
            />
            <Route 
              path="/admin" 
              element={
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <AdminDashboard />
                </motion.div>
              } 
            />
            <Route 
              path="/chat" 
              element={
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <ChatBot />
                </motion.div>
              } 
            />
          </Routes>
        </AnimatePresence>
      </div>
    </ErrorBoundary>
  );
}

export default App;