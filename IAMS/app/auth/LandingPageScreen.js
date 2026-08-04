import React, { useEffect, useRef } from "react"
import {
    Animated,
    Pressable,
    StyleSheet,
    Text,
    View,
    useWindowDimensions,
} from "react-native"
import { Ionicons } from "@expo/vector-icons"

const TEAL = "#0F6E56"
const TEAL_DARK = "#084737"
const TEAL_LIGHT = "#E1F5EE"
const TEAL_MID = "#9FE1CB"
const AMBER = "#BA7517"
const AMBER_LIGHT = "#FAEEDA"
const AMBER_DARK = "#92400E"
const CORAL = "#D85A30"
const MAGENTA = "#D6336C"
const WHITE = "#FFFFFF"
const INK = "#17352E"

const NAV_ITEMS = [
    { label: "Platform", key: "platform" },
    { label: "Organizations", key: "organizations" },
    { label: "Universities", key: "universities" },
    { label: "How it works", key: "howItWorks" },
]

const STATS = [
    ["12,400+", "Logbook entries verified"],
    ["380", "Host organizations onboarded"],
    ["98%", "Evaluations completed on time"],
]

const FEATURES = [
    {
        color: TEAL,
        title: "Digital logbooks",
        body: "Weekly entries are written, time-stamped, and organized automatically.",
        icon: "document-text-outline",
    },
    {
        color: AMBER,
        title: "Structured evaluations",
        body: "Supervisors score against consistent criteria and sign off in one place.",
        icon: "clipboard-outline",
    },
    {
        color: CORAL,
        title: "Automated reminders",
        body: "Students and supervisors receive timely prompts before work falls overdue.",
        icon: "alarm-outline",
    },
    {
        color: MAGENTA,
        title: "Reports and audit trail",
        body: "Exportable reports and activity history back every submission.",
        icon: "analytics-outline",
    },
]

const ORGANIZATION_POINTS = [
    "Post open slots directly to the university",
    "Review applicants and respond in one place",
    "Submit structured performance evaluations",
    "View logbook activity during placement",
]

const UNIVERSITY_POINTS = [
    "Track attachment sessions and placements in real time",
    "Send automated compliance and logbook reminders",
    "Export reports for departmental review",
    "Keep a full audit trail of submissions and sign-offs",
]

const STEPS = [
    [
        "01",
        "Apply",
        "Students browse verified host organizations matched to their course and apply from their dashboard.",
    ],
    [
        "02",
        "Log",
        "Weekly logbook entries are written, time-stamped, and organized without paperwork gaps.",
    ],
    [
        "03",
        "Verify",
        "Supervisors review and sign off each week, building one verified attachment record.",
    ],
]

const AUDIENCES = [
    {
        color: TEAL,
        eyebrow: "FOR STUDENTS",
        title: "A record that speaks for itself",
        body: "Apply to vetted host organizations and submit logbooks from any device.",
    },
    {
        color: AMBER,
        eyebrow: "FOR SUPERVISORS",
        title: "Grading without the guesswork",
        body: "Track each cohort, review overdue entries, and complete evaluation scoring.",
    },
    {
        color: CORAL,
        eyebrow: "FOR HOST ORGANIZATIONS",
        title: "Onboard talent, not paperwork",
        body: "Post open slots, review applicants, and submit structured performance reviews.",
    },
]

function RevealOnScroll({ scrollY, style, children, delay = 0 }) {
    const layoutY = useRef(null)
    const [, forceRender] = React.useReducer((n) => n + 1, 0)
    const { height: viewportHeight } = useWindowDimensions()

    const handleLayout = (event) => {
        if (layoutY.current === null) {
            layoutY.current = event.nativeEvent.layout.y
            forceRender()
        }
    }

    const measured = layoutY.current !== null
    const start = measured
        ? Math.max(layoutY.current - viewportHeight * 0.85 - delay, 0)
        : 0
    const end = measured
        ? Math.max(layoutY.current - viewportHeight * 0.55 - delay, start + 1)
        : 1

    const opacity = measured
        ? scrollY.interpolate({
              inputRange: [start, end],
              outputRange: [0, 1],
              extrapolate: "clamp",
          })
        : 1
    const translateY = measured
        ? scrollY.interpolate({
              inputRange: [start, end],
              outputRange: [24, 0],
              extrapolate: "clamp",
          })
        : 0

    return (
        <Animated.View
            onLayout={handleLayout}
            style={[style, { opacity, transform: [{ translateY }] }]}
        >
            {children}
        </Animated.View>
    )
}

