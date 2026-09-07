import type { CSSProperties } from 'react';
import { Toaster } from 'sonner';

export function CockpitToaster() {
  return (
    <Toaster
      position="top-center"
      theme="dark"
      richColors
      closeButton
      offset={20}
      visibleToasts={4}
      style={
        {
          '--width': 'min(420px, calc(100vw - 32px))',
          '--border-radius': '14px',
          '--normal-bg': '#071421',
          '--normal-border': '#1f3349',
          '--normal-text': '#d6e5f4',
          '--normal-bg-hover': '#0b1d2f',
          '--normal-border-hover': '#2d4a49',
          '--success-bg': '#0b2a22',
          '--success-border': '#2c8b65',
          '--success-text': '#7af0b9',
          '--warning-bg': '#261f0f',
          '--warning-border': '#8a6d2b',
          '--warning-text': '#f0d27d',
          '--error-bg': '#2a121a',
          '--error-border': '#8b3746',
          '--error-text': '#ffb9b9',
          '--info-bg': '#0b1f35',
          '--info-border': '#275277',
          '--info-text': '#9fcfff'
        } as CSSProperties
      }
      toastOptions={{
        classNames: {
          toast:
            'backdrop-blur-xl shadow-[0_20px_80px_rgba(0,0,0,0.52),0_0_0_1px_rgba(78,225,160,0.06)]',
          title: 'text-[13px] font-semibold tracking-[0.01em]',
          description: 'text-[12px] text-[#93a2b8]',
          icon: 'text-current',
          closeButton:
            'border-[#29425d] bg-[#071421] text-[#93a2b8] hover:border-[#4ee1a0] hover:bg-[#0b1d2f] hover:text-[#eafff5]',
          success: 'shadow-[0_20px_80px_rgba(0,0,0,0.52),inset_3px_0_#4ee1a0]',
          error: 'shadow-[0_20px_80px_rgba(0,0,0,0.52),inset_3px_0_#f87171]',
          warning: 'shadow-[0_20px_80px_rgba(0,0,0,0.52),inset_3px_0_#e7b84b]',
          info: 'shadow-[0_20px_80px_rgba(0,0,0,0.52),inset_3px_0_#60a5fa]'
        }
      }}
    />
  );
}
