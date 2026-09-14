import { useMemo } from 'react';
import { Text, View } from 'react-native';
import { colors, radius, spacing } from '../theme';
import { dataset, getHero } from '../data/dataset';
import { getAttributes } from '../data/heroAttributes';
import { draftReport, type SideReport } from '../engine';
import { HeroImage } from './HeroImage';

function SideCard({ report, accent }: { report: SideReport; accent: string }) {
  const title = report.side === 'radiant' ? 'Radiant' : 'Dire';
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.surface,
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: colors.border,
        padding: spacing(3),
        gap: spacing(2),
      }}
    >
      <Text style={{ color: accent, fontWeight: '800' }}>{title}</Text>

      {report.strengths.length > 0 && (
        <View style={{ gap: 3 }}>
          {report.strengths.map((s) => (
            <Text key={s} style={{ color: colors.positive, fontSize: 12 }}>＋ {s}</Text>
          ))}
        </View>
      )}
      {report.weaknesses.length > 0 && (
        <View style={{ gap: 3 }}>
          {report.weaknesses.map((w) => (
            <Text key={w} style={{ color: colors.negative, fontSize: 12 }}>－ {w}</Text>
          ))}
        </View>
      )}
      {report.strengths.length === 0 && report.weaknesses.length === 0 && (
        <Text style={{ color: colors.textMuted, fontSize: 12 }}>Sin datos.</Text>
      )}
    </View>
  );
}

export function DraftReportView({ radiant, dire }: { radiant: number[]; dire: number[] }) {
  const report = useMemo(
    () => draftReport(dataset, radiant, dire, { bracket: 'legend', attributesFor: getAttributes }),
    [radiant, dire],
  );

  const winnerLabel = report.winner === 'tie' ? 'Empate técnico' : report.winner === 'radiant' ? 'Radiant' : 'Dire';
  const winnerAccent = report.winner === 'dire' ? colors.enemy : colors.ally;
  const imp = report.winnerImprovement;

  return (
    <View style={{ gap: spacing(4) }}>
      {/* Verdict */}
      <View style={{ backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: winnerAccent, padding: spacing(3), gap: spacing(2) }}>
        <Text style={{ color: colors.text, fontWeight: '800', fontSize: 16 }}>
          Ganador estimado: <Text style={{ color: winnerAccent }}>{winnerLabel}</Text>
          {report.winner !== 'tie' && (
            <Text style={{ color: colors.textMuted, fontWeight: '600' }}>  ({Math.round(report.winnerProb * 100)}%)</Text>
          )}
        </Text>
        {report.summary.map((s) => (
          <Text key={s} style={{ color: colors.textMuted, fontSize: 13 }}>• {s}</Text>
        ))}
      </View>

      {/* Both sides learn */}
      <View style={{ flexDirection: 'row', gap: spacing(3) }}>
        <SideCard report={report.radiant} accent={colors.ally} />
        <SideCard report={report.dire} accent={colors.enemy} />
      </View>

      {/* Improvement idea for the winner */}
      {imp && (
        <View style={{ backgroundColor: colors.surfaceAlt, borderRadius: radius.md, borderWidth: 1, borderColor: colors.neutral, padding: spacing(3), gap: spacing(2) }}>
          <Text style={{ color: colors.neutral, fontWeight: '800' }}>Idea para mejorar el pickeo ganador</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing(2) }}>
            <HeroImage heroId={imp.outHeroId} size={44} style={{ opacity: 0.5 }} />
            <Text style={{ color: colors.textMuted, fontSize: 16 }}>→</Text>
            <HeroImage heroId={imp.inHeroId} size={44} />
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.text, fontSize: 13, fontWeight: '600' }}>
                Cambia {getHero(imp.outHeroId)?.localizedName} por {getHero(imp.inHeroId)?.localizedName}
              </Text>
              <Text style={{ color: colors.textMuted, fontSize: 12 }}>
                {imp.reason} · {Math.round(imp.winProbBefore * 100)}% → {Math.round(imp.winProbAfter * 100)}%
              </Text>
            </View>
          </View>
          <Text style={{ color: colors.textMuted, fontSize: 11, fontStyle: 'italic' }}>
            Otra visión del pickeo: no siempre hay que cambiarlo, pero muestra dónde queda margen.
          </Text>
        </View>
      )}
    </View>
  );
}
