import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import { Alert, Pressable, View } from 'react-native';

import { useTheme } from '../../components/theme';
import { Button, Field, Screen, Text } from '../../components/ui';
import { ALL_DAYS, archiveHabit, deleteHabit, getHabit, saveHabit } from '../../db/repo';
import { WEEKDAYS_SHORT } from '../../lib/dates';

const WEEKDAYS_MASK = 0b0011111;

export default function HabitoEditor() {
  const t = useTheme();
  const db = useSQLiteContext();
  const { id } = useLocalSearchParams<{ id: string }>();
  const isNew = id === 'nuevo';

  const [name, setName] = useState('');
  const [mask, setMask] = useState(ALL_DAYS);
  const [error, setError] = useState<string>();

  useEffect(() => {
    if (isNew) return;
    getHabit(db, id).then((h) => {
      if (!h) return router.back();
      setName(h.name);
      setMask(h.days_mask);
    });
  }, [db, id, isNew]);

  async function save() {
    if (!name.trim()) return setError('El nombre es obligatorio.');
    if (mask === 0) return setError('Elegí al menos un día.');
    await saveHabit(db, isNew ? null : id, { name: name.trim(), days_mask: mask });
    router.back();
  }

  function remove() {
    Alert.alert('Quitar hábito', 'Archivar conserva el historial; eliminar lo borra todo.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Archivar',
        onPress: async () => {
          await archiveHabit(db, id);
          router.back();
        },
      },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          await deleteHabit(db, id);
          router.back();
        },
      },
    ]);
  }

  return (
    <Screen>
      <Stack.Screen options={{ title: isNew ? 'Nuevo hábito' : 'Editar hábito' }} />
      <Field
        label="Nombre"
        value={name}
        onChangeText={(v) => {
          setName(v);
          setError(undefined);
        }}
        autoFocus={isNew}
        placeholder="Ej.: Caminar 30 min, Leer, Agua 2 L"
        error={error}
      />
      <Text style={{ fontSize: 15, fontWeight: '800' }}>¿Qué días?</Text>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        {WEEKDAYS_SHORT.map((label, i) => {
          const on = (mask & (1 << i)) !== 0;
          return (
            <Pressable
              key={i}
              onPress={() => setMask(mask ^ (1 << i))}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: on }}
              style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: on ? t.primary : t.cardAlt,
              }}
            >
              <Text style={{ color: on ? t.primaryText : t.text, fontWeight: '800' }}>{label}</Text>
            </Pressable>
          );
        })}
      </View>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <View style={{ flex: 1 }}>
          <Button title="Todos los días" variant="ghost" onPress={() => setMask(ALL_DAYS)} />
        </View>
        <View style={{ flex: 1 }}>
          <Button title="Lun a vie" variant="ghost" onPress={() => setMask(WEEKDAYS_MASK)} />
        </View>
      </View>
      <Button title="Guardar" icon="checkmark" onPress={save} />
      {!isNew && <Button title="Archivar o eliminar" variant="danger" icon="archive-outline" onPress={remove} />}
    </Screen>
  );
}