function IconButton({ label, icon, variant = "primary", onPress, compact }) {
    const buttonStyle =
        variant === "primary" ? styles.primaryButton : styles.secondaryButton
    const textStyle =
        variant === "primary"
            ? styles.primaryButtonText
            : styles.secondaryButtonText
    const iconColor = variant === "primary" ? WHITE : TEAL

    return (
        <Pressable
            onPress={onPress}
            style={({ pressed }) => [
                buttonStyle,
                compact && styles.buttonCompact,
                pressed && styles.buttonPressed,
            ]}
        >
            <Text style={textStyle}>{label}</Text>
            <Ionicons name={icon} size={16} color={iconColor} />
        </Pressable>
    )
}

function CheckItem({ children }) {
    return (
        <View style={styles.checkRow}>
            <Ionicons name="checkmark-circle" size={16} color={TEAL} />
            <Text style={styles.checkText}>{children}</Text>
        </View>
    )
}

export default function LandingPageScreen({ navigation }) {
    const { width } = useWindowDimensions()
    const isNarrow = width < 900
    const isCompact = width < 600
    const stackCards = width < 1050

    const scrollViewRef = useRef(null)
    const sectionOffsets = useRef({})
    const scrollY = useRef(new Animated.Value(0)).current
    const heroTextAnim = useRef(new Animated.Value(0)).current
    const heroVisualAnim = useRef(new Animated.Value(0)).current

    useEffect(() => {
        Animated.stagger(120, [
            Animated.timing(heroTextAnim, {
                toValue: 1,
                duration: 620,
                useNativeDriver: false,
            }),
            Animated.timing(heroVisualAnim, {
                toValue: 1,
                duration: 620,
                useNativeDriver: false,
            }),
        ]).start()
    }, [heroTextAnim, heroVisualAnim])

    const registerSection = (key) => (event) => {
        sectionOffsets.current[key] = event.nativeEvent.layout.y
    }

    const scrollToSection = (key) => {
        const y = sectionOffsets.current[key]
        if (y != null && scrollViewRef.current) {
            scrollViewRef.current.scrollTo({
                y: Math.max(y - 16, 0),
                animated: true,
            })
        }
    }

    const heroTextStyle = {
        opacity: heroTextAnim,
        transform: [
            {
                translateY: heroTextAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [18, 0],
                }),
            },
        ],
    }

    const heroVisualStyle = {
        opacity: heroVisualAnim,
        transform: [
            {
                translateY: heroVisualAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [24, 0],
                }),
            },
            {
                scale: heroVisualAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.97, 1],
                }),
            },
        ],
    }

    const sectionHeadingStyle = [
        styles.sectionHeading,
        isCompact && styles.sectionHeadingCompact,
    ]
    const sectionStyle = [styles.section, isCompact && styles.sectionCompact]
    const mutedSectionStyle = [
        styles.section,
        styles.sectionMuted,
        isCompact && styles.sectionCompact,
    ]

    return (
        <Animated.ScrollView
            ref={scrollViewRef}
            style={styles.page}
            contentContainerStyle={styles.pageContent}
            scrollEventThrottle={16}
            onScroll={Animated.event(
                [{ nativeEvent: { contentOffset: { y: scrollY } } }],
                { useNativeDriver: false }
            )}
        >
            <View style={[styles.header, isCompact && styles.headerCompact]}>
                <Text style={[styles.wordmark, isCompact && styles.wordmarkCompact]}>
                    IAMS
                </Text>

                {!isNarrow && (
                    <View style={styles.navLinks}>
                        {NAV_ITEMS.map((item) => (
                            <Pressable
                                key={item.key}
                                onPress={() => scrollToSection(item.key)}
                                style={({ pressed }) => [
                                    styles.navLink,
                                    pressed && styles.navLinkPressed,
                                ]}
                            >
                                <Text style={styles.navLinkText}>{item.label}</Text>
                            </Pressable>
                        ))}
                    </View>
                )}

                <View
                    style={[
                        styles.headerActions,
                        isCompact && styles.headerActionsCompact,
                    ]}
                >
                    <Pressable
                        onPress={() => navigation.navigate("Login")}
                        style={({ pressed }) => [
                            styles.loginButton,
                            pressed && styles.navLinkPressed,
                        ]}
                    >
                        <Ionicons name="log-in-outline" size={16} color={WHITE} />
                        <Text style={styles.loginButtonText}>Log In</Text>
                    </Pressable>
                    <Pressable
                        onPress={() => navigation.navigate("Register")}
                        style={({ pressed }) => [
                            styles.headerPrimary,
                            pressed && styles.buttonPressed,
                        ]}
                    >
                        <Text style={styles.headerPrimaryText}>Start</Text>
                        <Ionicons name="arrow-forward" size={15} color={WHITE} />
                    </Pressable>
                </View>
            </View>

            <View style={[styles.hero, isNarrow && styles.heroStack]}>
                <Animated.View
                    style={[
                        styles.heroCopy,
                        isCompact && styles.heroCopyCompact,
                        heroTextStyle,
                    ]}
                >
                    <View style={styles.badge}>
                        <Ionicons name="shield-checkmark-outline" size={15} color={CORAL} />
                        <Text style={styles.badgeText}>VERIFIED ATTACHMENT RECORDS</Text>
                    </View>
                    <Text
                        style={[
                            styles.heroHeading,
                            isCompact && styles.heroHeadingCompact,
                        ]}
                    >
                        The record that keeps every attachment moving.
                    </Text>
                    <Text style={styles.heroBody}>
                        IAMS helps students, supervisors, and host organizations
                        stay aligned with secure logbooks, structured approvals,
                        and timely sign-offs from day one.
                    </Text>
                    <View
                        style={[
                            styles.heroButtons,
                            isCompact && styles.heroButtonsCompact,
                        ]}
                    >
                        <IconButton
                            label="Get Started"
                            icon="arrow-forward"
                            onPress={() => navigation.navigate("Register")}
                            compact={isCompact}
                        />
                        <IconButton
                            label="Sign In"
                            icon="log-in-outline"
                            variant="secondary"
                            onPress={() => navigation.navigate("Login")}
                            compact={isCompact}
                        />
                    </View>

                    <View style={[styles.statsRow, isCompact && styles.statsStack]}>
                        {STATS.map(([value, label]) => (
                            <View key={value} style={styles.statItem}>
                                <Text style={styles.statValue}>{value}</Text>
                                <Text style={styles.statLabel}>{label}</Text>
                            </View>
                        ))}
                    </View>
                </Animated.View>

                <Animated.View
                    style={[
                        styles.heroVisual,
                        isCompact && styles.heroVisualCompact,
                        heroVisualStyle,
                    ]}
                >
                    <View style={styles.logbookCard}>
                        <View style={styles.logbookTop}>
                            <Text style={styles.logbookMeta}>LOGBOOK - WEEK 14</Text>
                            <View style={styles.verifiedPill}>
                                <Text style={styles.verifiedPillText}>VERIFIED</Text>
                            </View>
                        </View>
                        <Text style={styles.logbookTitle}>Backend API integration</Text>
                        <View style={[styles.ruleLine, { width: "92%" }]} />
                        <View style={[styles.ruleLine, { width: "78%" }]} />
                        <View style={[styles.ruleLine, { width: "60%" }]} />
                        <View style={[styles.ruleLine, { width: "44%" }]} />

                        <View style={styles.signoffRow}>
                            <View style={styles.avatar}>
                                <Text style={styles.avatarText}>JM</Text>
                            </View>
                            <View>
                                <Text style={styles.signoffName}>
                                    Signed off by J. Mwangi
                                </Text>
                                <Text style={styles.signoffDate}>Friday, 2:14 PM</Text>
                            </View>
                        </View>
                    </View>

                    <View style={styles.streakCard}>
                        <Text style={styles.streakLabel}>CURRENT STREAK</Text>
                        <Text style={styles.streakValue}>9 weeks</Text>
                        <Text style={styles.streakBody}>no missed entries</Text>
                    </View>
                </Animated.View>
            </View>

            <View style={sectionStyle} onLayout={registerSection("platform")}>
                <View style={styles.sectionInner}>
                    <RevealOnScroll scrollY={scrollY}>
                        <Text style={styles.eyebrowCoral}>PLATFORM</Text>
                        <View style={styles.dash} />
                        <Text style={sectionHeadingStyle}>
                            One system, every part of the record.
                        </Text>
                    </RevealOnScroll>

                    <View
                        style={[
                            styles.featureGrid,
                            stackCards && styles.featureStack,
                        ]}
                    >
                        {FEATURES.map((feature, index) => (
                            <RevealOnScroll
                                key={feature.title}
                                scrollY={scrollY}
                                style={styles.featureCardWrap}
                                delay={index * 40}
                            >
                                <View style={styles.featureCard}>
                                    <View
                                        style={[
                                            styles.featureIcon,
                                            { backgroundColor: feature.color },
                                        ]}
                                    >
                                        <Ionicons
                                            name={feature.icon}
                                            size={18}
                                            color={WHITE}
                                        />
                                    </View>
                                    <Text style={styles.featureTitle}>
                                        {feature.title}
                                    </Text>
                                    <Text style={styles.featureBody}>
                                        {feature.body}
                                    </Text>
                                </View>
                            </RevealOnScroll>
                        ))}
                    </View>
                </View>
            </View>

            <View
                style={mutedSectionStyle}
                onLayout={registerSection("organizations")}
            >
                <View style={styles.sectionInner}>
                    <RevealOnScroll scrollY={scrollY}>
                        <Text style={styles.eyebrowAmber}>FOR ORGANIZATIONS</Text>
                        <View style={styles.dash} />
                        <Text style={sectionHeadingStyle}>
                            Host interns without the paperwork pile-up.
                        </Text>
                    </RevealOnScroll>

                    <RevealOnScroll scrollY={scrollY} style={styles.infoPanel}>
                        <Text style={styles.infoPanelBody}>
                            Post open slots directly to the university, review
                            applicants in one place, and keep a structured record
                            of every intern you host from application to final
                            evaluation.
                        </Text>
                        <View style={styles.bulletList}>
                            {ORGANIZATION_POINTS.map((item) => (
                                <CheckItem key={item}>{item}</CheckItem>
                            ))}
                        </View>
                        <View style={styles.inlineAction}>
                            <IconButton
                                label="Partner With Us"
                                icon="arrow-forward"
                                onPress={() => navigation.navigate("Register")}
                                compact={isCompact}
                            />
                        </View>
                    </RevealOnScroll>
                </View>
            </View>

            <View style={sectionStyle} onLayout={registerSection("universities")}>
                <View style={styles.sectionInner}>
                    <RevealOnScroll scrollY={scrollY}>
                        <Text style={styles.eyebrowCoral}>FOR UNIVERSITIES</Text>
                        <View style={styles.dash} />
                        <Text style={sectionHeadingStyle}>
                            Oversight across every cohort, in one dashboard.
                        </Text>
                    </RevealOnScroll>

                    <RevealOnScroll scrollY={scrollY} style={styles.infoPanel}>
                        <Text style={styles.infoPanelBody}>
                            Give your department a single source of truth for
                            every attachment session, placement, logbook
                            compliance, and evaluation.
                        </Text>
                        <View style={styles.bulletList}>
                            {UNIVERSITY_POINTS.map((item) => (
                                <CheckItem key={item}>{item}</CheckItem>
                            ))}
                        </View>
                        <View style={styles.inlineAction}>
                            <IconButton
                                label="Get Started"
                                icon="arrow-forward"
                                onPress={() => navigation.navigate("Register")}
                                compact={isCompact}
                            />
                        </View>
                    </RevealOnScroll>
                </View>
            </View>

            <View style={mutedSectionStyle} onLayout={registerSection("howItWorks")}>
                <View style={styles.sectionInner}>
                    <RevealOnScroll scrollY={scrollY}>
                        <Text style={styles.eyebrowCoral}>HOW IT WORKS</Text>
                        <View style={styles.dash} />
                        <Text style={sectionHeadingStyle}>
                            From application to approval.
                        </Text>
                    </RevealOnScroll>

                    <RevealOnScroll
                        scrollY={scrollY}
                        style={[
                            styles.reminderStrip,
                            isCompact && styles.reminderStripCompact,
                        ]}
                    >
                        <Ionicons name="alarm-outline" size={22} color={CORAL} />
                        <View style={styles.reminderTextWrap}>
                            <Text style={styles.reminderTitle}>
                                Logbook reminders that keep everyone on track
                            </Text>
                            <Text style={styles.reminderBody}>
                                Automatic prompts reach students and supervisors
                                before entries are overdue.
                            </Text>
                        </View>
                        <View style={styles.automatedPill}>
                            <Text style={styles.automatedPillText}>AUTOMATED</Text>
                        </View>
                    </RevealOnScroll>

                    <View style={[styles.stepsRow, isNarrow && styles.stepsStack]}>
                        {STEPS.map(([number, title, description], index) => (
                            <RevealOnScroll
                                key={number}
                                scrollY={scrollY}
                                style={styles.stepCard}
                                delay={index * 60}
                            >
                                <Text style={styles.stepNumber}>{number}</Text>
                                <Text style={styles.stepTitle}>{title}</Text>
                                <Text style={styles.stepDescription}>
                                    {description}
                                </Text>
                            </RevealOnScroll>
                        ))}
                    </View>
                </View>
            </View>

            <View style={sectionStyle}>
                <View style={styles.sectionInner}>
                    <RevealOnScroll scrollY={scrollY}>
                        <Text style={styles.eyebrowAmber}>
                            BUILT FOR THREE AUDIENCES, ONE RECORD
                        </Text>
                        <View style={styles.dash} />
                        <Text style={sectionHeadingStyle}>
                            One platform. Every role.
                        </Text>
                    </RevealOnScroll>

                    <View
                        style={[
                            styles.audienceGrid,
                            stackCards && styles.audienceStack,
                        ]}
                    >
                        {AUDIENCES.map((audience, index) => (
                            <RevealOnScroll
                                key={audience.eyebrow}
                                scrollY={scrollY}
                                style={styles.audienceWrap}
                                delay={index * 60}
                            >
                                <View style={styles.audienceCard}>
                                    <View
                                        style={[
                                            styles.cardTopBorder,
                                            { backgroundColor: audience.color },
                                        ]}
                                    />
                                    <Text
                                        style={[
                                            styles.cardEyebrow,
                                            { color: audience.color },
                                        ]}
                                    >
                                        {audience.eyebrow}
                                    </Text>
                                    <Text style={styles.cardTitle}>
                                        {audience.title}
                                    </Text>
                                    <Text style={styles.cardItem}>
                                        {audience.body}
                                    </Text>
                                </View>
                            </RevealOnScroll>
                        ))}
                    </View>
                </View>
            </View>

            <View style={sectionStyle}>
                <View style={styles.sectionInner}>
                    <RevealOnScroll
                        scrollY={scrollY}
                        style={[
                            styles.invitationBanner,
                            isCompact && styles.invitationBannerCompact,
                        ]}
                    >
                        <Text style={styles.inviteEyebrow}>START THIS SEMESTER</Text>
                        <Text
                            style={[
                                styles.inviteHeading,
                                isCompact && styles.inviteHeadingCompact,
                            ]}
                        >
                            Start a verified semester.
                        </Text>
                        <View
                            style={[
                                styles.inviteButtons,
                                isCompact && styles.inviteButtonsCompact,
                            ]}
                        >
                            <IconButton
                                label="Get Started Now"
                                icon="arrow-forward"
                                onPress={() => navigation.navigate("Register")}
                                compact={isCompact}
                            />
                            <IconButton
                                label="Sign In"
                                icon="log-in-outline"
                                variant="secondary"
                                onPress={() => navigation.navigate("Login")}
                                compact={isCompact}
                            />
                        </View>
                    </RevealOnScroll>
                </View>
            </View>

            <View style={[styles.footer, isCompact && styles.footerCompact]}>
                <View style={styles.footerLeft}>
                    <View style={styles.footerBadge}>
                        <Text style={styles.footerBadgeText}>IA</Text>
                    </View>
                    <Text style={styles.footerWordmark}>IAMS</Text>
                </View>
                <Text style={styles.footerCopy}>
                    Copyright 2026 Industrial Attachment Management System - UEAB
                </Text>
            </View>
        </Animated.ScrollView>
    )
}

