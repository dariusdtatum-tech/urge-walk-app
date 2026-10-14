import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';

// Milestone 1: logic + storage only. The screens are ported in later milestones.
export default function App() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Urge Walk</Text>
      <Text style={styles.sub}>Native app in progress.</Text>
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#faf7f1', alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 28, fontWeight: '600', color: '#24395c' },
  sub: { marginTop: 8, fontSize: 16, color: '#4a5468' },
});
