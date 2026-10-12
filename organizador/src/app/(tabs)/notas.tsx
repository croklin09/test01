import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { RADIUS, useTheme } from '../../components/theme';
import { Empty, Fab, Hero, Input, Meta, Pill, Screen, SessionCard, Text } from '../../components/ui';
import { listNotes } from '../../db/repo';
import { formatRelative, toISODate } from '../../lib/dates';
import { useQuery } from '../../lib/useQuery';

export default function NotasScreen() {
  const t = useTheme();
  const a = t.accents.notas;
  const [search, setSearch] = useState('');
  const { data: notes } = useQuery((db) => listNotes(db, search), search, []);

  return (
    <>
      <Screen hero={<Hero module="notas" title="Tus notas" subtitle="Ideas, listas y todo lo que no querés olvidar" />}>
        <View style={[styles.search, { backgroundColor: t.card, borderColor: t.border }]}>
          <Ionicons name="search" size={18} color={t.muted} />
          <Input
            value={search}
            onChangeText={setSearch}
            placeholder="Buscar en notas…"
            clearButtonMode="while-editing"
            style={{ flex: 1, paddingVertical: 14, fontWeight: '600' }}
          />
        </View>
        {notes.length ? (
          <View style={{ gap: 12 }}>
            {notes.map((n) => {
              const lines = n.body.split('\n').filter((l) => l.trim());
              const title = n.title || lines[0] || 'Sin título';
              const preview = (n.title ? lines : lines.slice(1)).join(' · ');
              return (
                <SessionCard
                  key={n.id}
                  title={title}
                  onPress={() => router.push(`/nota/${n.id}`)}
                  meta={<Meta icon="time-outline">{formatRelative(toISODate(new Date(n.updated_at)))}</Meta>}
                  footer={
                    <>
                      {preview ? (
                        <Text numberOfLines={2} style={{ color: t.muted, fontSize: 14 }}>
                          {preview}
                        </Text>
                      ) : null}
                      {n.pinned ? (
                        <Pill bg={a.tile} color={a.tileInk}>
                          Fijada
                        </Pill>
                      ) : null}
                    </>
                  }
                />
              );
            })}
          </View>
        ) : (
          <Empty icon="document-text-outline" text={search ? 'Sin resultados.' : 'Todavía no hay notas.'} />
        )}
      </Screen>
      <Fab label="Nota" icon="create-outline" onPress={() => router.push('/nota/nueva')} />
    </>
  );
}

const styles = StyleSheet.create({
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: RADIUS.pill,
    borderWidth: 1.5,
    paddingHorizontal: 18,
  },
});