const styles = StyleSheet.create({
    page: {
        flex: 1,
        backgroundColor: WHITE,
    },
    pageContent: {
        paddingBottom: 28,
    },
    header: {
        width: "100%",
        backgroundColor: TEAL,
        paddingHorizontal: 28,
        paddingVertical: 16,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 16,
    },
    headerCompact: {
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    wordmark: {
        color: WHITE,
        fontSize: 28,
        fontFamily: "Alegreya_600SemiBold",
    },
    wordmarkCompact: {
        fontSize: 24,
    },
    navLinks: {
        flexDirection: "row",
        alignItems: "center",
        gap: 20,
    },
    navLink: {
        paddingVertical: 8,
    },
    navLinkPressed: {
        opacity: 0.65,
    },
    navLinkText: {
        color: WHITE,
        fontSize: 11,
        fontFamily: "Inter_700Bold",
    },
    headerActions: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
    },
    headerActionsCompact: {
        gap: 8,
    },
    loginButton: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        paddingHorizontal: 10,
        paddingVertical: 8,
    },
    loginButtonText: {
        color: WHITE,
        fontSize: 12,
        fontFamily: "Inter_600SemiBold",
    },
    headerPrimary: {
        backgroundColor: CORAL,
        borderRadius: 999,
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        paddingHorizontal: 14,
        paddingVertical: 9,
    },
    headerPrimaryText: {
        color: WHITE,
        fontSize: 12,
        fontFamily: "Inter_700Bold",
    },
    hero: {
        flexDirection: "row",
        width: "100%",
        backgroundColor: WHITE,
    },
    heroStack: {
        flexDirection: "column",
    },
    heroCopy: {
        flex: 1.05,
        paddingHorizontal: 54,
        paddingVertical: 58,
        justifyContent: "center",
        minWidth: 320,
    },
    heroCopyCompact: {
        minWidth: 0,
        paddingHorizontal: 24,
        paddingVertical: 38,
    },
    badge: {
        alignSelf: "flex-start",
        backgroundColor: AMBER_LIGHT,
        borderRadius: 999,
        flexDirection: "row",
        alignItems: "center",
        gap: 7,
        paddingHorizontal: 12,
        paddingVertical: 7,
        marginBottom: 22,
    },
    badgeText: {
        color: CORAL,
        fontSize: 10,
        fontFamily: "Inter_700Bold",
        letterSpacing: 0.2,
    },
    heroHeading: {
        color: TEAL,
        fontSize: 42,
        lineHeight: 44,
        fontFamily: "Alegreya_600SemiBold_Italic",
        marginBottom: 14,
        maxWidth: 560,
    },
    heroHeadingCompact: {
        fontSize: 32,
        lineHeight: 34,
    },
    heroBody: {
        color: AMBER_DARK,
        opacity: 0.76,
        fontSize: 13,
        lineHeight: 20,
        fontFamily: "Inter_400Regular",
        maxWidth: 560,
    },
    heroButtons: {
        marginTop: 24,
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
    },
    heroButtonsCompact: {
        flexWrap: "wrap",
    },
    primaryButton: {
        backgroundColor: CORAL,
        borderRadius: 999,
        paddingHorizontal: 18,
        paddingVertical: 11,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
    },
    secondaryButton: {
        borderWidth: 1,
        borderColor: TEAL,
        borderRadius: 999,
        paddingHorizontal: 18,
        paddingVertical: 10,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        backgroundColor: "transparent",
    },
    buttonCompact: {
        flexGrow: 1,
    },
    buttonPressed: {
        opacity: 0.82,
    },
    primaryButtonText: {
        color: WHITE,
        fontSize: 12,
        fontFamily: "Inter_700Bold",
    },
    secondaryButtonText: {
        color: TEAL,
        fontSize: 12,
        fontFamily: "Inter_700Bold",
    },
    statsRow: {
        marginTop: 32,
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: TEAL_MID,
        flexDirection: "row",
        justifyContent: "space-between",
        gap: 12,
    },
    statsStack: {
        flexDirection: "column",
    },
    statItem: {
        flex: 1,
    },
    statValue: {
        color: AMBER_DARK,
        fontSize: 22,
        fontFamily: "Alegreya_600SemiBold",
        marginBottom: 4,
    },
    statLabel: {
        color: AMBER_DARK,
        opacity: 0.62,
        fontSize: 11,
        fontFamily: "Inter_400Regular",
    },
    heroVisual: {
        flex: 0.95,
        backgroundColor: TEAL,
        padding: 48,
        alignItems: "center",
        justifyContent: "center",
        minHeight: 500,
        position: "relative",
    },
    heroVisualCompact: {
        minHeight: 360,
        paddingHorizontal: 24,
        paddingVertical: 36,
    },
    logbookCard: {
        width: "88%",
        maxWidth: 420,
        backgroundColor: WHITE,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: TEAL_MID,
        padding: 18,
        transform: [{ rotate: "-2deg" }],
        shadowColor: TEAL_DARK,
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.24,
        shadowRadius: 18,
    },
    logbookTop: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 12,
        marginBottom: 14,
    },
    logbookMeta: {
        color: AMBER_DARK,
        fontSize: 9,
        fontFamily: "Inter_700Bold",
        letterSpacing: 0.15,
    },
    verifiedPill: {
        backgroundColor: TEAL_LIGHT,
        borderRadius: 999,
        paddingHorizontal: 10,
        paddingVertical: 5,
    },
    verifiedPillText: {
        color: TEAL,
        fontSize: 9,
        fontFamily: "Inter_700Bold",
    },
    logbookTitle: {
        color: AMBER_DARK,
        fontSize: 16,
        fontFamily: "Inter_600SemiBold",
        marginBottom: 14,
    },
    ruleLine: {
        height: 2,
        backgroundColor: TEAL_MID,
        borderRadius: 2,
        marginBottom: 8,
    },
    signoffRow: {
        marginTop: 12,
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        marginBottom: 14,
    },
    avatar: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: CORAL,
        alignItems: "center",
        justifyContent: "center",
    },
    avatarText: {
        color: WHITE,
        fontSize: 11,
        fontFamily: "Inter_700Bold",
    },
    signoffName: {
        color: AMBER_DARK,
        fontSize: 12,
        fontFamily: "Inter_600SemiBold",
    },
    signoffDate: {
        color: AMBER,
        fontSize: 10,
        fontFamily: "Inter_500Medium",
    },
    streakCard: {
        position: "absolute",
        left: 24,
        bottom: 20,
        backgroundColor: AMBER,
        borderRadius: 4,
        paddingHorizontal: 14,
        paddingVertical: 12,
        minWidth: 132,
    },
    streakLabel: {
        color: AMBER_LIGHT,
        fontSize: 9,
        fontFamily: "Inter_700Bold",
        marginBottom: 6,
        letterSpacing: 0.15,
    },
    streakValue: {
        color: WHITE,
        fontSize: 20,
        fontFamily: "Alegreya_600SemiBold",
        marginBottom: 4,
    },
    streakBody: {
        color: AMBER_LIGHT,
        fontSize: 10,
        fontFamily: "Inter_400Regular",
    },
    section: {
        backgroundColor: WHITE,
        paddingHorizontal: 32,
        paddingVertical: 54,
    },
    sectionMuted: {
        backgroundColor: TEAL_LIGHT,
    },
    sectionCompact: {
        paddingHorizontal: 20,
        paddingVertical: 42,
    },
    sectionInner: {
        width: "100%",
        maxWidth: 1120,
        alignSelf: "center",
    },
    eyebrowCoral: {
        color: CORAL,
        fontSize: 10,
        fontFamily: "Inter_700Bold",
        marginBottom: 12,
        letterSpacing: 0.3,
        textAlign: "center",
    },
    eyebrowAmber: {
        color: AMBER,
        fontSize: 10,
        fontFamily: "Inter_700Bold",
        marginBottom: 12,
        letterSpacing: 0.3,
        textAlign: "center",
    },
    dash: {
        width: 28,
        height: 3,
        borderRadius: 2,
        backgroundColor: MAGENTA,
        alignSelf: "center",
        marginBottom: 10,
    },
    sectionHeading: {
        color: AMBER_DARK,
        fontSize: 36,
        lineHeight: 38,
        fontFamily: "Alegreya_600SemiBold",
        marginBottom: 24,
        textAlign: "center",
        alignSelf: "center",
        maxWidth: 760,
    },
    sectionHeadingCompact: {
        fontSize: 30,
        lineHeight: 32,
    },
    featureGrid: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 14,
    },
    featureStack: {
        flexDirection: "column",
    },
    featureCardWrap: {
        flexBasis: "47%",
        flexGrow: 1,
    },
    featureCard: {
        backgroundColor: WHITE,
        borderWidth: 1,
        borderColor: TEAL_MID,
        borderRadius: 6,
        paddingHorizontal: 16,
        paddingVertical: 18,
        height: "100%",
    },
    featureIcon: {
        width: 34,
        height: 34,
        borderRadius: 17,
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 12,
    },
    featureTitle: {
        color: AMBER_DARK,
        fontSize: 17,
        fontFamily: "Inter_600SemiBold",
        marginBottom: 8,
    },
    featureBody: {
        color: AMBER_DARK,
        opacity: 0.72,
        fontSize: 13,
        lineHeight: 19,
        fontFamily: "Inter_400Regular",
    },
    infoPanel: {
        maxWidth: 700,
        alignSelf: "center",
        alignItems: "center",
    },
    infoPanelBody: {
        color: AMBER_DARK,
        opacity: 0.76,
        fontSize: 14,
        lineHeight: 21,
        fontFamily: "Inter_400Regular",
        marginBottom: 18,
        textAlign: "center",
    },
    bulletList: {
        alignSelf: "stretch",
        gap: 8,
    },
    checkRow: {
        flexDirection: "row",
        alignItems: "flex-start",
        gap: 8,
    },
    checkText: {
        flex: 1,
        color: AMBER_DARK,
        fontSize: 13,
        lineHeight: 19,
        fontFamily: "Inter_500Medium",
    },
    inlineAction: {
        marginTop: 22,
    },
    reminderStrip: {
        backgroundColor: WHITE,
        borderWidth: 1,
        borderColor: TEAL_MID,
        borderRadius: 6,
        padding: 14,
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
    },
    reminderStripCompact: {
        alignItems: "flex-start",
        flexWrap: "wrap",
    },
    reminderTextWrap: {
        flex: 1,
        minWidth: 180,
    },
    reminderTitle: {
        color: AMBER_DARK,
        fontSize: 13,
        fontFamily: "Inter_700Bold",
        marginBottom: 2,
    },
    reminderBody: {
        color: AMBER_DARK,
        opacity: 0.72,
        fontSize: 12,
        lineHeight: 17,
        fontFamily: "Inter_400Regular",
    },
    automatedPill: {
        backgroundColor: TEAL,
        borderRadius: 999,
        paddingHorizontal: 10,
        paddingVertical: 6,
    },
    automatedPillText: {
        color: WHITE,
        fontSize: 9,
        fontFamily: "Inter_700Bold",
    },
    stepsRow: {
        marginTop: 26,
        flexDirection: "row",
        gap: 14,
    },
    stepsStack: {
        flexDirection: "column",
    },
    stepCard: {
        flex: 1,
        borderTopWidth: 2,
        borderTopColor: TEAL_MID,
        paddingTop: 14,
    },
    stepNumber: {
        color: CORAL,
        fontSize: 34,
        fontFamily: "Alegreya_600SemiBold",
        marginBottom: 8,
    },
    stepTitle: {
        color: AMBER_DARK,
        fontSize: 18,
        fontFamily: "Inter_600SemiBold",
        marginBottom: 7,
    },
    stepDescription: {
        color: AMBER_DARK,
        opacity: 0.72,
        fontSize: 13,
        lineHeight: 19,
        fontFamily: "Inter_400Regular",
    },
    audienceGrid: {
        flexDirection: "row",
        gap: 14,
    },
    audienceStack: {
        flexDirection: "column",
    },
    audienceWrap: {
        flex: 1,
    },
    audienceCard: {
        flex: 1,
        backgroundColor: WHITE,
        borderWidth: 1,
        borderColor: TEAL_MID,
        borderRadius: 6,
        paddingHorizontal: 14,
        paddingVertical: 16,
    },
    cardTopBorder: {
        height: 4,
        borderRadius: 2,
        marginBottom: 12,
    },
    cardEyebrow: {
        fontSize: 10,
        fontFamily: "Inter_700Bold",
        marginBottom: 8,
        letterSpacing: 0.2,
    },
    cardTitle: {
        color: AMBER_DARK,
        fontSize: 24,
        lineHeight: 28,
        fontFamily: "Alegreya_600SemiBold",
        marginBottom: 12,
    },
    cardItem: {
        color: AMBER_DARK,
        opacity: 0.72,
        fontSize: 13,
        lineHeight: 19,
        fontFamily: "Inter_400Regular",
    },
    invitationBanner: {
        backgroundColor: TEAL,
        borderRadius: 8,
        paddingHorizontal: 24,
        paddingVertical: 34,
        alignItems: "center",
        shadowColor: TEAL_DARK,
        shadowOffset: { width: 0, height: 14 },
        shadowOpacity: 0.28,
        shadowRadius: 14,
    },
    invitationBannerCompact: {
        paddingHorizontal: 18,
        paddingVertical: 28,
    },
    inviteEyebrow: {
        color: AMBER_LIGHT,
        fontSize: 10,
        fontFamily: "Inter_700Bold",
        letterSpacing: 0.25,
        marginBottom: 12,
        textAlign: "center",
    },
    inviteHeading: {
        color: WHITE,
        fontSize: 42,
        lineHeight: 44,
        fontFamily: "Alegreya_600SemiBold_Italic",
        marginBottom: 20,
        textAlign: "center",
    },
    inviteHeadingCompact: {
        fontSize: 34,
        lineHeight: 36,
    },
    inviteButtons: {
        flexDirection: "row",
        gap: 12,
        justifyContent: "center",
    },
    inviteButtonsCompact: {
        flexWrap: "wrap",
        alignSelf: "stretch",
    },
    footer: {
        backgroundColor: WHITE,
        borderTopWidth: 1,
        borderTopColor: TEAL_MID,
        paddingHorizontal: 32,
        paddingVertical: 18,
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 12,
        flexWrap: "wrap",
    },
    footerCompact: {
        paddingHorizontal: 20,
        alignItems: "flex-start",
    },
    footerLeft: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
    },
    footerBadge: {
        width: 30,
        height: 30,
        backgroundColor: TEAL,
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 4,
    },
    footerBadgeText: {
        color: WHITE,
        fontSize: 11,
        fontFamily: "Inter_700Bold",
    },
    footerWordmark: {
        color: TEAL,
        fontSize: 22,
        fontFamily: "Alegreya_600SemiBold",
    },
    footerCopy: {
        color: AMBER_DARK,
        opacity: 0.62,
        fontSize: 11,
        lineHeight: 16,
        fontFamily: "Inter_400Regular",
    },
})
