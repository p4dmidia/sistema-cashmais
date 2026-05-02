import React, { useState, useEffect } from 'react';
import { Download, X, Smartphone, ArrowBigDownDash } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function PWAInstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Verificar se já está instalado ou rodando como app
    const isStandaloneMode = window.matchMedia('(display-mode: standalone)').matches 
      || (window.navigator as any).standalone 
      || document.referrer.includes('android-app://');
    
    setIsStandalone(isStandaloneMode);
    console.log('PWA: Standalone mode:', isStandaloneMode);
    console.log('PWA: Is Mobile:', isMobileDevice());

    const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
    
    // No iOS o evento beforeinstallprompt não existe, então mostramos o banner manualmente
    if (isIOS && !isStandaloneMode) {
      console.log('PWA: iOS detectado, mostrando banner manualmente');
      setShowBanner(true);
    }

    // Capturar o evento de instalação (Android/Chrome)
    const handler = (e: any) => {
      console.log('PWA: beforeinstallprompt disparado');
      e.preventDefault();
      setDeferredPrompt(e);
      
      // Mostrar o banner se não estiver em modo standalone
      // Removi a trava estrita de mobile para permitir testes em janelas menores no desktop
      if (!isStandaloneMode) {
        console.log('PWA: Verificando se deve mostrar banner...');
        const isMobile = isMobileDevice();
        if (isMobile) {
          console.log('PWA: Mobile/Tablet detectado, mostrando banner');
          setShowBanner(true);
        } else {
          console.log('PWA: Desktop detectado. Para ver o banner, reduza a largura da janela ou use o modo mobile do DevTools.');
          // Opcional: Mostrar banner no desktop também se quiser, mas o requisito era mobile/tablet
        }
      }
    };

    window.addEventListener('beforeinstallprompt', handler);

    // Verificar se já passou pela detecção manual (caso o evento dispare depois)
    if (!isStandaloneMode && isMobileDevice() && !deferredPrompt) {
      // Podemos mostrar um banner informativo mesmo sem o deferredPrompt em alguns casos (iOS)
      // Mas para o Android precisamos do evento
    }

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, [isStandalone]);

  const isMobileDevice = () => {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) 
      || window.innerWidth < 1024;
  };

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      // Caso especial para iOS onde o prompt automático não existe
      if (/iPhone|iPad|iPod/i.test(navigator.userAgent)) {
        alert('Para instalar: toque no ícone de compartilhar (quadrado com seta) e selecione "Adicionar à Tela de Início".');
      }
      return;
    }

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      console.log('Usuário aceitou a instalação');
      setShowBanner(false);
    }
    setDeferredPrompt(null);
  };

  const dismissBanner = () => {
    setShowBanner(false);
    // Opcional: Salvar no localStorage para não incomodar o usuário por um tempo
    localStorage.setItem('pwa-banner-dismissed', Date.now().toString());
  };

  // Não mostrar se já estiver instalado ou se o usuário fechou recentemente
  if (isStandalone) return null;

  return (
    <AnimatePresence>
      {showBanner && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          className="fixed bottom-6 left-4 right-4 z-[100] md:left-auto md:right-6 md:w-96"
        >
          <div className="bg-gradient-to-r from-[#001144] to-[#000022] border border-[#70ff00]/30 rounded-2xl p-4 shadow-[0_10px_40px_rgba(0,0,0,0.5)] backdrop-blur-xl relative overflow-hidden">
            {/* Efeito de brilho ao fundo */}
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-[#70ff00]/10 rounded-full blur-3xl"></div>
            
            <div className="flex items-start space-x-4">
              <div className="bg-[#70ff00]/10 p-3 rounded-xl border border-[#70ff00]/20">
                <Smartphone className="w-6 h-6 text-[#70ff00]" />
              </div>
              
              <div className="flex-1">
                <h3 className="text-white font-bold text-sm">Baixe nosso App</h3>
                <p className="text-white/60 text-xs mt-1 leading-relaxed">
                  Acesse o CashMais direto da sua tela inicial com muito mais rapidez.
                </p>
                
                <div className="mt-4 flex items-center space-x-3">
                  <button
                    onClick={handleInstallClick}
                    className="flex-1 bg-[#70ff00] hover:bg-[#50cc00] text-[#001144] font-black py-2 px-4 rounded-lg text-[10px] uppercase tracking-wider transition-all shadow-lg shadow-[#70ff00]/20 flex items-center justify-center space-x-2"
                  >
                    <Download className="w-3 h-3" />
                    <span>Instalar Agora</span>
                  </button>
                  
                  <button
                    onClick={dismissBanner}
                    className="p-2 text-white/40 hover:text-white/80 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
            
            {/* Pequena barra decorativa */}
            <div className="absolute bottom-0 left-0 h-1 bg-gradient-to-r from-transparent via-[#70ff00]/40 to-transparent w-full"></div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
