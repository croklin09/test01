import Ionicons from '@expo/vector-icons/Ionicons';
import { router, Stack, useLocalSearchParams, useNavigation } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useRef, useState } from 'react';
import { Alert, Pressable, View } from 'react-native';

import { useTheme } from '../../components/theme';
import { Input } from '../../components/ui';
import { deleteNote, getNote, saveNote } from '../../db/repo';

/** Editor sin botón "Guardar": persiste al salir de la pantalla (como Notas de iOS / Keep). */
export default function NotaEditor() {
  const t = useTheme();
  const db = useSQLiteContext();
  const navigation = useNavigation();
  const { id } = useLocalSearchParams<{ id: string }>();

  const isNew = id === 'nueva';
  const noteId = useRef<string | null>(isNew ? null : id);
  const skipSave = useRef(false);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [pinned, setPinned] = useState(0);
  const latest = useRef({ title, body, pinned });
  useEffect(() => {
    latest.current = { title, body, pinned };
  }, [title, body, pinned]);

  useEffect(() => {
    if (!noteId.current) return;
    getNote(db, noteId.current).then((n) => {
      if (!n) return router.back();
      setTitle(n.title);
      setBody(n.body);
      setPinned(n.pinned);
    });
  }, [db]);

  useEffect(() => {
    return navigation.addListener('beforeRemove', (e) => {
      if (skipSave.current) return;
      // Se retiene la navegación hasta persistir, así la lista ya ve el cambio al enfocarse.
      e.preventDefault();
      const { title, body, pinned } = latest.current;
      const persist =
        !title.trim() && !body.trim()
          ? // Nota vacía: si existía, se borra; si era nueva, no se crea.
            noteId.current
            ? deleteNote(db, noteId.current)
            : Promise.resolve()
          : saveNote(db, noteId.current, { title: title.trim(), body, pinned });
      skipSave.current = true; // evita reentrar al despachar la acción original
      persist.finally(() => navigation.dispatch(e.data.action));
    });
  }, [navigation, db]);

  function remove() {
    Alert.alert('Eliminar nota', '¿Seguro?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          skipSave.current = true;
          if (noteId.current) await deleteNote(db, noteId.current);
          router.back();
        },
      },
    ]);
  }

  return (
    <View style={{ flex: 1, backgroundColor: t.bg, paddingHorizontal: 22, paddingTop: 8, gap: 10 }}>
      <Stack.Screen
        options={{
          title: '',
          headerRight: () => (
            <View style={{ flexDirection: 'row', gap: 18 }}>
              <Pressable onPress={() => setPinned((p) => (p ? 0 : 1))} hitSlop={10} accessibilityLabel="Fijar">
                <Ionicons name={pinned ? 'pin' : 'pin-outline'} size={22} color={t.primary} />
              </Pressable>
              <Pressable onPress={remove} hitSlop={10} accessibilityLabel="Eliminar">
                <Ionicons name="trash-outline" size={22} color={t.danger} />
              </Pressable>
            </View>
          ),
        }}
      />
      <Input
        value={title}
        onChangeText={setTitle}
        placeholder="Título"
        style={{ fontSize: 28, fontWeight: '800' }}
      />
      <Input
        value={body}
        onChangeText={setBody}
        placeholder="Escribí…"
        multiline
        autoFocus={isNew}
        textAlignVertical="top"
        style={{ fontSize: 17, flex: 1, lineHeight: 25 }}
      />
    </View>
  );
}
