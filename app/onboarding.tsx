import { router, useLocalSearchParams } from "expo-router";
import { useState, type ReactNode } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import Animated, { FadeInRight, ReduceMotion } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CarRender, DriverRender } from "../src/components/art/Render";
import { TOP_BAR_HEIGHT, Wordmark } from "../src/components/Masthead";
import { Appear, FillBar, PressableScale } from "../src/components/motion";
import { resolveTeam } from "../src/components/StandingRows";
import { Checker, ErrorState, IconButton, PillButton, Radio, Segmented, Skeleton, Toggle } from "../src/components/ui";
import { useConstructorStandings, useCurrentTeams, useDriverStandings } from "../src/hooks/queries";
import { useLayout } from "../src/hooks/useLayout";
import { usePreferences, type ClockFormat, type ReminderLead } from "../src/hooks/usePreferences";
import { teamColor, teamMeta } from "../src/lib/assets";
import { formatTime } from "../src/lib/format";
import { REMINDERS_SUPPORTED } from "../src/lib/platform";
import { requestReminderPermission } from "../src/lib/reminders";
import { colors, fonts, frameStyle, layout, motion, space, tones, type } from "../src/theme";

type Step = "welcome" | "driver" | "team" | "prefs";

const t = tones.dark;

/**
 * First-run setup, also reopened from the menu as "Preferences". Every choice saves as it's
 * made, so skipping or leaving midway never loses anything.
 */
export default function OnboardingScreen() {
  const { mode } = useLocalSearchParams<{ mode?: string }>();
  const editing = mode === "edit";
  const steps: Step[] = editing ? ["driver", "team", "prefs"] : ["welcome", "driver", "team", "prefs"];
  const [index, setIndex] = useState(0);
  const step = steps[index];
  const insets = useSafeAreaInsets();
  const { prefs, update } = usePreferences();

  const finish = () => {
    update({ onboarded: true });
    if (editing && router.canGoBack()) router.back();
    else router.replace("/");
  };

  const last = index === steps.length - 1;

  return (
    <View style={styles.screen}>
      <View style={[styles.bar, { paddingTop: insets.top, height: insets.top + TOP_BAR_HEIGHT }]}>
        <View style={styles.barInner}>
          <Wordmark />
          {editing ? (
            <IconButton icon="close" label="Close preferences" onPress={finish} size={44} />
          ) : (
            <PillButton label="Skip" icon="play-skip-forward" onPress={finish} />
          )}
        </View>
      </View>

      <View style={[styles.progress, frameStyle]}>
        <Text style={[type.label, { color: t.muted }]}>{editing ? "Preferences" : "Setup"}</Text>
        <Text style={styles.counter}>
          {String(index + 1).padStart(2, "0")}/{String(steps.length).padStart(2, "0")}
        </Text>
      </View>
      <View style={[styles.progressBar, frameStyle]}>
        <FillBar ratio={(index + 1) / steps.length} color={colors.accent} height={2} trackColor={t.line} />
      </View>

      <ScrollView
        key={step}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, frameStyle]}
      >
        <Animated.View entering={FadeInRight.duration(motion.base).reduceMotion(ReduceMotion.System)}>
          {step === "welcome" ? <Welcome /> : null}
          {step === "driver" ? (
            <DriverStep selected={prefs.favoriteDriverId} onSelect={(id) => update({ favoriteDriverId: id })} />
          ) : null}
          {step === "team" ? <TeamStep selected={prefs.favoriteTeamId} onSelect={(id) => update({ favoriteTeamId: id })} /> : null}
          {step === "prefs" ? <PrefsStep /> : null}
        </Animated.View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + space.lg }]}>
        <View style={styles.footerInner}>
          {index > 0 ? (
            <PillButton label="Back" icon="chevron-back" iconPosition="start" onPress={() => setIndex(index - 1)} />
          ) : (
            <View />
          )}
          <PillButton
            label={last ? (editing ? "Save" : "Start") : index === 0 && !editing ? "Get started" : "Continue"}
            icon={last ? "checkmark" : "arrow-forward"}
            variant="solid"
            onPress={() => (last ? finish() : setIndex(index + 1))}
          />
        </View>
      </View>
    </View>
  );
}

function StepHeader({ title, caption }: { title: string; caption: string }) {
  const { fit } = useLayout();
  return (
    <View style={styles.stepHeader}>
      <Text style={[type.heading, styles.upper, { fontSize: fit(40), lineHeight: fit(44), color: t.text }]}>{title}/</Text>
      <Text style={[type.body, { color: t.muted }]}>{caption}</Text>
    </View>
  );
}

