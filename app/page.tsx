'use client';

import { AppProvider, useApp } from '@/components/AppContext';
import TabBar from '@/components/TabBar';
import AuthGate from '@/components/AuthGate';
import GenerateTab from '@/components/GenerateTab';
import DailyTab from '@/components/DailyTab';
import ProfileTab from '@/components/ProfileTab';
import CoachTab from '@/components/CoachTab';

function Shell() {
  const { tab, user } = useApp();
  return (
    <>
      {tab === 'generate' && <GenerateTab />}
      {tab === 'daily' && (user ? <DailyTab /> : <AuthGate />)}
      {tab === 'profile' && (user ? <ProfileTab /> : <AuthGate />)}
      {tab === 'coach' && <CoachTab />}
      <TabBar />
    </>
  );
}

export default function Page() {
  return (
    <AppProvider>
      <Shell />
    </AppProvider>
  );
}
