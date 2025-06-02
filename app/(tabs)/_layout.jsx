import { Tabs } from 'expo-router';

export default function TabLayout() {
  return (
    <Tabs>
      <Tabs.Screen
        name="home"
        options={{
          title: 'home',
          href: null,
          headerShown: false,
        }}
      />
    </Tabs>
  );
}
