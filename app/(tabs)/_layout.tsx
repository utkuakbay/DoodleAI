import { Tabs } from 'expo-router';
import { useColorScheme } from 'react-native';
import { Colors } from '../../constants/Colors';
import { Ionicons, FontAwesome, MaterialCommunityIcons } from '@expo/vector-icons';

function TabBarIcon(props: {
  name: React.ComponentProps<typeof Ionicons>['name'];
  color: string;
}) {
  return <Ionicons size={24} style={{ marginBottom: -3 }} {...props} />;
}

function FontAwesomeIcon(props: {
  name: React.ComponentProps<typeof FontAwesome>['name'];
  color: string;
}) {
  return <FontAwesome size={22} style={{ marginBottom: -3 }} {...props} />;
}

function MCIcon(props: {
  name: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  color: string;
}) {
  return <MaterialCommunityIcons size={24} style={{ marginBottom: -3 }} {...props} />;
}

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: colorScheme === 'dark' ? Colors.dark.tabIconDefault : Colors.light.tabIconDefault,
        tabBarStyle: {
          borderTopWidth: 0,
          elevation: 0,
          backgroundColor: colorScheme === 'dark' ? Colors.dark.background : Colors.light.background,
          height: 60,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
          marginBottom: 5,
        },
        headerStyle: {
          backgroundColor: colorScheme === 'dark' ? Colors.dark.background : Colors.light.background,
        },
        headerTintColor: colorScheme === 'dark' ? Colors.dark.text : Colors.light.text,
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}>
      <Tabs.Screen
        name="canvas"
        options={{
          title: 'Tuval',
          tabBarIcon: ({ color }) => <MCIcon name="drawing" color={color} />,
        }}
      />
      <Tabs.Screen
        name="generator"
        options={{
          title: 'Resim Üret',
          tabBarIcon: ({ color }) => <MCIcon name="robot" color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profil',
          tabBarIcon: ({ color }) => <TabBarIcon name="person" color={color} />,
        }}
      />
    </Tabs>
  );
}
