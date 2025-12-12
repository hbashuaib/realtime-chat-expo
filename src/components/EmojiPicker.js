// src/components/EmojiPicker.js
import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  ScrollView,
} from 'react-native';
import { getEmojiList } from '../utils/parseEmojiData';
import { theme } from '../core/theme';
import { useColorScheme } from '@/hooks/use-color-scheme'; // ✅ same hook as _layout

const categories = [
  { name: 'Smileys & Emotion', icon: '😄' },
  { name: 'People & Body', icon: '🧑' },
  { name: 'Animals & Nature', icon: '🐶' },
  { name: 'Food & Drink', icon: '🍔' },
  { name: 'Travel & Places', icon: '✈️' },
  { name: 'Activities', icon: '⚽' },
  { name: 'Objects', icon: '💡' },
  { name: 'Symbols', icon: '🔣' },
  { name: 'Flags', icon: '🏁' },
];

export default function EmojiPicker({ onSelect }) {
  const colorScheme = useColorScheme(); // 'light' | 'dark'
  const colors = theme[colorScheme].colors;
  const spacing = theme[colorScheme].spacing;
  const fontFamily = theme[colorScheme].fontFamily;

  const allEmojis = useMemo(() => getEmojiList(), []);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Smileys & Emotion');
  const [history, setHistory] = useState([]);

  const filtered = useMemo(() => {
    const query = search.toLowerCase();
    return allEmojis.filter(e => {
      const name = e.name || '';
      const shortName = e.short_name || '';
      const category = e.category || '';
      return (
        category === selectedCategory &&
        (name.toLowerCase().includes(query) || shortName.toLowerCase().includes(query))
      );
    });
  }, [search, selectedCategory]);

  const handleSelect = emoji => {
    setHistory(prev => {
      const updated = [emoji, ...prev.filter(e => e !== emoji)];
      return updated.slice(0, 12);
    });
    onSelect(emoji);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background, padding: spacing.sm }]}>
      {/* Search Bar */}
      <TextInput
        placeholder="Search emoji..."
        placeholderTextColor={colors.textSecondary}
        value={search}
        onChangeText={setSearch}
        style={[
          styles.search,
          {
            color: colors.textPrimary,
            borderColor: colors.border,
            fontFamily: fontFamily.regular,
          },
        ]}
      />

      {/* Category Tabs */}
      <View style={[styles.tabBarContainer, { borderColor: colors.border }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs}>
          {categories.map(cat => (
            <TouchableOpacity
              key={cat.name}
              onPress={() => setSelectedCategory(cat.name)}
              style={[
                styles.tab,
                selectedCategory === cat.name && { backgroundColor: colors.primary },
              ]}
            >
              <Text
                style={[
                  styles.emojiTabIcon,
                  { color: colors.textPrimary },
                  selectedCategory === cat.name && { color: colors.headerText },
                ]}
              >
                {String(cat.icon)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* History */}
      {history.length > 0 && (
        <View style={styles.historyRow}>
          <Text style={[styles.historyLabel, { color: colors.textPrimary }]}>Recently Used:</Text>
          <FlatList
            horizontal
            data={history}
            keyExtractor={(item, index) => item + index}
            renderItem={({ item }) => (
              <TouchableOpacity onPress={() => handleSelect(item)} style={styles.emojiWrapper}>
                <Text style={styles.emoji}>{String(item)}</Text>
              </TouchableOpacity>
            )}
          />
        </View>
      )}

      {/* Emoji Grid */}
      <FlatList
        data={filtered}
        keyExtractor={(item, index) => item.emoji + index}
        numColumns={8}
        renderItem={({ item }) => (
          <TouchableOpacity onPress={() => handleSelect(item.emoji)} style={styles.emojiWrapper}>
            <Text style={styles.emoji}>{String(item.emoji)}</Text>
          </TouchableOpacity>
        )}
        keyboardShouldPersistTaps="handled"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  search: {
    height: 40,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  tabs: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  tab: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 4,
  },
  tabBarContainer: {
    borderBottomWidth: 1,
    paddingBottom: 6,
    marginBottom: 6,
  },
  historyRow: {
    marginBottom: 8,
  },
  historyLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  emojiWrapper: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    margin: 2,
  },
  emoji: {
    fontSize: 28,
  },
  emojiTabIcon: {
    fontSize: 22,
    textAlign: 'center',
  },
});



// Old EmojiPicker code below:
// import React, { useState, useMemo } from 'react';
// import {
//   View,
//   Text,
//   FlatList,
//   TouchableOpacity,
//   StyleSheet,
//   TextInput,
//   ScrollView,
// } from 'react-native';
// import { getEmojiList } from '../utils/parseEmojiData';
// import { theme } from '../core/theme';   // ✅ fixed import

// const categories = [
//   { name: 'Smileys & Emotion', icon: '😄' },
//   { name: 'People & Body', icon: '🧑' },
//   { name: 'Animals & Nature', icon: '🐶' },
//   { name: 'Food & Drink', icon: '🍔' },
//   { name: 'Travel & Places', icon: '✈️' },
//   { name: 'Activities', icon: '⚽' },
//   { name: 'Objects', icon: '💡' },
//   { name: 'Symbols', icon: '🔣' },
//   { name: 'Flags', icon: '🏁' },
// ];

// export default function EmojiPicker({ onSelect }) {
//   const allEmojis = useMemo(() => getEmojiList(), []);
//   const [search, setSearch] = useState('');
//   const [selectedCategory, setSelectedCategory] = useState('Smileys & Emotion');
//   const [history, setHistory] = useState([]);

//   const filtered = useMemo(() => {
//     const query = search.toLowerCase();
//     return allEmojis.filter(e => {
//       const name = e.name || '';
//       const shortName = e.short_name || '';
//       const category = e.category || '';
//       return (
//         category === selectedCategory &&
//         (name.toLowerCase().includes(query) || shortName.toLowerCase().includes(query))
//       );
//     });
//   }, [search, selectedCategory]);

//   const handleSelect = emoji => {
//     setHistory(prev => {
//       const updated = [emoji, ...prev.filter(e => e !== emoji)];
//       return updated.slice(0, 12); // keep last 12
//     });
//     onSelect(emoji);
//   };

//   return (
//     <View style={styles.container}>
//       {/* Search Bar */}
//       <TextInput
//         placeholder="Search emoji..."
//         placeholderTextColor={theme.colors.textSecondary}
//         value={search}
//         onChangeText={setSearch}
//         style={styles.search}
//       />

//       {/* Category Tabs */}
//       <View style={styles.tabBarContainer}>
//         <ScrollView
//           horizontal
//           showsHorizontalScrollIndicator={false}
//           contentContainerStyle={styles.tabs}
//         >
//           {categories.map(cat => (
//             <TouchableOpacity
//               key={cat.name}
//               onPress={() => setSelectedCategory(cat.name)}
//               style={[
//                 styles.tab,
//                 selectedCategory === cat.name && styles.tabSelected,
//               ]}
//             >
//               <Text
//                 style={[
//                   styles.emojiTabIcon,
//                   selectedCategory === cat.name && styles.emojiTabIconSelected,
//                 ]}
//               >
//                 {String(cat.icon)}
//               </Text>
//             </TouchableOpacity>
//           ))}
//         </ScrollView>
//       </View>

//       {/* History */}
//       {history.length > 0 && (
//         <View style={styles.historyRow}>
//           <Text style={styles.historyLabel}>Recently Used:</Text>
//           <FlatList
//             horizontal
//             data={history}
//             keyExtractor={(item, index) => item + index}
//             renderItem={({ item }) => (
//               <TouchableOpacity onPress={() => handleSelect(item)} style={styles.emojiWrapper}>
//                 <Text style={styles.emoji}>{String(item)}</Text>
//               </TouchableOpacity>
//             )}
//           />
//         </View>
//       )}

//       {/* Emoji Grid */}
//       <FlatList
//         data={filtered}
//         keyExtractor={(item, index) => item.emoji + index}
//         numColumns={8}
//         renderItem={({ item }) => (
//           <TouchableOpacity onPress={() => handleSelect(item.emoji)} style={styles.emojiWrapper}>
//             <Text style={styles.emoji}>{String(item.emoji)}</Text>
//           </TouchableOpacity>
//         )}
//         keyboardShouldPersistTaps="handled"
//       />
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     backgroundColor: theme.colors.background,
//     padding: theme.spacing.sm,
//   },
//   search: {
//     height: 40,
//     borderWidth: 1,
//     borderColor: theme.colors.border,
//     borderRadius: 8,
//     paddingHorizontal: 12,
//     marginBottom: 8,
//     color: theme.colors.textPrimary,
//     fontFamily: theme.fontFamily.regular,
//   },
//   tabs: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     marginBottom: 8,
//     paddingHorizontal: 4,
//   },
//   tab: {
//     width: 36,
//     height: 36,
//     borderRadius: 18,
//     backgroundColor: '#e0e0e0',
//     justifyContent: 'center',
//     alignItems: 'center',
//     marginHorizontal: 4,
//   },
//   tabSelected: {
//     backgroundColor: theme.colors.primary,
//     shadowColor: '#000',
//     shadowOffset: { width: 0, height: 1 },
//     shadowOpacity: 0.2,
//     shadowRadius: 2,
//     elevation: 2,
//   },
//   tabBarContainer: {
//     borderBottomWidth: 1,
//     borderColor: theme.colors.border,
//     paddingBottom: 6,
//     marginBottom: 6,
//   },
//   historyRow: {
//     marginBottom: 8,
//   },
//   historyLabel: {
//     fontSize: 14,
//     fontWeight: '600',
//     marginBottom: 4,
//     color: theme.colors.textPrimary,
//   },
//   emojiWrapper: {
//     width: 40,
//     height: 40,
//     justifyContent: 'center',
//     alignItems: 'center',
//     margin: 2,
//   },
//   emoji: {
//     fontSize: 28,
//   },
//   emojiTabIcon: {
//     fontSize: 22,
//     textAlign: 'center',
//     color: theme.colors.textPrimary,
//   },
//   emojiTabIconSelected: {
//     color: '#FFFFFF',
//   },
// });