function Welcome() {
  const { inner } = useLayout();
  const size = Math.min(120, inner / (6 * 0.45));
  return (
    <View>
      <Text style={[styles.poster, { fontSize: size, lineHeight: size * 0.92 }]}>LIGHTS</Text>
      <View style={styles.posterRow}>
        <Checker cell={(size * 0.7) / 3} style={{ marginLeft: -space.gutter, marginRight: size * 0.08 }} />
        <Text style={[styles.poster, { fontSize: size, lineHeight: size * 0.92 }]}>OUT.</Text>
      </View>
      <Text style={[type.body, styles.welcomeCopy]}>
        Set up P1 Dash in under a minute: follow a driver and a team, choose how session times read, and get a nudge
        before the lights go out.
      </Text>
      <View style={styles.welcomeList}>
        {[
          ["01", "Follow a driver", "Their numbers lead Home and their results are highlighted."],
          ["02", "Pick a team", "Track the constructors' fight from your side of the garage."],
          ["03", "Reminders & time", "Session alerts and a 12 or 24-hour clock."],
        ].map(([n, title, body], i) => (
          <Appear key={n} index={i + 1} style={styles.welcomeItem}>
            <Text style={styles.welcomeNum}>{n}</Text>
            <View style={styles.flex}>
              <Text style={[type.value, styles.upper, { color: t.text, fontSize: 18 }]}>{title}</Text>
              <Text style={[type.label, { color: t.muted }]}>{body}</Text>
            </View>
          </Appear>
        ))}
      </View>
    </View>
  );
}

/** Tappable choice row: whole row selects, the radio confirms the state. Tapping again clears. */
function ChoiceRow({
  selected,
  onPress,
  label,
  children,
}: {
  selected: boolean;
  onPress: () => void;
  label: string;
  children: ReactNode;
}) {
  return (
    <PressableScale
      onPress={onPress}
      scaleTo={0.98}
      accessibilityRole="radio"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      style={[styles.choice, selected && styles.choiceSelected]}
    >
      {children}
      <Radio selected={selected} />
    </PressableScale>
  );
}

function DriverStep({ selected, onSelect }: { selected: string | null; onSelect: (id: string | null) => void }) {
  const drivers = useDriverStandings();
  const teams = useCurrentTeams();
  return (
    <View>
      <StepHeader title="Your driver" caption="Follow one driver. You can change this any time from the menu." />
      {drivers.isPending ? (
        <Skeletons />
      ) : drivers.isError ? (
        <ErrorState onRetry={() => drivers.refetch()} />
      ) : (
        drivers.data.standings.map((s) => {
          const team = resolveTeam(s, teams.data);
          const active = selected === s.Driver.driverId;
          return (
            <ChoiceRow
              key={s.Driver.driverId}
              selected={active}
              label={`${s.Driver.givenName} ${s.Driver.familyName}`}
              onPress={() => onSelect(active ? null : s.Driver.driverId)}
            >
              <View style={styles.avatar}>
                <DriverRender driverId={s.Driver.driverId} constructorId={team} style={styles.helmet} />
              </View>
              <View style={styles.flex}>
                <Text style={[type.label, { color: t.muted }]}>{s.Driver.givenName}</Text>
                <Text style={[type.value, styles.upper, { color: t.text }]} numberOfLines={1}>
                  {s.Driver.familyName}
                </Text>
                <View style={styles.teamRow}>
                  <View style={[styles.swatch, { backgroundColor: teamColor(team) }]} />
                  <Text style={[type.label, { color: t.muted }]}>{teamMeta(team).shortName}</Text>
                </View>
              </View>
            </ChoiceRow>
          );
        })
      )}
    </View>
  );
}

function TeamStep({ selected, onSelect }: { selected: string | null; onSelect: (id: string | null) => void }) {
  const teams = useConstructorStandings();
  return (
    <View>
      <StepHeader title="Your team" caption="Your team gets its own spot on Home and stands out in the standings." />
      {teams.isPending ? (
        <Skeletons />
      ) : teams.isError ? (
        <ErrorState onRetry={() => teams.refetch()} />
      ) : (
        teams.data.standings.map((s) => {
          const id = s.Constructor.constructorId;
          const active = selected === id;
          return (
            <ChoiceRow key={id} selected={active} label={s.Constructor.name} onPress={() => onSelect(active ? null : id)}>
              <View style={styles.flex}>
                <View style={styles.teamRow}>
                  <View style={[styles.swatch, { backgroundColor: teamColor(id) }]} />
                  <Text style={[type.value, styles.upper, { color: t.text }]} numberOfLines={1}>
                    {teamMeta(id).shortName || s.Constructor.name}
                  </Text>
                </View>
                <CarRender constructorId={id} style={styles.car} />
              </View>
            </ChoiceRow>
          );
        })
      )}
    </View>
  );
}

const CLOCKS = [
  { value: "system", label: "Auto" },
  { value: "12h", label: "12-hour" },
  { value: "24h", label: "24-hour" },
] as const;

const LEADS = [
  { value: "15", label: "15 min" },
  { value: "30", label: "30 min" },
  { value: "60", label: "1 hour" },
] as const;

