import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useState } from 'react';
import { TextInput } from 'react-native';

import { useTheme } from '../../components/theme';
import { Card, Empty, Fab, ListRow, Screen } from '../../components/ui';
import { listNotes } from '../../db/repo';
import { formatRelative, toISODate } from '../../lib/dates';
import { useQuery } from '../../lib/useQuery';

export default function NotasScreen() {
  const t = useTheme();
  const [search, setSearch] = useState('');
  const { data: notes } = useQuery((db) => listNotes(db, search), search, []);

  return (
    <>
      <Screen>
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Buscar en notas…"
          placeholderTextColor={t.muted}
          clearButtonMode="while-editing"
          style={{
            color: t.text,
            backgroundColor: t.card,
            borderColor: t.border,
            borderWidth: 1,
            borderRadius: 12,
            padding: 12,
            fontSize: 16,
          }}
        />
        <Card>
          {notes.length ? (
            notes.map((n) => {
              const firstLine = n.body.split('\n').find((l) => l.trim()) ?? '';
              return (
                <ListRow
                  key={n.id}
                  title={n.title || firstLine || 'Sin título'}
                  subtitle={`${formatRelative(toISODate(new Date(n.updated_at)))}${n.title && firstLine ? ' · ' + firstLine : ''}`}
                  right={n.pinned ? <Ionicons name="pin" size={16} color={t.primary} /> : null}
                  onPress={() => router.push(`/nota/${n.id}`)}
                />
              );
            })
          ) : (
            <Empty icon="document-text-outline" text={search ? 'Sin resultados.' : 'Todavía no hay notas.'} />
          )}
        </Card>
      </Screen>
      <Fab onPress={() => router.push('/nota/nueva')} icon="create-outline" />
    </>
  );
}
