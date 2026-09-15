import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '雄獅簡訊｜版本三｜網址膠囊',
  description: '貼上網址立即轉換，手動輸入後自動形成可編輯網址膠囊的簡訊原型',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="zh-Hant"><body>{children}</body></html>;
}