/** 2pm today, used to preview the chosen clock format. */
const SAMPLE = (() => {
  const d = new Date();
  d.setHours(14, 0, 0, 0);
  return d;
})();

function PrefsStep() {
  const { prefs, update } = usePreferences();
  const [denied, setDenied] = useState(false);

  const setReminders = async (on: boolean) => {
    if (!on) return update({ reminders: false });
    const granted = await requestReminderPermission().catch(() => false);
    setDenied(!granted);
    if (granted) update({ reminders: true });
  };

  return (
    <View>
      <StepHeader title="Preferences" caption="How the app reads and when it taps you on the shoulder." />

      <Setting label="Time format" detail={`Sessions show as ${formatTime(SAMPLE, prefs.clock)}`}>
        <Segmented options={CLOCKS} value={prefs.clock} onChange={(clock: ClockFormat) => update({ clock })} />
      </Setting>

      <Setting
        label="Session reminders"
        detail={
          !REMINDERS_SUPPORTED
            ? "Available in the iOS and Android apps."
            : denied
              ? "Notifications are off for P1 Dash. Enable them in system settings."
              : "A notification before every practice, qualifying, sprint and race."
        }
        trailing={
          <Toggle
            label="Session reminders"
            value={prefs.reminders}
            onChange={setReminders}
            disabled={!REMINDERS_SUPPORTED}
          />
        }
      >
        {prefs.reminders ? (
          <Segmented
            options={LEADS}
            value={String(prefs.reminderLead) as `${ReminderLead}`}
            onChange={(v) => update({ reminderLead: Number(v) as ReminderLead })}
          />
        ) : null}
      </Setting>

      {REMINDERS_SUPPORTED ? (
        <Setting
          label="Haptics"
          detail="A light tap when you switch tabs, follow a driver or press a button."
          trailing={<Toggle label="Haptics" value={prefs.haptics} onChange={(haptics) => update({ haptics })} />}
        />
      ) : null}
    </View>
  );
}

function Setting({
  label,
  detail,
  trailing,
  children,
}: {
  label: string;
  detail: string;
  trailing?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <View style={styles.setting}>
      <View style={styles.settingHead}>
        <View style={styles.flex}>
          <Text style={[type.value, styles.upper, { color: t.text, fontSize: 18 }]}>{label}</Text>
          <Text style={[type.label, { color: t.muted }]}>{detail}</Text>
        </View>
        {trailing}
      </View>
      {children}
    </View>
  );
}

const Skeletons = () => (
  <View style={styles.skeletons}>
    {Array.from({ length: 6 }, (_, i) => (
      <Skeleton key={i} height={72} />
    ))}
  </View>
);

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: t.bg },
  upper: { textTransform: "uppercase" },
  flex: { flex: 1, gap: 2 },
  bar: { alignItems: "center", justifyContent: "center", paddingHorizontal: space.gutter },
  barInner: {
    width: "100%",
    maxWidth: layout.maxWidth - space.gutter * 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  progress: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", paddingHorizontal: space.gutter },
  counter: { fontFamily: fonts.mono, fontSize: 18, color: t.text },
  progressBar: { paddingHorizontal: space.gutter, marginTop: space.sm },
  content: { paddingHorizontal: space.gutter, paddingTop: space.xl, paddingBottom: space.xxl },
  stepHeader: { gap: space.sm, marginBottom: space.xl },
  poster: { fontFamily: fonts.display, color: t.text, letterSpacing: -1 },
  posterRow: { flexDirection: "row", alignItems: "center" },
  welcomeCopy: { color: t.muted, marginTop: space.xxl, fontSize: 16, lineHeight: 23 },
  welcomeList: { marginTop: space.xxl, gap: space.xl },
  welcomeItem: { flexDirection: "row", gap: space.lg },
  welcomeNum: { fontFamily: fonts.mono, fontSize: 18, color: colors.accent, width: 28 },
  choice: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    paddingVertical: space.md,
    paddingHorizontal: space.md,
    marginBottom: space.sm,
    borderWidth: 1,
    borderColor: t.line,
  },
  choiceSelected: { borderColor: colors.accent, backgroundColor: t.band },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: t.band, alignItems: "center", justifyContent: "center" },
  helmet: { height: 42 },
  teamRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  swatch: { width: 8, height: 8 },
  car: { width: "72%", marginTop: space.sm },
  setting: { gap: space.md, paddingVertical: space.lg, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: t.line },
  settingHead: { flexDirection: "row", alignItems: "center", gap: space.lg },
  skeletons: { gap: space.sm },
  footer: {
    paddingHorizontal: space.gutter,
    paddingTop: space.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: t.line,
    backgroundColor: t.bg,
  },
  footerInner: {
    width: "100%",
    maxWidth: layout.maxWidth - space.gutter * 2,
    alignSelf: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
});
